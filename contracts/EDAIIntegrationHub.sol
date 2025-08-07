// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "./CivicTrustRegistry.sol";
import "./EDAIOracle.sol";
import "./EDAIZKVerifier.sol";
import "./EDAIFallbackEngine.sol";
import "./EDAISecuritiesTrading.sol";
import "./EDAIIssuance.sol";

/// @title EDAI Integration Hub
/// @notice Central integration point for all EDAI system components
/// @dev Coordinates interactions between registry, oracle, verifier, fallback, trading, and issuance
contract EDAIIntegrationHub is ReentrancyGuard, AccessControl, Pausable {
    bytes32 public constant INTEGRATOR_ROLE = keccak256("INTEGRATOR_ROLE");
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");
    bytes32 public constant EMERGENCY_ROLE = keccak256("EMERGENCY_ROLE");

    // Contract references
    CivicTrustRegistry public registry;
    EDAIOracle public oracle;
    EDAIZKVerifier public zkVerifier;
    EDAIFallbackEngine public fallbackEngine;
    EDAISecuritiesTrading public trading;
    EDAIIssuance public issuance;

    struct IntegrationConfig {
        bool oracleEnabled;
        bool zkVerificationEnabled;
        bool fallbackEnabled;
        bool tradingEnabled;
        bool issuanceEnabled;
        uint256 maxBatchSize;
        uint256 integrationTimeout;
    }

    struct SystemStatus {
        bool registryActive;
        bool oracleActive;
        bool zkVerifierActive;
        bool fallbackActive;
        bool tradingActive;
        bool issuanceActive;
        uint256 lastHealthCheck;
    }

    // Storage
    IntegrationConfig public config;
    SystemStatus public systemStatus;
    mapping(string => bool) public integratedEDAIs;
    mapping(address => string[]) public userEDAIs;
    mapping(bytes32 => bool) public processedEvents;

    // Events
    event IntegrationHubInitialized(
        address registry,
        address oracle,
        address zkVerifier,
        address fallbackEngine,
        address trading,
        address issuance,
        uint256 timestamp
    );

    event EDAIIntegrated(
        string indexed edaiId,
        address indexed issuer,
        bool oracleEnabled,
        bool zkEnabled,
        bool fallbackEnabled,
        uint256 timestamp
    );

    event SystemHealthCheck(
        bool registryHealthy,
        bool oracleHealthy,
        bool zkVerifierHealthy,
        bool fallbackHealthy,
        bool tradingHealthy,
        bool issuanceHealthy,
        uint256 timestamp
    );

    event IntegrationEventProcessed(
        string indexed edaiId,
        bytes32 indexed eventHash,
        string eventType,
        bool success,
        uint256 timestamp
    );

    event EmergencyIntegrationTriggered(
        string indexed edaiId,
        string reason,
        address indexed executor,
        uint256 timestamp
    );

    // Constants
    uint256 public constant MAX_BATCH_SIZE = 100;
    uint256 public constant INTEGRATION_TIMEOUT = 1 hours;
    uint256 public constant HEALTH_CHECK_INTERVAL = 1 hours;

    constructor(
        address _registry,
        address _oracle,
        address _zkVerifier,
        address _fallbackEngine,
        address _trading,
        address _issuance
    ) {
        require(_registry != address(0), "Invalid registry address");
        require(_oracle != address(0), "Invalid oracle address");
        require(_zkVerifier != address(0), "Invalid zkVerifier address");
        require(_fallbackEngine != address(0), "Invalid fallbackEngine address");
        require(_trading != address(0), "Invalid trading address");
        require(_issuance != address(0), "Invalid issuance address");

        registry = CivicTrustRegistry(_registry);
        oracle = EDAIOracle(_oracle);
        zkVerifier = EDAIZKVerifier(_zkVerifier);
        fallbackEngine = EDAIFallbackEngine(_fallbackEngine);
        trading = EDAISecuritiesTrading(_trading);
        issuance = EDAIIssuance(_issuance);

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(INTEGRATOR_ROLE, msg.sender);
        _grantRole(OPERATOR_ROLE, msg.sender);
        _grantRole(EMERGENCY_ROLE, msg.sender);

        // Initialize config
        config.oracleEnabled = true;
        config.zkVerificationEnabled = true;
        config.fallbackEnabled = true;
        config.tradingEnabled = true;
        config.issuanceEnabled = true;
        config.maxBatchSize = 50;
        config.integrationTimeout = 30 minutes;

        emit IntegrationHubInitialized(
            _registry,
            _oracle,
            _zkVerifier,
            _fallbackEngine,
            _trading,
            _issuance,
            block.timestamp
        );
    }

    /// @notice Integrate an EDAI into the system
    /// @param edaiId EDAI identifier
    /// @param issuer Issuer address
    /// @param zkProofCommitment ZK proof commitment
    /// @param oracleData Oracle data
    /// @param fallbackConfig Fallback configuration
    function integrateEDAI(
        string memory edaiId,
        address issuer,
        bytes32 zkProofCommitment,
        bytes memory oracleData,
        bytes memory fallbackConfig
    ) external onlyRole(INTEGRATOR_ROLE) whenNotPaused {
        require(bytes(edaiId).length > 0, "Invalid EDAI ID");
        require(issuer != address(0), "Invalid issuer address");
        require(!integratedEDAIs[edaiId], "EDAI already integrated");

        // Register with registry
        if (config.zkVerificationEnabled) {
            require(zkVerifier.isCommitmentVerified(zkProofCommitment), "ZK commitment not verified");
        }

        // Register with registry
        registry.registerCEDAI(
            edaiId,
            zkProofCommitment,
            false, // breachFlag
            CivicTrustRegistry.BreachSeverity.NONE,
            CivicTrustRegistry.EnforcementAction.NONE,
            "Integrated via hub"
        );

        // Update oracle if enabled
        if (config.oracleEnabled && oracleData.length > 0) {
            _updateOracleData(edaiId, oracleData);
        }

        // Configure fallback if enabled
        if (config.fallbackEnabled && fallbackConfig.length > 0) {
            _configureFallback(edaiId, fallbackConfig);
        }

        integratedEDAIs[edaiId] = true;
        userEDAIs[issuer].push(edaiId);

        emit EDAIIntegrated(edaiId, issuer, config.oracleEnabled, config.zkVerificationEnabled, config.fallbackEnabled, block.timestamp);
    }

    /// @notice Process integration event
    /// @param edaiId EDAI identifier
    /// @param eventType Event type
    /// @param eventData Event data
    function processIntegrationEvent(
        string memory edaiId,
        string memory eventType,
        bytes memory eventData
    ) external onlyRole(INTEGRATOR_ROLE) whenNotPaused {
        require(bytes(edaiId).length > 0, "Invalid EDAI ID");
        require(bytes(eventType).length > 0, "Invalid event type");
        require(integratedEDAIs[edaiId], "EDAI not integrated");

        bytes32 eventHash = keccak256(abi.encodePacked(edaiId, eventType, eventData));
        require(!processedEvents[eventHash], "Event already processed");

        bool success = false;
        string memory result = "";

        try this._processEvent(edaiId, eventType, eventData) {
            success = true;
            result = "Success";
        } catch Error(string memory reason) {
            success = false;
            result = reason;
        } catch {
            success = false;
            result = "Unknown error";
        }

        processedEvents[eventHash] = true;

        emit IntegrationEventProcessed(edaiId, eventHash, eventType, success, block.timestamp);
    }

    /// @notice Perform system health check
    function performHealthCheck() external onlyRole(OPERATOR_ROLE) {
        bool registryHealthy = _checkRegistryHealth();
        bool oracleHealthy = _checkOracleHealth();
        bool zkVerifierHealthy = _checkZKVerifierHealth();
        bool fallbackHealthy = _checkFallbackHealth();
        bool tradingHealthy = _checkTradingHealth();
        bool issuanceHealthy = _checkIssuanceHealth();

        systemStatus.registryActive = registryHealthy;
        systemStatus.oracleActive = oracleHealthy;
        systemStatus.zkVerifierActive = zkVerifierHealthy;
        systemStatus.fallbackActive = fallbackHealthy;
        systemStatus.tradingActive = tradingHealthy;
        systemStatus.issuanceActive = issuanceHealthy;
        systemStatus.lastHealthCheck = block.timestamp;

        emit SystemHealthCheck(
            registryHealthy,
            oracleHealthy,
            zkVerifierHealthy,
            fallbackHealthy,
            tradingHealthy,
            issuanceHealthy,
            block.timestamp
        );
    }

    /// @notice Emergency integration trigger
    /// @param edaiId EDAI identifier
    /// @param reason Emergency reason
    function emergencyIntegrationTrigger(
        string memory edaiId,
        string memory reason
    ) external onlyRole(EMERGENCY_ROLE) whenNotPaused {
        require(bytes(edaiId).length > 0, "Invalid EDAI ID");
        require(bytes(reason).length > 0, "Invalid reason");

        // Trigger emergency fallback
        if (config.fallbackEnabled) {
            fallbackEngine.executeEmergencyFallback(
                edaiId,
                EDAIFallbackEngine.FallbackType.EMERGENCY_FALLBACK,
                0,
                address(0)
            );
        }

        emit EmergencyIntegrationTriggered(edaiId, reason, msg.sender, block.timestamp);
    }

    /// @notice Update integration configuration
    /// @param _config New configuration
    function updateIntegrationConfig(IntegrationConfig memory _config) external onlyRole(OPERATOR_ROLE) {
        require(_config.maxBatchSize <= MAX_BATCH_SIZE, "Batch size too large");
        require(_config.integrationTimeout <= INTEGRATION_TIMEOUT, "Timeout too high");

        config = _config;
    }

    /// @notice Get integrated EDAIs for a user
    /// @param user User address
    /// @return Array of EDAI IDs
    function getUserEDAIs(address user) external view returns (string[] memory) {
        return userEDAIs[user];
    }

    /// @notice Check if EDAI is integrated
    /// @param edaiId EDAI identifier
    /// @return Whether the EDAI is integrated
    function isEDAIIntegrated(string memory edaiId) external view returns (bool) {
        return integratedEDAIs[edaiId];
    }

    /// @notice Get system status
    /// @return Current system status
    function getSystemStatus() external view returns (SystemStatus memory) {
        return systemStatus;
    }

    /// @notice Internal function to update oracle data
    /// @param edaiId EDAI identifier
    /// @param oracleData Oracle data
    function _updateOracleData(string memory edaiId, bytes memory oracleData) internal {
        // Decode and update oracle data
        // This is a placeholder for actual oracle data processing
    }

    /// @notice Internal function to configure fallback
    /// @param edaiId EDAI identifier
    /// @param fallbackConfig Fallback configuration
    function _configureFallback(string memory edaiId, bytes memory fallbackConfig) internal {
        // Decode and configure fallback
        // This is a placeholder for actual fallback configuration
    }

    /// @notice Internal function to process events
    /// @param edaiId EDAI identifier
    /// @param eventType Event type
    /// @param eventData Event data
    function _processEvent(
        string memory edaiId,
        string memory eventType,
        bytes memory eventData
    ) external pure {
        // This is a placeholder for actual event processing
        require(bytes(edaiId).length > 0, "Invalid EDAI ID");
        require(bytes(eventType).length > 0, "Invalid event type");
    }

    /// @notice Check registry health
    /// @return Whether registry is healthy
    function _checkRegistryHealth() internal view returns (bool) {
        try registry.paused() {
            return true;
        } catch {
            return false;
        }
    }

    /// @notice Check oracle health
    /// @return Whether oracle is healthy
    function _checkOracleHealth() internal view returns (bool) {
        try oracle.paused() {
            return true;
        } catch {
            return false;
        }
    }

    /// @notice Check ZK verifier health
    /// @return Whether ZK verifier is healthy
    function _checkZKVerifierHealth() internal view returns (bool) {
        try zkVerifier.paused() {
            return true;
        } catch {
            return false;
        }
    }

    /// @notice Check fallback health
    /// @return Whether fallback is healthy
    function _checkFallbackHealth() internal view returns (bool) {
        try fallbackEngine.paused() {
            return true;
        } catch {
            return false;
        }
    }

    /// @notice Check trading health
    /// @return Whether trading is healthy
    function _checkTradingHealth() internal view returns (bool) {
        try trading.paused() {
            return true;
        } catch {
            return false;
        }
    }

    /// @notice Check issuance health
    /// @return Whether issuance is healthy
    function _checkIssuanceHealth() internal view returns (bool) {
        try issuance.paused() {
            return true;
        } catch {
            return false;
        }
    }
} 