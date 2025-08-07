// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";

/// @title EDAI Issuance Contract
/// @notice Handles the issuance and management of EDAI securities
/// @dev Implements securities issuance with regulatory compliance
contract EDAIIssuance is ReentrancyGuard, AccessControl, Pausable {
    bytes32 public constant ISSUER_ROLE = keccak256("ISSUER_ROLE");
    bytes32 public constant REGULATOR_ROLE = keccak256("REGULATOR_ROLE");
    bytes32 public constant COMPLIANCE_OFFICER_ROLE = keccak256("COMPLIANCE_OFFICER_ROLE");
    bytes32 public constant INVESTOR_ROLE = keccak256("INVESTOR_ROLE");

    struct Issuance {
        string edaiId;
        address issuer;
        uint256 totalSupply;
        uint256 issuedAmount;
        uint256 pricePerToken;
        uint256 issuanceDate;
        uint256 maturityDate;
        string description;
        IssuanceStatus status;
        bool isActive;
    }

    struct InvestorAllocation {
        address investor;
        uint256 allocatedAmount;
        uint256 purchasedAmount;
        uint256 purchasePrice;
        uint256 purchaseDate;
        bool isActive;
    }

    enum IssuanceStatus {
        DRAFT,
        PENDING_APPROVAL,
        APPROVED,
        ACTIVE,
        PAUSED,
        COMPLETED,
        CANCELLED
    }

    enum IssuanceType {
        PRIVATE_PLACEMENT,
        PUBLIC_OFFERING,
        REGULATION_D,
        REGULATION_A,
        REGULATION_S
    }

    // Storage
    mapping(string => Issuance) public issuances;
    mapping(string => mapping(address => InvestorAllocation)) public investorAllocations;
    mapping(address => string[]) public issuerIssuances;
    mapping(string => IssuanceType) public issuanceTypes;
    mapping(string => uint256) public issuanceFees;
    mapping(string => bool) public edaiTokens;

    // Events
    event IssuanceCreated(
        string indexed edaiId,
        address indexed issuer,
        uint256 totalSupply,
        uint256 pricePerToken,
        IssuanceType issuanceType,
        uint256 timestamp
    );

    event IssuanceApproved(
        string indexed edaiId,
        address indexed regulator,
        uint256 timestamp
    );

    event IssuanceActivated(
        string indexed edaiId,
        uint256 timestamp
    );

    event TokensPurchased(
        string indexed edaiId,
        address indexed investor,
        uint256 amount,
        uint256 price,
        uint256 timestamp
    );

    event IssuanceCompleted(
        string indexed edaiId,
        uint256 totalIssued,
        uint256 timestamp
    );

    event IssuanceCancelled(
        string indexed edaiId,
        address indexed issuer,
        string reason,
        uint256 timestamp
    );

    // Constants
    uint256 public constant MIN_ISSUANCE_AMOUNT = 1000 * 1e18;
    uint256 public constant MAX_ISSUANCE_AMOUNT = 1000000000 * 1e18;
    uint256 public constant MIN_ISSUANCE_DURATION = 1 days;
    uint256 public constant MAX_ISSUANCE_DURATION = 365 days;

    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(REGULATOR_ROLE, msg.sender);
        _grantRole(COMPLIANCE_OFFICER_ROLE, msg.sender);
    }

    /// @notice Create a new EDAI issuance
    /// @param edaiId The EDAI identifier
    /// @param totalSupply Total supply of tokens to issue
    /// @param pricePerToken Price per token in stablecoin
    /// @param issuanceType Type of issuance
    /// @param description Description of the issuance
    /// @param maturityDate Maturity date of the issuance
    function createIssuance(
        string memory edaiId,
        uint256 totalSupply,
        uint256 pricePerToken,
        IssuanceType issuanceType,
        string memory description,
        uint256 maturityDate
    ) external onlyRole(ISSUER_ROLE) whenNotPaused {
        require(bytes(edaiId).length > 0, "Invalid EDAI ID");
        require(totalSupply >= MIN_ISSUANCE_AMOUNT, "Supply too low");
        require(totalSupply <= MAX_ISSUANCE_AMOUNT, "Supply too high");
        require(pricePerToken > 0, "Invalid price");
        require(maturityDate > block.timestamp + MIN_ISSUANCE_DURATION, "Invalid maturity date");
        require(maturityDate <= block.timestamp + MAX_ISSUANCE_DURATION, "Maturity too far");
        require(issuances[edaiId].issuanceDate == 0, "Issuance already exists");

        Issuance memory newIssuance = Issuance({
            edaiId: edaiId,
            issuer: msg.sender,
            totalSupply: totalSupply,
            issuedAmount: 0,
            pricePerToken: pricePerToken,
            issuanceDate: block.timestamp,
            maturityDate: maturityDate,
            description: description,
            status: IssuanceStatus.DRAFT,
            isActive: true
        });

        issuances[edaiId] = newIssuance;
        issuanceTypes[edaiId] = issuanceType;
        issuerIssuances[msg.sender].push(edaiId);

        emit IssuanceCreated(edaiId, msg.sender, totalSupply, pricePerToken, issuanceType, block.timestamp);
    }

    /// @notice Approve an issuance for activation
    /// @param edaiId The EDAI identifier
    function approveIssuance(string memory edaiId) external onlyRole(REGULATOR_ROLE) whenNotPaused {
        Issuance storage issuance = issuances[edaiId];
        require(issuance.isActive, "Issuance not found");
        require(issuance.status == IssuanceStatus.DRAFT, "Invalid status");

        issuance.status = IssuanceStatus.APPROVED;

        emit IssuanceApproved(edaiId, msg.sender, block.timestamp);
    }

    /// @notice Activate an approved issuance
    /// @param edaiId The EDAI identifier
    function activateIssuance(string memory edaiId) external onlyRole(ISSUER_ROLE) whenNotPaused {
        Issuance storage issuance = issuances[edaiId];
        require(issuance.isActive, "Issuance not found");
        require(issuance.status == IssuanceStatus.APPROVED, "Not approved");
        require(issuance.issuer == msg.sender, "Not the issuer");

        issuance.status = IssuanceStatus.ACTIVE;

        emit IssuanceActivated(edaiId, block.timestamp);
    }

    /// @notice Purchase tokens in an active issuance
    /// @param edaiId The EDAI identifier
    /// @param amount Amount of tokens to purchase
    function purchaseTokens(
        string memory edaiId,
        uint256 amount
    ) external onlyRole(INVESTOR_ROLE) nonReentrant whenNotPaused {
        Issuance storage issuance = issuances[edaiId];
        require(issuance.isActive, "Issuance not found");
        require(issuance.status == IssuanceStatus.ACTIVE, "Issuance not active");
        require(amount > 0, "Invalid amount");
        require(issuance.issuedAmount + amount <= issuance.totalSupply, "Exceeds total supply");

        uint256 totalCost = amount * issuance.pricePerToken;

        // Check if investor has allocation
        InvestorAllocation storage allocation = investorAllocations[edaiId][msg.sender];
        require(allocation.isActive, "No allocation");
        require(allocation.purchasedAmount + amount <= allocation.allocatedAmount, "Exceeds allocation");

        // Transfer stablecoin from investor to issuer
        // This would integrate with actual stablecoin contract
        // IERC20(stablecoin).transferFrom(msg.sender, issuance.issuer, totalCost);

        // Update issuance
        issuance.issuedAmount += amount;

        // Update investor allocation
        allocation.purchasedAmount += amount;
        allocation.purchasePrice = issuance.pricePerToken;
        allocation.purchaseDate = block.timestamp;

        // Mint tokens to investor (would integrate with actual token contract)
        // IERC20(edaiToken).mint(msg.sender, amount);

        emit TokensPurchased(edaiId, msg.sender, amount, issuance.pricePerToken, block.timestamp);

        // Check if issuance is complete
        if (issuance.issuedAmount == issuance.totalSupply) {
            issuance.status = IssuanceStatus.COMPLETED;
            emit IssuanceCompleted(edaiId, issuance.issuedAmount, block.timestamp);
        }
    }

    /// @notice Allocate tokens to an investor
    /// @param edaiId The EDAI identifier
    /// @param investor The investor address
    /// @param amount Amount to allocate
    function allocateTokens(
        string memory edaiId,
        address investor,
        uint256 amount
    ) external onlyRole(ISSUER_ROLE) whenNotPaused {
        Issuance storage issuance = issuances[edaiId];
        require(issuance.isActive, "Issuance not found");
        require(issuance.issuer == msg.sender, "Not the issuer");
        require(amount > 0, "Invalid amount");
        require(issuance.issuedAmount + amount <= issuance.totalSupply, "Exceeds total supply");

        InvestorAllocation storage allocation = investorAllocations[edaiId][investor];
        require(!allocation.isActive, "Allocation already exists");

        allocation.investor = investor;
        allocation.allocatedAmount = amount;
        allocation.purchasedAmount = 0;
        allocation.purchasePrice = 0;
        allocation.purchaseDate = 0;
        allocation.isActive = true;
    }

    /// @notice Cancel an issuance
    /// @param edaiId The EDAI identifier
    /// @param reason Reason for cancellation
    function cancelIssuance(
        string memory edaiId,
        string memory reason
    ) external onlyRole(ISSUER_ROLE) whenNotPaused {
        Issuance storage issuance = issuances[edaiId];
        require(issuance.isActive, "Issuance not found");
        require(issuance.issuer == msg.sender, "Not the issuer");
        require(issuance.status != IssuanceStatus.COMPLETED, "Already completed");

        issuance.status = IssuanceStatus.CANCELLED;
        issuance.isActive = false;

        emit IssuanceCancelled(edaiId, msg.sender, reason, block.timestamp);
    }

    /// @notice Get issuance information
    /// @param edaiId The EDAI identifier
    /// @return Issuance information
    function getIssuance(string memory edaiId) external view returns (Issuance memory) {
        return issuances[edaiId];
    }

    /// @notice Get investor allocation
    /// @param edaiId The EDAI identifier
    /// @param investor The investor address
    /// @return Investor allocation information
    function getInvestorAllocation(
        string memory edaiId,
        address investor
    ) external view returns (InvestorAllocation memory) {
        return investorAllocations[edaiId][investor];
    }

    /// @notice Get all issuances for an issuer
    /// @param issuer The issuer address
    /// @return Array of EDAI IDs
    function getIssuerIssuances(address issuer) external view returns (string[] memory) {
        return issuerIssuances[issuer];
    }

    /// @notice Check if an issuance is active
    /// @param edaiId The EDAI identifier
    /// @return Whether the issuance is active
    function isIssuanceActive(string memory edaiId) external view returns (bool) {
        return issuances[edaiId].isActive && issuances[edaiId].status == IssuanceStatus.ACTIVE;
    }

    /// @notice Get issuance type
    /// @param edaiId The EDAI identifier
    /// @return Issuance type
    function getIssuanceType(string memory edaiId) external view returns (IssuanceType) {
        return issuanceTypes[edaiId];
    }

    /// @notice Pause an issuance
    /// @param edaiId The EDAI identifier
    function pauseIssuance(string memory edaiId) external onlyRole(COMPLIANCE_OFFICER_ROLE) whenNotPaused {
        Issuance storage issuance = issuances[edaiId];
        require(issuance.isActive, "Issuance not found");
        require(issuance.status == IssuanceStatus.ACTIVE, "Not active");

        issuance.status = IssuanceStatus.PAUSED;
    }

    /// @notice Resume a paused issuance
    /// @param edaiId The EDAI identifier
    function resumeIssuance(string memory edaiId) external onlyRole(COMPLIANCE_OFFICER_ROLE) whenNotPaused {
        Issuance storage issuance = issuances[edaiId];
        require(issuance.isActive, "Issuance not found");
        require(issuance.status == IssuanceStatus.PAUSED, "Not paused");

        issuance.status = IssuanceStatus.ACTIVE;
    }
} 