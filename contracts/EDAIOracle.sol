// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/// @title EDAI Oracle Contract
/// @notice Provides external data feeds for energy prices, market data, and grid status
/// @dev Integrates with external oracles and data providers
contract EDAIOracle is ReentrancyGuard, AccessControl, Pausable {
    bytes32 public constant ORACLE_PROVIDER_ROLE = keccak256("ORACLE_PROVIDER_ROLE");
    bytes32 public constant VALIDATOR_ROLE = keccak256("VALIDATOR_ROLE");
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");

    struct PriceFeed {
        string feedId;
        uint256 price;
        uint256 timestamp;
        address provider;
        bool isActive;
        uint256 heartbeat;
        uint256 deviationThreshold;
    }

    struct GridStatus {
        string gridId;
        bool isStable;
        uint256 loadPercentage;
        uint256 frequency;
        uint256 voltage;
        uint256 timestamp;
        string status;
    }

    struct EnergyData {
        string edaiId;
        uint256 energyPrice;
        uint256 demand;
        uint256 supply;
        uint256 gridStability;
        uint256 timestamp;
    }

    // Storage
    mapping(string => PriceFeed) public priceFeeds;
    mapping(string => GridStatus) public gridStatus;
    mapping(string => EnergyData) public energyData;
    mapping(address => bool) public authorizedProviders;
    mapping(string => uint256) public lastUpdateTime;
    mapping(string => uint256) public priceHistory;

    // Events
    event PriceFeedUpdated(
        string indexed feedId,
        uint256 oldPrice,
        uint256 newPrice,
        address indexed provider,
        uint256 timestamp
    );

    event GridStatusUpdated(
        string indexed gridId,
        bool isStable,
        uint256 loadPercentage,
        uint256 timestamp
    );

    event EnergyDataUpdated(
        string indexed edaiId,
        uint256 energyPrice,
        uint256 demand,
        uint256 supply,
        uint256 timestamp
    );

    event OracleProviderAuthorized(
        address indexed provider,
        bool authorized,
        uint256 timestamp
    );

    // Constants
    uint256 public constant MAX_PRICE_DEVIATION = 50; // 50% max deviation
    uint256 public constant HEARTBEAT_TIMEOUT = 1 hours;
    uint256 public constant MIN_VALIDATORS = 2;

    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ORACLE_PROVIDER_ROLE, msg.sender);
        _grantRole(VALIDATOR_ROLE, msg.sender);
        _grantRole(OPERATOR_ROLE, msg.sender);
    }

    /// @notice Update price feed data
    /// @param feedId The feed identifier
    /// @param price The new price
    /// @param timestamp The timestamp of the price
    function updatePriceFeed(
        string memory feedId,
        uint256 price,
        uint256 timestamp
    ) external onlyRole(ORACLE_PROVIDER_ROLE) whenNotPaused {
        require(bytes(feedId).length > 0, "Invalid feed ID");
        require(price > 0, "Invalid price");
        require(timestamp > 0, "Invalid timestamp");
        require(authorizedProviders[msg.sender], "Provider not authorized");

        PriceFeed storage feed = priceFeeds[feedId];
        uint256 oldPrice = feed.price;

        // Check for price deviation
        if (oldPrice > 0) {
            uint256 deviation = _calculateDeviation(oldPrice, price);
            require(deviation <= MAX_PRICE_DEVIATION, "Price deviation too high");
        }

        feed.feedId = feedId;
        feed.price = price;
        feed.timestamp = timestamp;
        feed.provider = msg.sender;
        feed.isActive = true;
        feed.heartbeat = block.timestamp;

        lastUpdateTime[feedId] = block.timestamp;
        priceHistory[feedId] = price;

        emit PriceFeedUpdated(feedId, oldPrice, price, msg.sender, timestamp);
    }

    /// @notice Update grid status
    /// @param gridId The grid identifier
    /// @param isStable Whether the grid is stable
    /// @param loadPercentage Current load percentage
    /// @param frequency Grid frequency
    /// @param voltage Grid voltage
    /// @param status Status description
    function updateGridStatus(
        string memory gridId,
        bool isStable,
        uint256 loadPercentage,
        uint256 frequency,
        uint256 voltage,
        string memory status
    ) external onlyRole(ORACLE_PROVIDER_ROLE) whenNotPaused {
        require(bytes(gridId).length > 0, "Invalid grid ID");
        require(loadPercentage <= 100, "Invalid load percentage");
        require(authorizedProviders[msg.sender], "Provider not authorized");

        GridStatus storage grid = gridStatus[gridId];
        grid.gridId = gridId;
        grid.isStable = isStable;
        grid.loadPercentage = loadPercentage;
        grid.frequency = frequency;
        grid.voltage = voltage;
        grid.timestamp = block.timestamp;
        grid.status = status;

        emit GridStatusUpdated(gridId, isStable, loadPercentage, block.timestamp);
    }

    /// @notice Update energy data for an EDAI
    /// @param edaiId The EDAI identifier
    /// @param energyPrice The energy price
    /// @param demand Current demand
    /// @param supply Current supply
    /// @param gridStability Grid stability score
    function updateEnergyData(
        string memory edaiId,
        uint256 energyPrice,
        uint256 demand,
        uint256 supply,
        uint256 gridStability
    ) external onlyRole(ORACLE_PROVIDER_ROLE) whenNotPaused {
        require(bytes(edaiId).length > 0, "Invalid EDAI ID");
        require(energyPrice > 0, "Invalid energy price");
        require(authorizedProviders[msg.sender], "Provider not authorized");

        EnergyData storage data = energyData[edaiId];
        data.edaiId = edaiId;
        data.energyPrice = energyPrice;
        data.demand = demand;
        data.supply = supply;
        data.gridStability = gridStability;
        data.timestamp = block.timestamp;

        emit EnergyDataUpdated(edaiId, energyPrice, demand, supply, block.timestamp);
    }

    /// @notice Authorize an oracle provider
    /// @param provider The provider address
    /// @param authorized Whether to authorize
    function authorizeProvider(address provider, bool authorized) external onlyRole(OPERATOR_ROLE) {
        require(provider != address(0), "Invalid provider address");
        authorizedProviders[provider] = authorized;

        emit OracleProviderAuthorized(provider, authorized, block.timestamp);
    }

    /// @notice Get price feed data
    /// @param feedId The feed identifier
    /// @return Price feed data
    function getPriceFeed(string memory feedId) external view returns (PriceFeed memory) {
        return priceFeeds[feedId];
    }

    /// @notice Get grid status
    /// @param gridId The grid identifier
    /// @return Grid status data
    function getGridStatus(string memory gridId) external view returns (GridStatus memory) {
        return gridStatus[gridId];
    }

    /// @notice Get energy data for an EDAI
    /// @param edaiId The EDAI identifier
    /// @return Energy data
    function getEnergyData(string memory edaiId) external view returns (EnergyData memory) {
        return energyData[edaiId];
    }

    /// @notice Check if a price feed is stale
    /// @param feedId The feed identifier
    /// @return Whether the feed is stale
    function isPriceFeedStale(string memory feedId) external view returns (bool) {
        PriceFeed storage feed = priceFeeds[feedId];
        return feed.isActive && (block.timestamp - feed.heartbeat) > HEARTBEAT_TIMEOUT;
    }

    /// @notice Calculate price deviation
    /// @param oldPrice The old price
    /// @param newPrice The new price
    /// @return Deviation percentage
    function _calculateDeviation(uint256 oldPrice, uint256 newPrice) internal pure returns (uint256) {
        if (oldPrice == 0) return 0;
        
        uint256 difference = oldPrice > newPrice ? oldPrice - newPrice : newPrice - oldPrice;
        return (difference * 100) / oldPrice;
    }

    /// @notice Get latest price for a feed
    /// @param feedId The feed identifier
    /// @return Latest price
    function getLatestPrice(string memory feedId) external view returns (uint256) {
        return priceFeeds[feedId].price;
    }

    /// @notice Check if grid is stable
    /// @param gridId The grid identifier
    /// @return Whether the grid is stable
    function isGridStable(string memory gridId) external view returns (bool) {
        return gridStatus[gridId].isStable;
    }
} 