// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Pausable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title EDAI Token Contract
/// @notice ERC20 token representing Energy Dispatch Assurance Instruments
/// @dev Implements securities token with regulatory compliance features
contract EDAIToken is ERC20, ERC20Burnable, ERC20Pausable, AccessControl, ReentrancyGuard {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant BURNER_ROLE = keccak256("BURNER_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    bytes32 public constant COMPLIANCE_ROLE = keccak256("COMPLIANCE_ROLE");

    struct TokenMetadata {
        string edaiId;
        uint256 issuanceDate;
        uint256 maturityDate;
        uint256 faceValue;
        string description;
        bool isActive;
    }

    struct TransferRestriction {
        address account;
        bool isRestricted;
        uint256 restrictionStart;
        uint256 restrictionEnd;
        string reason;
    }

    // Storage
    mapping(string => TokenMetadata) public tokenMetadata;
    mapping(address => TransferRestriction) public transferRestrictions;
    mapping(address => bool) public blacklistedAccounts;
    mapping(address => uint256) public accountBalances;
    mapping(string => uint256) public edaiTotalSupply;

    // Events
    event TokenMetadataUpdated(
        string indexed edaiId,
        uint256 issuanceDate,
        uint256 maturityDate,
        uint256 faceValue,
        string description
    );

    event TransferRestrictionAdded(
        address indexed account,
        uint256 startTime,
        uint256 endTime,
        string reason
    );

    event TransferRestrictionRemoved(
        address indexed account,
        uint256 timestamp
    );

    event AccountBlacklisted(
        address indexed account,
        string reason,
        uint256 timestamp
    );

    event AccountUnblacklisted(
        address indexed account,
        uint256 timestamp
    );

    event TokensMinted(
        string indexed edaiId,
        address indexed to,
        uint256 amount,
        uint256 timestamp
    );

    event TokensBurned(
        string indexed edaiId,
        address indexed from,
        uint256 amount,
        uint256 timestamp
    );

    // Constants
    uint256 public constant MAX_SUPPLY = 1000000000 * 1e18; // 1 billion tokens
    uint256 public constant MIN_TRANSFER_AMOUNT = 1 * 1e18; // 1 token minimum

    constructor(
        string memory name,
        string memory symbol,
        uint8 decimals_
    ) ERC20(name, symbol) {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(MINTER_ROLE, msg.sender);
        _grantRole(BURNER_ROLE, msg.sender);
        _grantRole(PAUSER_ROLE, msg.sender);
        _grantRole(COMPLIANCE_ROLE, msg.sender);
    }

    /// @notice Mint tokens for a specific EDAI
    /// @param edaiId The EDAI identifier
    /// @param to The recipient address
    /// @param amount The amount to mint
    function mint(
        string memory edaiId,
        address to,
        uint256 amount
    ) external onlyRole(MINTER_ROLE) whenNotPaused {
        require(bytes(edaiId).length > 0, "Invalid EDAI ID");
        require(to != address(0), "Invalid recipient");
        require(amount > 0, "Invalid amount");
        require(totalSupply() + amount <= MAX_SUPPLY, "Exceeds max supply");

        _mint(to, amount);
        edaiTotalSupply[edaiId] += amount;

        emit TokensMinted(edaiId, to, amount, block.timestamp);
    }

    /// @notice Burn tokens for a specific EDAI
    /// @param edaiId The EDAI identifier
    /// @param from The address to burn from
    /// @param amount The amount to burn
    function burn(
        string memory edaiId,
        address from,
        uint256 amount
    ) external onlyRole(BURNER_ROLE) whenNotPaused {
        require(bytes(edaiId).length > 0, "Invalid EDAI ID");
        require(from != address(0), "Invalid address");
        require(amount > 0, "Invalid amount");
        require(balanceOf(from) >= amount, "Insufficient balance");

        _burn(from, amount);
        edaiTotalSupply[edaiId] -= amount;

        emit TokensBurned(edaiId, from, amount, block.timestamp);
    }

    /// @notice Set token metadata for an EDAI
    /// @param edaiId The EDAI identifier
    /// @param issuanceDate The issuance date
    /// @param maturityDate The maturity date
    /// @param faceValue The face value
    /// @param description The description
    function setTokenMetadata(
        string memory edaiId,
        uint256 issuanceDate,
        uint256 maturityDate,
        uint256 faceValue,
        string memory description
    ) external onlyRole(COMPLIANCE_ROLE) {
        require(bytes(edaiId).length > 0, "Invalid EDAI ID");
        require(issuanceDate > 0, "Invalid issuance date");
        require(maturityDate > issuanceDate, "Invalid maturity date");
        require(faceValue > 0, "Invalid face value");

        TokenMetadata memory metadata = TokenMetadata({
            edaiId: edaiId,
            issuanceDate: issuanceDate,
            maturityDate: maturityDate,
            faceValue: faceValue,
            description: description,
            isActive: true
        });

        tokenMetadata[edaiId] = metadata;

        emit TokenMetadataUpdated(edaiId, issuanceDate, maturityDate, faceValue, description);
    }

    /// @notice Add transfer restriction for an account
    /// @param account The account to restrict
    /// @param duration The duration of restriction in seconds
    /// @param reason The reason for restriction
    function addTransferRestriction(
        address account,
        uint256 duration,
        string memory reason
    ) external onlyRole(COMPLIANCE_ROLE) {
        require(account != address(0), "Invalid account");
        require(duration > 0, "Invalid duration");

        TransferRestriction memory restriction = TransferRestriction({
            account: account,
            isRestricted: true,
            restrictionStart: block.timestamp,
            restrictionEnd: block.timestamp + duration,
            reason: reason
        });

        transferRestrictions[account] = restriction;

        emit TransferRestrictionAdded(account, block.timestamp, block.timestamp + duration, reason);
    }

    /// @notice Remove transfer restriction for an account
    /// @param account The account to unrestrict
    function removeTransferRestriction(address account) external onlyRole(COMPLIANCE_ROLE) {
        require(transferRestrictions[account].isRestricted, "No restriction found");

        transferRestrictions[account].isRestricted = false;

        emit TransferRestrictionRemoved(account, block.timestamp);
    }

    /// @notice Blacklist an account
    /// @param account The account to blacklist
    /// @param reason The reason for blacklisting
    function blacklistAccount(address account, string memory reason) external onlyRole(COMPLIANCE_ROLE) {
        require(account != address(0), "Invalid account");
        require(!blacklistedAccounts[account], "Already blacklisted");

        blacklistedAccounts[account] = true;

        emit AccountBlacklisted(account, reason, block.timestamp);
    }

    /// @notice Unblacklist an account
    /// @param account The account to unblacklist
    function unblacklistAccount(address account) external onlyRole(COMPLIANCE_ROLE) {
        require(blacklistedAccounts[account], "Not blacklisted");

        blacklistedAccounts[account] = false;

        emit AccountUnblacklisted(account, block.timestamp);
    }

    /// @notice Override transfer function to include restrictions
    /// @param to The recipient address
    /// @param amount The amount to transfer
    function transfer(address to, uint256 amount) public virtual override returns (bool) {
        _checkTransferRestrictions(msg.sender, to, amount);
        return super.transfer(to, amount);
    }

    /// @notice Override transferFrom function to include restrictions
    /// @param from The sender address
    /// @param to The recipient address
    /// @param amount The amount to transfer
    function transferFrom(
        address from,
        address to,
        uint256 amount
    ) public virtual override returns (bool) {
        _checkTransferRestrictions(from, to, amount);
        return super.transferFrom(from, to, amount);
    }

    /// @notice Override _update function to include pausable functionality
    /// @param from The sender address
    /// @param to The recipient address
    /// @param value The amount to transfer
    function _update(address from, address to, uint256 value) internal virtual override(ERC20, ERC20Pausable) whenNotPaused {
        super._update(from, to, value);
    }

    /// @notice Check transfer restrictions
    /// @param from The sender address
    /// @param to The recipient address
    /// @param amount The amount to transfer
    function _checkTransferRestrictions(
        address from,
        address to,
        uint256 amount
    ) internal view {
        require(!blacklistedAccounts[from], "Sender is blacklisted");
        require(!blacklistedAccounts[to], "Recipient is blacklisted");
        require(amount >= MIN_TRANSFER_AMOUNT, "Amount below minimum");

        // Check transfer restrictions
        TransferRestriction storage restriction = transferRestrictions[from];
        if (restriction.isRestricted && block.timestamp < restriction.restrictionEnd) {
            revert("Transfer restricted");
        }

        restriction = transferRestrictions[to];
        if (restriction.isRestricted && block.timestamp < restriction.restrictionEnd) {
            revert("Recipient transfer restricted");
        }
    }

    /// @notice Get token metadata for an EDAI
    /// @param edaiId The EDAI identifier
    /// @return Token metadata
    function getTokenMetadata(string memory edaiId) external view returns (TokenMetadata memory) {
        return tokenMetadata[edaiId];
    }

    /// @notice Get transfer restriction for an account
    /// @param account The account address
    /// @return Transfer restriction information
    function getTransferRestriction(address account) external view returns (TransferRestriction memory) {
        return transferRestrictions[account];
    }

    /// @notice Check if an account is blacklisted
    /// @param account The account address
    /// @return Whether the account is blacklisted
    function isBlacklisted(address account) external view returns (bool) {
        return blacklistedAccounts[account];
    }

    /// @notice Get total supply for an EDAI
    /// @param edaiId The EDAI identifier
    /// @return Total supply for the EDAI
    function getEdaiTotalSupply(string memory edaiId) external view returns (uint256) {
        return edaiTotalSupply[edaiId];
    }

    /// @notice Pause all token transfers
    function pause() external onlyRole(PAUSER_ROLE) {
        _pause();
    }

    /// @notice Unpause all token transfers
    function unpause() external onlyRole(PAUSER_ROLE) {
        _unpause();
    }
} 