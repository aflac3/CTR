// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/// @title Civic Trust Registry for CEDAIs
/// @notice Anchors breach attestation records and zkProof commitments for verifiable dispatch enforcement
/// @dev Integrates with GVMS dashboard for metrics computation and breach diagnosis
contract CivicTrustRegistry is ReentrancyGuard, AccessControl, Pausable {
    
    bytes32 public constant DASHBOARD_OPERATOR_ROLE = keccak256("DASHBOARD_OPERATOR_ROLE");
    bytes32 public constant EMERGENCY_OPERATOR_ROLE = keccak256("EMERGENCY_OPERATOR_ROLE");
    bytes32 public constant BATCH_OPERATOR_ROLE = keccak256("BATCH_OPERATOR_ROLE");
    
    enum BreachSeverity {
        NONE,           // 0 - No breach detected
        MINOR,          // 1 - Minor violation, warning issued
        MODERATE,       // 2 - Moderate breach, partial fallback
        SEVERE,         // 3 - Severe breach, full fallback
        CRITICAL        // 4 - Critical breach, immediate termination
    }
    
    enum EnforcementAction {
        NONE,           // 0 - No action required
        WARNING,        // 1 - Issue warning notification
        SUSPENSION,     // 2 - Temporary suspension
        PARTIAL_FALLBACK, // 3 - Partial fallback execution
        FULL_FALLBACK,  // 4 - Complete fallback execution
        TERMINATION     // 5 - Immediate contract termination
    }

    struct CEDAIEntry {
        string cedaiId;
        address issuer;
        bytes32 zkProofCommitment;
        bool breachFlag;
        BreachSeverity breachSeverity;
        EnforcementAction enforcementAction;
        uint256 breachTimestamp;
        uint256 lastUpdated;
        string breachDescription;
        bytes32 entryHash;
        bool isActive;
    }

    struct BreachMetrics {
        uint256 totalBreaches;
        uint256 minorBreaches;
        uint256 moderateBreaches;
        uint256 severeBreaches;
        uint256 criticalBreaches;
        uint256 totalEnforcementActions;
        uint256 lastMetricsUpdate;
    }

    struct BatchOperation {
        string[] cedaiIds;
        bytes32[] zkProofCommitments;
        bool[] breachFlags;
        BreachSeverity[] breachSeverities;
        EnforcementAction[] enforcementActions;
        string[] breachDescriptions;
    }

    mapping(string => CEDAIEntry) public registry;
    mapping(address => string[]) public issuerCEDAIs;
    mapping(BreachSeverity => uint256) public severityCounts;
    
    BreachMetrics public globalMetrics;
    address public currentDashboardOperator;
    
    // Gas optimization: Pack related variables
    uint256 public constant MAX_BATCH_SIZE = 50;
    uint256 public constant MAX_STRING_LENGTH = 1000;
    
    event CEDAIRegistered(
        string indexed cedaiId,
        address indexed issuer,
        bytes32 zkProofCommitment,
        bool breachFlag,
        BreachSeverity breachSeverity,
        EnforcementAction enforcementAction,
        uint256 breachTimestamp,
        bytes32 entryHash
    );
    
    event BreachUpdated(
        string indexed cedaiId,
        BreachSeverity oldSeverity,
        BreachSeverity newSeverity,
        EnforcementAction enforcementAction,
        uint256 timestamp
    );
    
    event EnforcementActionExecuted(
        string indexed cedaiId,
        EnforcementAction action,
        address executor,
        uint256 timestamp
    );
    
    event BatchOperationExecuted(
        address indexed operator,
        uint256 batchSize,
        uint256 timestamp
    );
    
    event EmergencyPaused(address indexed operator, bool paused);
    event DashboardOperatorUpdated(address indexed oldOperator, address indexed newOperator);

    modifier onlyDashboardOperator() {
        require(hasRole(DASHBOARD_OPERATOR_ROLE, msg.sender), "Only dashboard operator");
        _;
    }
    
    modifier onlyEmergencyOperator() {
        require(hasRole(EMERGENCY_OPERATOR_ROLE, msg.sender), "Only emergency operator");
        _;
    }
    
    modifier onlyBatchOperator() {
        require(hasRole(BATCH_OPERATOR_ROLE, msg.sender), "Only batch operator");
        _;
    }

    constructor(address _dashboardOperator) {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(DASHBOARD_OPERATOR_ROLE, _dashboardOperator);
        _grantRole(EMERGENCY_OPERATOR_ROLE, _dashboardOperator);
        _grantRole(BATCH_OPERATOR_ROLE, _dashboardOperator);
        currentDashboardOperator = _dashboardOperator;
        globalMetrics.lastMetricsUpdate = block.timestamp;
    }

    /// @notice Registers a new CEDAI with breach assessment from GVMS dashboard
    function registerCEDAI(
        string memory cedaiId,
        bytes32 zkProofCommitment,
        bool breachFlag,
        BreachSeverity breachSeverity,
        EnforcementAction enforcementAction,
        string memory breachDescription
    ) public nonReentrant whenNotPaused {
        require(bytes(cedaiId).length > 0 && bytes(cedaiId).length <= MAX_STRING_LENGTH, "Invalid ID length");
        require(registry[cedaiId].breachTimestamp == 0, "Already exists");
        require(breachSeverity != BreachSeverity.NONE || !breachFlag, "Invalid severity for breach");
        require(bytes(breachDescription).length <= MAX_STRING_LENGTH, "Description too long");

        bytes32 entryHash = keccak256(abi.encodePacked(
            cedaiId,
            msg.sender,
            zkProofCommitment,
            breachFlag,
            uint8(breachSeverity),
            uint8(enforcementAction),
            block.timestamp
        ));

        CEDAIEntry memory newEntry = CEDAIEntry({
            cedaiId: cedaiId,
            issuer: msg.sender,
            zkProofCommitment: zkProofCommitment,
            breachFlag: breachFlag,
            breachSeverity: breachSeverity,
            enforcementAction: enforcementAction,
            breachTimestamp: block.timestamp,
            lastUpdated: block.timestamp,
            breachDescription: breachDescription,
            entryHash: entryHash,
            isActive: true
        });

        registry[cedaiId] = newEntry;
        issuerCEDAIs[msg.sender].push(cedaiId);
        
        if (breachFlag) {
            severityCounts[breachSeverity]++;
            _updateGlobalMetrics();
        }

        emit CEDAIRegistered(
            cedaiId,
            msg.sender,
            zkProofCommitment,
            breachFlag,
            breachSeverity,
            enforcementAction,
            block.timestamp,
            entryHash
        );
    }

    /// @notice Batch registration for multiple CEDAIs (gas efficient)
    function batchRegisterCEDAIs(
        BatchOperation memory batch
    ) public onlyBatchOperator nonReentrant whenNotPaused {
        require(batch.cedaiIds.length <= MAX_BATCH_SIZE, "Batch too large");
        require(batch.cedaiIds.length > 0, "Empty batch");
        require(
            batch.cedaiIds.length == batch.zkProofCommitments.length &&
            batch.cedaiIds.length == batch.breachFlags.length &&
            batch.cedaiIds.length == batch.breachSeverities.length &&
            batch.cedaiIds.length == batch.enforcementActions.length &&
            batch.cedaiIds.length == batch.breachDescriptions.length,
            "Array length mismatch"
        );

        for (uint256 i = 0; i < batch.cedaiIds.length; i++) {
            require(bytes(batch.cedaiIds[i]).length > 0 && bytes(batch.cedaiIds[i]).length <= MAX_STRING_LENGTH, "Invalid ID length");
            require(registry[batch.cedaiIds[i]].breachTimestamp == 0, "CEDAI already exists");
            require(batch.breachSeverities[i] != BreachSeverity.NONE || !batch.breachFlags[i], "Invalid severity for breach");
            require(bytes(batch.breachDescriptions[i]).length <= MAX_STRING_LENGTH, "Description too long");

            bytes32 entryHash = keccak256(abi.encodePacked(
                batch.cedaiIds[i],
                msg.sender,
                batch.zkProofCommitments[i],
                batch.breachFlags[i],
                uint8(batch.breachSeverities[i]),
                uint8(batch.enforcementActions[i]),
                block.timestamp
            ));

            CEDAIEntry memory newEntry = CEDAIEntry({
                cedaiId: batch.cedaiIds[i],
                issuer: msg.sender,
                zkProofCommitment: batch.zkProofCommitments[i],
                breachFlag: batch.breachFlags[i],
                breachSeverity: batch.breachSeverities[i],
                enforcementAction: batch.enforcementActions[i],
                breachTimestamp: block.timestamp,
                lastUpdated: block.timestamp,
                breachDescription: batch.breachDescriptions[i],
                entryHash: entryHash,
                isActive: true
            });

            registry[batch.cedaiIds[i]] = newEntry;
            issuerCEDAIs[msg.sender].push(batch.cedaiIds[i]);
            
            if (batch.breachFlags[i]) {
                severityCounts[batch.breachSeverities[i]]++;
            }

            emit CEDAIRegistered(
                batch.cedaiIds[i],
                msg.sender,
                batch.zkProofCommitments[i],
                batch.breachFlags[i],
                batch.breachSeverities[i],
                batch.enforcementActions[i],
                block.timestamp,
                entryHash
            );
        }
        
        _updateGlobalMetrics();
        emit BatchOperationExecuted(msg.sender, batch.cedaiIds.length, block.timestamp);
    }

    /// @notice Updates breach assessment based on new GVMS dashboard analysis
    function updateBreachAssessment(
        string memory cedaiId,
        BreachSeverity newSeverity,
        EnforcementAction newEnforcementAction,
        string memory updatedDescription
    ) public onlyDashboardOperator nonReentrant whenNotPaused {
        require(registry[cedaiId].breachTimestamp != 0, "CEDAI not found");
        require(bytes(updatedDescription).length <= MAX_STRING_LENGTH, "Description too long");
        
        BreachSeverity oldSeverity = registry[cedaiId].breachSeverity;
        
        // Update severity counts
        if (registry[cedaiId].breachFlag) {
            severityCounts[oldSeverity]--;
        }
        if (newSeverity != BreachSeverity.NONE) {
            severityCounts[newSeverity]++;
        }
        
        registry[cedaiId].breachSeverity = newSeverity;
        registry[cedaiId].enforcementAction = newEnforcementAction;
        registry[cedaiId].breachDescription = updatedDescription;
        registry[cedaiId].lastUpdated = block.timestamp;
        registry[cedaiId].breachFlag = (newSeverity != BreachSeverity.NONE);
        
        _updateGlobalMetrics();

        emit BreachUpdated(
            cedaiId,
            oldSeverity,
            newSeverity,
            newEnforcementAction,
            block.timestamp
        );
    }

    /// @notice Executes enforcement action based on breach severity
    function executeEnforcementAction(string memory cedaiId) public onlyDashboardOperator nonReentrant whenNotPaused {
        CEDAIEntry storage entry = registry[cedaiId];
        require(entry.breachTimestamp != 0, "CEDAI not found");
        require(entry.isActive, "CEDAI not active");
        
        EnforcementAction action = entry.enforcementAction;
        
        if (action == EnforcementAction.TERMINATION) {
            entry.isActive = false;
        } else if (action == EnforcementAction.SUSPENSION) {
            // Implement suspension logic here
            // For now, we'll just mark it as inactive temporarily
            entry.isActive = false;
        }
        
        globalMetrics.totalEnforcementActions++;
        
        emit EnforcementActionExecuted(
            cedaiId,
            action,
            msg.sender,
            block.timestamp
        );
    }

    /// @notice Reactivates a suspended CEDAI
    function reactivateCEDAI(string memory cedaiId) public onlyDashboardOperator nonReentrant whenNotPaused {
        CEDAIEntry storage entry = registry[cedaiId];
        require(entry.breachTimestamp != 0, "CEDAI not found");
        require(!entry.isActive, "CEDAI already active");
        
        entry.isActive = true;
        entry.lastUpdated = block.timestamp;
    }

    /// @notice Returns breach statistics for GVMS dashboard integration
    function getBreachStatistics() public view returns (
        uint256 totalBreaches,
        uint256 minorBreaches,
        uint256 moderateBreaches,
        uint256 severeBreaches,
        uint256 criticalBreaches,
        uint256 totalEnforcementActions,
        uint256 lastMetricsUpdate
    ) {
        return (
            globalMetrics.totalBreaches,
            globalMetrics.minorBreaches,
            globalMetrics.moderateBreaches,
            globalMetrics.severeBreaches,
            globalMetrics.criticalBreaches,
            globalMetrics.totalEnforcementActions,
            globalMetrics.lastMetricsUpdate
        );
    }

    /// @notice Returns all CEDAIs for a specific issuer
    function getIssuerCEDAIs(address issuer) public view returns (string[] memory) {
        return issuerCEDAIs[issuer];
    }

    /// @notice Returns the entry hash for a given CEDAI ID
    function getCEDAIHash(string memory cedaiId) public view returns (bytes32) {
        return registry[cedaiId].entryHash;
    }

    /// @notice Returns complete CEDAI entry for dashboard analysis
    function getCEDAIEntry(string memory cedaiId) public view returns (
        string memory cedaiId_,
        address issuer,
        bytes32 zkProofCommitment,
        bool breachFlag,
        BreachSeverity breachSeverity,
        EnforcementAction enforcementAction,
        uint256 breachTimestamp,
        uint256 lastUpdated,
        string memory breachDescription,
        bytes32 entryHash,
        bool isActive
    ) {
        CEDAIEntry memory entry = registry[cedaiId];
        return (
            entry.cedaiId,
            entry.issuer,
            entry.zkProofCommitment,
            entry.breachFlag,
            entry.breachSeverity,
            entry.enforcementAction,
            entry.breachTimestamp,
            entry.lastUpdated,
            entry.breachDescription,
            entry.entryHash,
            entry.isActive
        );
    }

    /// @notice Batch retrieval of CEDAI entries (gas efficient)
    function getBatchCEDAIEntries(string[] memory cedaiIds) public view returns (
        CEDAIEntry[] memory entries
    ) {
        require(cedaiIds.length <= MAX_BATCH_SIZE, "Batch too large");
        entries = new CEDAIEntry[](cedaiIds.length);
        
        for (uint256 i = 0; i < cedaiIds.length; i++) {
            entries[i] = registry[cedaiIds[i]];
        }
        
        return entries;
    }

    /// @notice Emergency pause functionality
    function setEmergencyPause(bool paused) public onlyEmergencyOperator {
        if (paused) {
            _pause();
        } else {
            _unpause();
        }
        emit EmergencyPaused(msg.sender, paused);
    }

    /// @notice Update dashboard operator
    function updateDashboardOperator(address newOperator) public onlyRole(DEFAULT_ADMIN_ROLE) {
        require(newOperator != address(0), "Invalid operator address");
        
        address oldOperator = currentDashboardOperator;
        
        // Revoke role from current operator
        revokeRole(DASHBOARD_OPERATOR_ROLE, oldOperator);
        
        // Grant role to new operator
        grantRole(DASHBOARD_OPERATOR_ROLE, newOperator);
        
        // Update state variable
        currentDashboardOperator = newOperator;
        
        emit DashboardOperatorUpdated(oldOperator, newOperator);
    }

    /// @notice Grant batch operator role
    function grantBatchOperatorRole(address operator) public onlyRole(DEFAULT_ADMIN_ROLE) {
        grantRole(BATCH_OPERATOR_ROLE, operator);
    }

    /// @notice Revoke batch operator role
    function revokeBatchOperatorRole(address operator) public onlyRole(DEFAULT_ADMIN_ROLE) {
        revokeRole(BATCH_OPERATOR_ROLE, operator);
    }

    /// @notice Internal function to update global metrics
    function _updateGlobalMetrics() internal {
        globalMetrics.totalBreaches = 
            severityCounts[BreachSeverity.MINOR] +
            severityCounts[BreachSeverity.MODERATE] +
            severityCounts[BreachSeverity.SEVERE] +
            severityCounts[BreachSeverity.CRITICAL];
            
        globalMetrics.minorBreaches = severityCounts[BreachSeverity.MINOR];
        globalMetrics.moderateBreaches = severityCounts[BreachSeverity.MODERATE];
        globalMetrics.severeBreaches = severityCounts[BreachSeverity.SEVERE];
        globalMetrics.criticalBreaches = severityCounts[BreachSeverity.CRITICAL];
        globalMetrics.lastMetricsUpdate = block.timestamp;
    }
} 