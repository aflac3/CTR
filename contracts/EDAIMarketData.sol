// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/// @title EDAI Market Data
/// @notice Manages price feeds and market analytics for EDAI trading
/// @dev Implements market data aggregation and analytics
contract EDAIMarketData is ReentrancyGuard, AccessControl, Pausable {
    bytes32 public constant PRICE_FEED_ROLE = keccak256("PRICE_FEED_ROLE");
    bytes32 public constant ANALYST_ROLE = keccak256("ANALYST_ROLE");
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");

    struct PriceFeed {
        string edaiId;
        uint256 price;
        uint256 timestamp;
        address provider;
        bool isActive;
    }

    struct MarketData {
        string edaiId;
        uint256 lastPrice;
        uint256 volume24h;
        uint256 high24h;
        uint256 low24h;
        uint256 priceChange24h;
        uint256 volatility;
        uint256 liquidityScore;
        uint256 lastUpdateTime;
    }

    struct Alert {
        string edaiId;
        AlertType alertType;
        string message;
        uint256 timestamp;
        bool isActive;
    }

    struct WatchlistEntry {
        string edaiId;
        uint256 addedTime;
        bool isActive;
    }

    enum AlertType {
        PRICE_SPIKE,
        VOLUME_SURGE,
        LIQUIDITY_DROP,
        VOLATILITY_INCREASE,
        TECHNICAL_BREAKOUT,
        NEWS_EVENT
    }

    // Storage
    mapping(string => PriceFeed[]) public priceFeeds;
    mapping(string => MarketData) public marketData;
    mapping(string => Alert[]) public alerts;
    mapping(address => WatchlistEntry[]) public traderWatchlist;
    mapping(string => uint256) public lastPriceUpdate;
    mapping(string => uint256) public volatilityWindow;

    // Constants
    uint256 public constant MAX_PRICE_FEEDS = 10;
    uint256 public constant PRICE_UPDATE_INTERVAL = 300; // 5 minutes
    uint256 public constant VOLATILITY_WINDOW = 24 hours;
    uint256 public constant MAX_ALERTS_PER_EDAI = 50;

    // Events
    event PriceUpdated(
        string indexed edaiId,
        uint256 oldPrice,
        uint256 newPrice,
        address indexed provider,
        uint256 timestamp
    );

    event MarketDataUpdated(
        string indexed edaiId,
        uint256 volume24h,
        uint256 high24h,
        uint256 low24h,
        uint256 volatility,
        uint256 timestamp
    );

    event AlertCreated(
        string indexed edaiId,
        AlertType alertType,
        string message,
        uint256 timestamp
    );

    event AlertResolved(
        string indexed edaiId,
        AlertType alertType,
        uint256 timestamp
    );

    event WatchlistAdded(
        address indexed trader,
        string indexed edaiId,
        uint256 timestamp
    );

    event WatchlistRemoved(
        address indexed trader,
        string indexed edaiId,
        uint256 timestamp
    );

    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(PRICE_FEED_ROLE, msg.sender);
        _grantRole(ANALYST_ROLE, msg.sender);
        _grantRole(OPERATOR_ROLE, msg.sender);
    }

    /// @notice Update price feed for an EDAI
    /// @param edaiId The EDAI identifier
    /// @param price The new price
    function updatePrice(
        string memory edaiId,
        uint256 price
    ) external onlyRole(PRICE_FEED_ROLE) whenNotPaused {
        require(bytes(edaiId).length > 0, "Invalid EDAI ID");
        require(price > 0, "Invalid price");

        uint256 oldPrice = marketData[edaiId].lastPrice;
        
        // Add new price feed
        PriceFeed memory newFeed = PriceFeed({
            edaiId: edaiId,
            price: price,
            timestamp: block.timestamp,
            provider: msg.sender,
            isActive: true
        });

        priceFeeds[edaiId].push(newFeed);

        // Keep only the latest MAX_PRICE_FEEDS
        if (priceFeeds[edaiId].length > MAX_PRICE_FEEDS) {
            // Remove oldest feed
            for (uint256 i = 0; i < priceFeeds[edaiId].length - 1; i++) {
                priceFeeds[edaiId][i] = priceFeeds[edaiId][i + 1];
            }
            priceFeeds[edaiId].pop();
        }

        // Update market data
        _updateMarketData(edaiId, price);

        emit PriceUpdated(edaiId, oldPrice, price, msg.sender, block.timestamp);
    }

    /// @notice Update market data for an EDAI
    /// @param edaiId The EDAI identifier
    /// @param price The current price
    function _updateMarketData(string memory edaiId, uint256 price) internal {
        MarketData storage data = marketData[edaiId];
        
        uint256 oldPrice = data.lastPrice;
        data.lastPrice = price;
        data.lastUpdateTime = block.timestamp;

        // Update 24h high/low
        if (price > data.high24h || data.high24h == 0) {
            data.high24h = price;
        }
        if (price < data.low24h || data.low24h == 0) {
            data.low24h = price;
        }

        // Calculate price change
        if (oldPrice > 0) {
            data.priceChange24h = price > oldPrice ? price - oldPrice : oldPrice - price;
        }

        // Calculate volatility (simplified)
        data.volatility = _calculateVolatility(edaiId);

        // Calculate liquidity score (simplified)
        data.liquidityScore = _calculateLiquidityScore(edaiId);

        emit MarketDataUpdated(edaiId, data.volume24h, data.high24h, data.low24h, data.volatility, block.timestamp);
    }

    /// @notice Calculate volatility for an EDAI
    /// @param edaiId The EDAI identifier
    /// @return volatility The calculated volatility
    function _calculateVolatility(string memory edaiId) internal view returns (uint256 volatility) {
        PriceFeed[] storage feeds = priceFeeds[edaiId];
        if (feeds.length < 2) return 0;

        uint256 sum = 0;
        uint256 count = 0;

        for (uint256 i = 1; i < feeds.length; i++) {
            if (feeds[i].timestamp >= block.timestamp - VOLATILITY_WINDOW) {
                uint256 priceChange = feeds[i].price > feeds[i-1].price ? 
                    feeds[i].price - feeds[i-1].price : 
                    feeds[i-1].price - feeds[i].price;
                sum += priceChange;
                count++;
            }
        }

        return count > 0 ? sum / count : 0;
    }

    /// @notice Calculate liquidity score for an EDAI
    /// @param edaiId The EDAI identifier
    /// @return liquidityScore The calculated liquidity score
    function _calculateLiquidityScore(string memory edaiId) internal view returns (uint256 liquidityScore) {
        // Simplified liquidity score based on price feed frequency and volume
        PriceFeed[] storage feeds = priceFeeds[edaiId];
        uint256 recentFeeds = 0;

        for (uint256 i = 0; i < feeds.length; i++) {
            if (feeds[i].timestamp >= block.timestamp - 1 hours) {
                recentFeeds++;
            }
        }

        return recentFeeds * 100; // Score based on recent feed frequency
    }

    /// @notice Create a market alert
    /// @param edaiId The EDAI identifier
    /// @param alertType The type of alert
    /// @param message The alert message
    function createAlert(
        string memory edaiId,
        AlertType alertType,
        string memory message
    ) external onlyRole(ANALYST_ROLE) whenNotPaused {
        require(bytes(edaiId).length > 0, "Invalid EDAI ID");
        require(bytes(message).length > 0, "Message required");

        Alert memory newAlert = Alert({
            edaiId: edaiId,
            alertType: alertType,
            message: message,
            timestamp: block.timestamp,
            isActive: true
        });

        alerts[edaiId].push(newAlert);

        // Keep only the latest MAX_ALERTS_PER_EDAI
        if (alerts[edaiId].length > MAX_ALERTS_PER_EDAI) {
            // Remove oldest alert
            for (uint256 i = 0; i < alerts[edaiId].length - 1; i++) {
                alerts[edaiId][i] = alerts[edaiId][i + 1];
            }
            alerts[edaiId].pop();
        }

        emit AlertCreated(edaiId, alertType, message, block.timestamp);
    }

    /// @notice Resolve an alert
    /// @param edaiId The EDAI identifier
    /// @param alertIndex The index of the alert to resolve
    function resolveAlert(
        string memory edaiId,
        uint256 alertIndex
    ) external onlyRole(ANALYST_ROLE) whenNotPaused {
        require(alertIndex < alerts[edaiId].length, "Invalid alert index");
        require(alerts[edaiId][alertIndex].isActive, "Alert already resolved");

        alerts[edaiId][alertIndex].isActive = false;

        emit AlertResolved(edaiId, alerts[edaiId][alertIndex].alertType, block.timestamp);
    }

    /// @notice Add EDAI to trader's watchlist
    /// @param edaiId The EDAI identifier
    function addToWatchlist(string memory edaiId) external whenNotPaused {
        require(bytes(edaiId).length > 0, "Invalid EDAI ID");

        WatchlistEntry[] storage watchlist = traderWatchlist[msg.sender];

        // Check if already in watchlist
        for (uint256 i = 0; i < watchlist.length; i++) {
            if (keccak256(bytes(watchlist[i].edaiId)) == keccak256(bytes(edaiId)) && watchlist[i].isActive) {
                return; // Already in watchlist
            }
        }

        WatchlistEntry memory newEntry = WatchlistEntry({
            edaiId: edaiId,
            addedTime: block.timestamp,
            isActive: true
        });

        watchlist.push(newEntry);

        emit WatchlistAdded(msg.sender, edaiId, block.timestamp);
    }

    /// @notice Add EDAI to trader's watchlist (called by external contracts)
    /// @param trader The trader's address
    /// @param edaiId The EDAI identifier
    function addToWatchlistForTrader(address trader, string memory edaiId) external {
        require(bytes(edaiId).length > 0, "Invalid EDAI ID");
        require(trader != address(0), "Invalid trader address");

        WatchlistEntry[] storage watchlist = traderWatchlist[trader];

        // Check if already in watchlist
        for (uint256 i = 0; i < watchlist.length; i++) {
            if (keccak256(bytes(watchlist[i].edaiId)) == keccak256(bytes(edaiId))) {
                return; // Already in watchlist
            }
        }

        WatchlistEntry memory newEntry = WatchlistEntry({
            edaiId: edaiId,
            addedTime: block.timestamp,
            isActive: true
        });

        watchlist.push(newEntry);

        emit WatchlistAdded(trader, edaiId, block.timestamp);
    }

    /// @notice Remove EDAI from trader's watchlist
    /// @param edaiId The EDAI identifier
    function removeFromWatchlist(string memory edaiId) external whenNotPaused {
        require(bytes(edaiId).length > 0, "Invalid EDAI ID");

        WatchlistEntry[] storage watchlist = traderWatchlist[msg.sender];

        for (uint256 i = 0; i < watchlist.length; i++) {
            if (keccak256(bytes(watchlist[i].edaiId)) == keccak256(bytes(edaiId)) && watchlist[i].isActive) {
                watchlist[i].isActive = false;
                emit WatchlistRemoved(msg.sender, edaiId, block.timestamp);
                break;
            }
        }
    }

    /// @notice Get market data for an EDAI
    /// @param edaiId The EDAI identifier
    /// @return Market data
    function getMarketData(string memory edaiId) external view returns (MarketData memory) {
        return marketData[edaiId];
    }

    /// @notice Get price feeds for an EDAI
    /// @param edaiId The EDAI identifier
    /// @return Array of price feeds
    function getPriceFeeds(string memory edaiId) external view returns (PriceFeed[] memory) {
        return priceFeeds[edaiId];
    }

    /// @notice Get alerts for an EDAI
    /// @param edaiId The EDAI identifier
    /// @return Array of alerts
    function getAlerts(string memory edaiId) external view returns (Alert[] memory) {
        return alerts[edaiId];
    }

    /// @notice Get trader's watchlist
    /// @param trader The trader's address
    /// @return Array of watchlist entries
    function getWatchlist(address trader) external view returns (WatchlistEntry[] memory) {
        return traderWatchlist[trader];
    }

    /// @notice Get active alerts for an EDAI
    /// @param edaiId The EDAI identifier
    /// @return Array of active alerts
    function getActiveAlerts(string memory edaiId) external view returns (Alert[] memory) {
        Alert[] storage allAlerts = alerts[edaiId];
        Alert[] memory activeAlerts = new Alert[](allAlerts.length);
        uint256 activeCount = 0;

        for (uint256 i = 0; i < allAlerts.length; i++) {
            if (allAlerts[i].isActive) {
                activeAlerts[activeCount] = allAlerts[i];
                activeCount++;
            }
        }

        // Resize array to actual active count
        assembly {
            mstore(activeAlerts, activeCount)
        }

        return activeAlerts;
    }

    /// @notice Check for alerts based on market conditions
    /// @param edaiId The EDAI identifier
    function _checkAlerts(string memory edaiId) internal {
        MarketData storage data = marketData[edaiId];
        
        // Check for price spikes
        if (data.priceChange24h > data.lastPrice / 10) { // 10% price change
            _createSystemAlert(edaiId, AlertType.PRICE_SPIKE, "Significant price movement detected");
        }

        // Check for volatility increase
        if (data.volatility > data.lastPrice / 20) { // 5% volatility
            _createSystemAlert(edaiId, AlertType.VOLATILITY_INCREASE, "High volatility detected");
        }

        // Check for liquidity drop
        if (data.liquidityScore < 100) {
            _createSystemAlert(edaiId, AlertType.LIQUIDITY_DROP, "Low liquidity detected");
        }
    }

    /// @notice Create a system alert
    /// @param edaiId The EDAI identifier
    /// @param alertType The type of alert
    /// @param message The alert message
    function _createSystemAlert(
        string memory edaiId,
        AlertType alertType,
        string memory message
    ) internal {
        Alert memory newAlert = Alert({
            edaiId: edaiId,
            alertType: alertType,
            message: message,
            timestamp: block.timestamp,
            isActive: true
        });

        alerts[edaiId].push(newAlert);

        if (alerts[edaiId].length > MAX_ALERTS_PER_EDAI) {
            // Remove oldest alert
            for (uint256 i = 0; i < alerts[edaiId].length - 1; i++) {
                alerts[edaiId][i] = alerts[edaiId][i + 1];
            }
            alerts[edaiId].pop();
        }

        emit AlertCreated(edaiId, alertType, message, block.timestamp);
    }

    /// @notice Update volume for an EDAI
    /// @param edaiId The EDAI identifier
    /// @param volume The volume to add
    function updateVolume(string memory edaiId, uint256 volume) external onlyRole(PRICE_FEED_ROLE) whenNotPaused {
        require(bytes(edaiId).length > 0, "Invalid EDAI ID");

        marketData[edaiId].volume24h += volume;
        marketData[edaiId].lastUpdateTime = block.timestamp;

        // Check for volume surge
        if (volume > marketData[edaiId].volume24h / 2) { // 50% of daily volume
            _createSystemAlert(edaiId, AlertType.VOLUME_SURGE, "Unusual trading volume detected");
        }
    }

    /// @notice Get historical price data for an EDAI
    /// @param edaiId The EDAI identifier
    /// @param hoursBack The number of hours to look back
    /// @return Array of historical prices
    function getHistoricalPrices(string memory edaiId, uint256 hoursBack) external view returns (uint256[] memory) {
        require(hoursBack > 0 && hoursBack <= 168, "Invalid hours"); // Max 1 week

        PriceFeed[] storage feeds = priceFeeds[edaiId];
        uint256[] memory historicalPrices = new uint256[](feeds.length);
        uint256 count = 0;

        for (uint256 i = 0; i < feeds.length; i++) {
            if (feeds[i].timestamp >= block.timestamp - (hoursBack * 1 hours)) {
                historicalPrices[count] = feeds[i].price;
                count++;
            }
        }

        // Resize array to actual count
        assembly {
            mstore(historicalPrices, count)
        }

        return historicalPrices;
    }
} 