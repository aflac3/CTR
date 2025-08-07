// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/// @title EDAI Securities Compliance
/// @notice Handles KYC/AML verification and trading restrictions for EDAI securities
/// @dev Implements compliance framework for securities trading
contract EDAISecuritiesCompliance is ReentrancyGuard, AccessControl, Pausable {
    bytes32 public constant COMPLIANCE_OFFICER_ROLE = keccak256("COMPLIANCE_OFFICER_ROLE");
    bytes32 public constant KYC_PROVIDER_ROLE = keccak256("KYC_PROVIDER_ROLE");
    bytes32 public constant AML_PROVIDER_ROLE = keccak256("AML_PROVIDER_ROLE");
    bytes32 public constant TRADER_ROLE = keccak256("TRADER_ROLE");

    struct Investor {
        address investorAddress;
        bool isAccredited;
        uint256 maxInvestment;
        string[] allowedEdaiIds;
        bool kycVerified;
        bool amlCleared;
        uint256 registrationTime;
        uint256 lastUpdateTime;
        bool isActive;
    }

    struct TradingRestriction {
        string edaiId;
        address investor;
        RestrictionType restrictionType;
        string reason;
        uint256 startTime;
        uint256 endTime;
        bool isActive;
    }

    enum RestrictionType {
        NONE,
        TRADING_SUSPENSION,
        POSITION_LIMIT,
        WITHDRAWAL_FREEZE,
        COMPLETE_BAN
    }

    enum ComplianceStatus {
        PENDING,
        APPROVED,
        REJECTED,
        SUSPENDED
    }

    // Storage
    mapping(address => Investor) public investors;
    mapping(string => mapping(address => TradingRestriction)) public tradingRestrictions;
    mapping(string => bool) public edaiTradingEnabled;
    mapping(address => ComplianceStatus) public complianceStatus;
    mapping(string => uint256) public edaiPositionLimits;
    mapping(address => mapping(string => uint256)) public investorPositions;

    // Events
    event InvestorRegistered(
        address indexed investor,
        bool isAccredited,
        uint256 maxInvestment,
        uint256 timestamp
    );

    event KYCVerified(
        address indexed investor,
        address indexed provider,
        uint256 timestamp
    );

    event AMLCleared(
        address indexed investor,
        address indexed provider,
        uint256 timestamp
    );

    event TradingRestrictionAdded(
        string indexed edaiId,
        address indexed investor,
        RestrictionType restrictionType,
        string reason,
        uint256 startTime,
        uint256 endTime
    );

    event TradingRestrictionRemoved(
        string indexed edaiId,
        address indexed investor,
        uint256 timestamp
    );

    event EDAITradingEnabled(
        string indexed edaiId,
        bool enabled,
        uint256 timestamp
    );

    event PositionLimitUpdated(
        string indexed edaiId,
        uint256 newLimit,
        uint256 timestamp
    );

    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(COMPLIANCE_OFFICER_ROLE, msg.sender);
        _grantRole(KYC_PROVIDER_ROLE, msg.sender);
        _grantRole(AML_PROVIDER_ROLE, msg.sender);
    }

    /// @notice Register a new investor
    /// @param investorAddress The investor's address
    /// @param isAccredited Whether the investor is accredited
    /// @param maxInvestment Maximum investment amount
    /// @param allowedEdaiIds Array of allowed EDAI IDs
    function registerInvestor(
        address investorAddress,
        bool isAccredited,
        uint256 maxInvestment,
        string[] memory allowedEdaiIds
    ) external onlyRole(COMPLIANCE_OFFICER_ROLE) whenNotPaused {
        require(investorAddress != address(0), "Invalid investor address");
        require(!investors[investorAddress].isActive, "Investor already registered");

        Investor memory newInvestor = Investor({
            investorAddress: investorAddress,
            isAccredited: isAccredited,
            maxInvestment: maxInvestment,
            allowedEdaiIds: allowedEdaiIds,
            kycVerified: false,
            amlCleared: false,
            registrationTime: block.timestamp,
            lastUpdateTime: block.timestamp,
            isActive: true
        });

        investors[investorAddress] = newInvestor;
        complianceStatus[investorAddress] = ComplianceStatus.PENDING;

        emit InvestorRegistered(investorAddress, isAccredited, maxInvestment, block.timestamp);
    }

    /// @notice Verify KYC for an investor
    /// @param investorAddress The investor's address
    /// @param provider The KYC provider
    function verifyKYC(address investorAddress, address provider) external onlyRole(KYC_PROVIDER_ROLE) whenNotPaused {
        require(investors[investorAddress].isActive, "Investor not registered");
        require(!investors[investorAddress].kycVerified, "KYC already verified");

        investors[investorAddress].kycVerified = true;
        investors[investorAddress].lastUpdateTime = block.timestamp;

        emit KYCVerified(investorAddress, provider, block.timestamp);
    }

    /// @notice Clear AML for an investor
    /// @param investorAddress The investor's address
    /// @param provider The AML provider
    function clearAML(address investorAddress, address provider) external onlyRole(AML_PROVIDER_ROLE) whenNotPaused {
        require(investors[investorAddress].isActive, "Investor not registered");
        require(!investors[investorAddress].amlCleared, "AML already cleared");

        investors[investorAddress].amlCleared = true;
        investors[investorAddress].lastUpdateTime = block.timestamp;

        emit AMLCleared(investorAddress, provider, block.timestamp);
    }

    /// @notice Add a trading restriction for an investor
    /// @param edaiId The EDAI identifier
    /// @param investor The investor's address
    /// @param restrictionType The type of restriction
    /// @param reason The reason for the restriction
    /// @param duration The duration of the restriction in seconds
    function addTradingRestriction(
        string memory edaiId,
        address investor,
        RestrictionType restrictionType,
        string memory reason,
        uint256 duration
    ) external onlyRole(COMPLIANCE_OFFICER_ROLE) whenNotPaused {
        require(bytes(edaiId).length > 0, "Invalid EDAI ID");
        require(investor != address(0), "Invalid investor address");
        require(restrictionType != RestrictionType.NONE, "Invalid restriction type");
        require(bytes(reason).length > 0, "Reason required");

        TradingRestriction memory restriction = TradingRestriction({
            edaiId: edaiId,
            investor: investor,
            restrictionType: restrictionType,
            reason: reason,
            startTime: block.timestamp,
            endTime: block.timestamp + duration,
            isActive: true
        });

        tradingRestrictions[edaiId][investor] = restriction;

        emit TradingRestrictionAdded(edaiId, investor, restrictionType, reason, block.timestamp, block.timestamp + duration);
    }

    /// @notice Remove a trading restriction for an investor
    /// @param edaiId The EDAI identifier
    /// @param investor The investor's address
    function removeTradingRestriction(
        string memory edaiId,
        address investor
    ) external onlyRole(COMPLIANCE_OFFICER_ROLE) whenNotPaused {
        require(tradingRestrictions[edaiId][investor].isActive, "No active restriction");

        tradingRestrictions[edaiId][investor].isActive = false;

        emit TradingRestrictionRemoved(edaiId, investor, block.timestamp);
    }

    /// @notice Enable or disable trading for an EDAI
    /// @param edaiId The EDAI identifier
    /// @param enabled Whether trading is enabled
    function setEdaiTradingEnabled(string memory edaiId, bool enabled) external onlyRole(COMPLIANCE_OFFICER_ROLE) whenNotPaused {
        require(bytes(edaiId).length > 0, "Invalid EDAI ID");

        edaiTradingEnabled[edaiId] = enabled;

        emit EDAITradingEnabled(edaiId, enabled, block.timestamp);
    }

    /// @notice Update position limit for an EDAI
    /// @param edaiId The EDAI identifier
    /// @param newLimit The new position limit
    function updatePositionLimit(string memory edaiId, uint256 newLimit) external onlyRole(COMPLIANCE_OFFICER_ROLE) whenNotPaused {
        require(bytes(edaiId).length > 0, "Invalid EDAI ID");

        edaiPositionLimits[edaiId] = newLimit;

        emit PositionLimitUpdated(edaiId, newLimit, block.timestamp);
    }

    /// @notice Check if an investor is eligible to trade
    /// @param investor The investor's address
    /// @param edaiId The EDAI identifier
    /// @return eligible Whether the investor is eligible
    function isInvestorEligible(address investor, string memory edaiId) external view returns (bool eligible) {
        Investor storage investorData = investors[investor];
        
        if (!investorData.isActive) {
            return false;
        }

        if (!investorData.kycVerified || !investorData.amlCleared) {
            return false;
        }

        if (!edaiTradingEnabled[edaiId]) {
            return false;
        }

        // Check for active trading restrictions
        TradingRestriction storage restriction = tradingRestrictions[edaiId][investor];
        if (restriction.isActive && block.timestamp < restriction.endTime) {
            return false;
        }

        // Check if EDAI is in allowed list
        bool edaiAllowed = false;
        for (uint256 i = 0; i < investorData.allowedEdaiIds.length; i++) {
            if (keccak256(bytes(investorData.allowedEdaiIds[i])) == keccak256(bytes(edaiId))) {
                edaiAllowed = true;
                break;
            }
        }

        if (!edaiAllowed) {
            return false;
        }

        return true;
    }

    /// @notice Get investor information
    /// @param investor The investor's address
    /// @return Investor information
    function getInvestor(address investor) external view returns (Investor memory) {
        return investors[investor];
    }

    /// @notice Get trading restriction for an investor
    /// @param edaiId The EDAI identifier
    /// @param investor The investor's address
    /// @return Trading restriction information
    function getTradingRestriction(string memory edaiId, address investor) external view returns (TradingRestriction memory) {
        return tradingRestrictions[edaiId][investor];
    }

    /// @notice Check if trading is enabled for an EDAI
    /// @param edaiId The EDAI identifier
    /// @return Whether trading is enabled
    function isTradingEnabled(string memory edaiId) external view returns (bool) {
        return edaiTradingEnabled[edaiId];
    }

    /// @notice Get position limit for an EDAI
    /// @param edaiId The EDAI identifier
    /// @return Position limit
    function getPositionLimit(string memory edaiId) external view returns (uint256) {
        return edaiPositionLimits[edaiId];
    }

    /// @notice Update investor position
    /// @param edaiId The EDAI identifier
    /// @param investor The investor's address
    /// @param amount The position amount (positive for long, negative for short)
    function updatePosition(
        string memory edaiId,
        address investor,
        int256 amount
    ) external onlyRole(TRADER_ROLE) whenNotPaused {
        require(bytes(edaiId).length > 0, "Invalid EDAI ID");
        require(investor != address(0), "Invalid investor address");

        uint256 currentPosition = investorPositions[investor][edaiId];
        uint256 newPosition;

        if (amount > 0) {
            newPosition = currentPosition + uint256(amount);
        } else {
            uint256 decrease = uint256(-amount);
            require(currentPosition >= decrease, "Insufficient position");
            newPosition = currentPosition - decrease;
        }

        // Check position limit
        uint256 positionLimit = edaiPositionLimits[edaiId];
        if (positionLimit > 0) {
            require(newPosition <= positionLimit, "Position limit exceeded");
        }

        investorPositions[investor][edaiId] = newPosition;
    }

    /// @notice Get investor position for an EDAI
    /// @param edaiId The EDAI identifier
    /// @param investor The investor's address
    /// @return Position amount
    function getPosition(string memory edaiId, address investor) external view returns (uint256) {
        return investorPositions[investor][edaiId];
    }

    /// @notice Check if an investor has sufficient compliance status
    /// @param investor The investor's address
    /// @return Whether the investor has sufficient compliance status
    function hasSufficientCompliance(address investor) external view returns (bool) {
        Investor storage investorData = investors[investor];
        return investorData.isActive && investorData.kycVerified && investorData.amlCleared;
    }

    /// @notice Get compliance status for an investor
    /// @param investor The investor's address
    /// @return Compliance status
    function getComplianceStatus(address investor) external view returns (ComplianceStatus) {
        return complianceStatus[investor];
    }

    /// @notice Update compliance status for an investor
    /// @param investor The investor's address
    /// @param status The new compliance status
    function updateComplianceStatus(
        address investor,
        ComplianceStatus status
    ) external onlyRole(COMPLIANCE_OFFICER_ROLE) whenNotPaused {
        require(investor != address(0), "Invalid investor address");

        complianceStatus[investor] = status;
        investors[investor].lastUpdateTime = block.timestamp;
    }
} 