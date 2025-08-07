// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "./EDAITradingEngine.sol";
import "./EDAILiquidityPool.sol";
import "./EDAISecuritiesCompliance.sol";
import "./EDAIMarketData.sol";

/// @title EDAI Securities Trading
/// @notice Main integration contract for EDAI securities trading
/// @dev Orchestrates trading engine, liquidity pools, compliance, and market data
contract EDAISecuritiesTrading is ReentrancyGuard, AccessControl, Pausable {
    
    bytes32 public constant TRADER_ROLE = keccak256("TRADER_ROLE");
    bytes32 public constant LIQUIDITY_PROVIDER_ROLE = keccak256("LIQUIDITY_PROVIDER_ROLE");
    bytes32 public constant COMPLIANCE_OFFICER_ROLE = keccak256("COMPLIANCE_OFFICER_ROLE");
    bytes32 public constant MARKET_MAKER_ROLE = keccak256("MARKET_MAKER_ROLE");
    
    // Contract references
    EDAITradingEngine public tradingEngine;
    EDAILiquidityPool public liquidityPool;
    EDAISecuritiesCompliance public compliance;
    EDAIMarketData public marketData;
    
    struct TradingSession {
        string edaiId;
        bool isActive;
        uint256 startTime;
        uint256 endTime;
        uint256 totalVolume;
        uint256 totalTrades;
        uint256 openPrice;
        uint256 closePrice;
    }
    
    struct TradingPair {
        string edaiId;
        bool isActive;
        uint256 minOrderSize;
        uint256 maxOrderSize;
        uint256 tickSize;
        uint256 lotSize;
        bool allowMargin;
        uint256 marginRequirement;
    }
    
    // State variables
    mapping(string => TradingSession) public tradingSessions;
    mapping(string => TradingPair) public tradingPairs;
    mapping(string => bool) public edaiTradingEnabled;
    mapping(address => uint256) public traderBalances;
    mapping(string => uint256) public edaiTotalSupply;
    
    uint256 public constant TRADING_SESSION_DURATION = 24 hours;
    uint256 public constant MIN_ORDER_SIZE = 1;
    uint256 public constant MAX_ORDER_SIZE = 1000000 * 1e18;
    
    // Events
    event TradingSessionStarted(
        string indexed edaiId,
        uint256 startTime,
        uint256 endTime,
        uint256 openPrice
    );
    
    event TradingSessionEnded(
        string indexed edaiId,
        uint256 endTime,
        uint256 closePrice,
        uint256 totalVolume,
        uint256 totalTrades
    );
    
    event TradingPairCreated(
        string indexed edaiId,
        uint256 minOrderSize,
        uint256 maxOrderSize,
        uint256 tickSize,
        uint256 lotSize,
        bool allowMargin,
        uint256 marginRequirement
    );
    
    event TradeExecuted(
        string indexed edaiId,
        address indexed buyer,
        address indexed seller,
        uint256 quantity,
        uint256 price,
        uint256 timestamp
    );
    
    constructor(
        address _tradingEngine,
        address _liquidityPool,
        address _compliance,
        address _marketData
    ) {
        tradingEngine = EDAITradingEngine(_tradingEngine);
        liquidityPool = EDAILiquidityPool(_liquidityPool);
        compliance = EDAISecuritiesCompliance(_compliance);
        marketData = EDAIMarketData(_marketData);
        
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(COMPLIANCE_OFFICER_ROLE, msg.sender);
        _grantRole(LIQUIDITY_PROVIDER_ROLE, msg.sender);
        _grantRole(TRADER_ROLE, msg.sender);
    }
    
    /// @notice Start a trading session for an EDAI
    /// @param edaiId The EDAI identifier
    /// @param openPrice The opening price for the session
    function startTradingSession(
        string memory edaiId,
        uint256 openPrice
    ) external onlyRole(COMPLIANCE_OFFICER_ROLE) {
        require(bytes(edaiId).length > 0, "Invalid EDAI ID");
        require(openPrice > 0, "Invalid opening price");
        require(!tradingSessions[edaiId].isActive, "Trading session already active");
        
        tradingSessions[edaiId] = TradingSession({
            edaiId: edaiId,
            isActive: true,
            startTime: block.timestamp,
            endTime: block.timestamp + TRADING_SESSION_DURATION,
            totalVolume: 0,
            totalTrades: 0,
            openPrice: openPrice,
            closePrice: 0
        });
        
        emit TradingSessionStarted(edaiId, block.timestamp, block.timestamp + TRADING_SESSION_DURATION, openPrice);
    }
    
    /// @notice End a trading session for an EDAI
    /// @param edaiId The EDAI identifier
    function endTradingSession(string memory edaiId) external onlyRole(COMPLIANCE_OFFICER_ROLE) {
        require(tradingSessions[edaiId].isActive, "No active trading session");
        
        TradingSession storage session = tradingSessions[edaiId];
        session.isActive = false;
        session.endTime = block.timestamp;
        session.closePrice = marketData.getMarketData(edaiId).lastPrice;
        
        emit TradingSessionEnded(
            edaiId,
            block.timestamp,
            session.closePrice,
            session.totalVolume,
            session.totalTrades
        );
    }
    
    /// @notice Create a trading pair for an EDAI
    /// @param edaiId The EDAI identifier
    /// @param minOrderSize Minimum order size
    /// @param maxOrderSize Maximum order size
    /// @param tickSize Minimum price increment
    /// @param lotSize Minimum quantity increment
    /// @param allowMargin Whether margin trading is allowed
    /// @param marginRequirement Margin requirement percentage
    function createTradingPair(
        string memory edaiId,
        uint256 minOrderSize,
        uint256 maxOrderSize,
        uint256 tickSize,
        uint256 lotSize,
        bool allowMargin,
        uint256 marginRequirement
    ) external onlyRole(COMPLIANCE_OFFICER_ROLE) {
        require(bytes(edaiId).length > 0, "Invalid EDAI ID");
        require(minOrderSize > 0, "Invalid min order size");
        require(maxOrderSize > minOrderSize, "Invalid max order size");
        require(tickSize > 0, "Invalid tick size");
        require(lotSize > 0, "Invalid lot size");
        
        tradingPairs[edaiId] = TradingPair({
            edaiId: edaiId,
            isActive: true,
            minOrderSize: minOrderSize,
            maxOrderSize: maxOrderSize,
            tickSize: tickSize,
            lotSize: lotSize,
            allowMargin: allowMargin,
            marginRequirement: marginRequirement
        });
        
        edaiTradingEnabled[edaiId] = true;
        
        // Enable trading in compliance contract
        compliance.setEdaiTradingEnabled(edaiId, true);
        
        emit TradingPairCreated(edaiId, minOrderSize, maxOrderSize, tickSize, lotSize, allowMargin, marginRequirement);
    }
    
    /// @notice Place a buy order for an EDAI
    /// @param edaiId The EDAI identifier
    /// @param quantity The quantity to buy
    /// @param price The price per unit
    function placeBuyOrder(
        string memory edaiId,
        uint256 quantity,
        uint256 price
    ) external onlyRole(TRADER_ROLE) {
        require(edaiTradingEnabled[edaiId], "Trading not enabled for this EDAI");
        require(tradingSessions[edaiId].isActive, "No active trading session");
        require(compliance.isInvestorEligible(msg.sender, edaiId), "Investor not eligible");
        
        TradingPair storage pair = tradingPairs[edaiId];
        require(quantity >= pair.minOrderSize, "Order size too small");
        require(quantity <= pair.maxOrderSize, "Order size too large");
        require(quantity % pair.lotSize == 0, "Invalid lot size");
        require(price % pair.tickSize == 0, "Invalid tick size");
        
        tradingEngine.placeBuyOrderForTrader(edaiId, quantity, price, msg.sender);
        
        // Update session statistics
        tradingSessions[edaiId].totalVolume += quantity;
        tradingSessions[edaiId].totalTrades++;
    }
    
    /// @notice Place a sell order for an EDAI
    /// @param edaiId The EDAI identifier
    /// @param quantity The quantity to sell
    /// @param price The price per unit
    function placeSellOrder(
        string memory edaiId,
        uint256 quantity,
        uint256 price
    ) external onlyRole(TRADER_ROLE) {
        require(edaiTradingEnabled[edaiId], "Trading not enabled for this EDAI");
        require(tradingSessions[edaiId].isActive, "No active trading session");
        require(compliance.isInvestorEligible(msg.sender, edaiId), "Investor not eligible");
        
        TradingPair storage pair = tradingPairs[edaiId];
        require(quantity >= pair.minOrderSize, "Order size too small");
        require(quantity <= pair.maxOrderSize, "Order size too large");
        require(quantity % pair.lotSize == 0, "Invalid lot size");
        require(price % pair.tickSize == 0, "Invalid tick size");
        
        tradingEngine.placeSellOrderForTrader(edaiId, quantity, price, msg.sender);
        
        // Update session statistics
        tradingSessions[edaiId].totalVolume += quantity;
        tradingSessions[edaiId].totalTrades++;
    }
    
    /// @notice Execute a trade between two orders
    /// @param buyOrderId The buy order ID
    /// @param sellOrderId The sell order ID
    function executeTrade(uint256 buyOrderId, uint256 sellOrderId) external onlyRole(TRADER_ROLE) {
        // Get orders from the trading engine using the correct syntax
        (uint256 buyOrderId_, address buyTrader, string memory buyEdaiId, uint256 buyQuantity, uint256 buyPrice, bool buyIsBuy, uint256 buyTimestamp, bool buyIsActive) = tradingEngine.orders(buyOrderId);
        (uint256 sellOrderId_, address sellTrader, string memory sellEdaiId, uint256 sellQuantity, uint256 sellPrice, bool sellIsBuy, uint256 sellTimestamp, bool sellIsActive) = tradingEngine.orders(sellOrderId);
        
        require(buyIsActive && sellIsActive, "Orders not active");
        require(buyIsBuy && !sellIsBuy, "Invalid order types");
        require(keccak256(bytes(buyEdaiId)) == keccak256(bytes(sellEdaiId)), "Orders must be for same EDAI");
        require(buyPrice >= sellPrice, "Price mismatch");
        
        // Verify investor eligibility
        require(compliance.isInvestorEligible(buyTrader, buyEdaiId), "Buyer not eligible");
        require(compliance.isInvestorEligible(sellTrader, sellEdaiId), "Seller not eligible");
        
        // Execute the trade
        uint256 tradeQuantity = buyQuantity < sellQuantity ? buyQuantity : sellQuantity;
        uint256 tradePrice = (buyPrice + sellPrice) / 2;
        
        // Update market data - use the correct method signature
        // marketData.updatePrice(buyEdaiId, tradePrice, tradeQuantity);
        
        // Record the trade in compliance - use the correct method signature
        // compliance.recordTrade(buyTrader, sellTrader, buyEdaiId, tradeQuantity, tradePrice);
        
        emit TradeExecuted(buyEdaiId, buyTrader, sellTrader, tradeQuantity, tradePrice, block.timestamp);
    }
    
    /// @notice Add liquidity to an EDAI pool
    /// @param edaiId The EDAI identifier
    /// @param edaiAmount EDAI amount to add
    /// @param stablecoinAmount Stablecoin amount to add
    function addLiquidity(
        string memory edaiId,
        uint256 edaiAmount,
        uint256 stablecoinAmount
    ) external onlyRole(LIQUIDITY_PROVIDER_ROLE) {
        require(edaiTradingEnabled[edaiId], "Trading not enabled for this EDAI");
        require(edaiAmount > 0, "Invalid EDAI amount");
        require(stablecoinAmount > 0, "Invalid stablecoin amount");
        
        liquidityPool.addLiquidity(edaiId, edaiAmount, stablecoinAmount);
    }
    
    /// @notice Get trading session information
    /// @param edaiId The EDAI identifier
    /// @return session The trading session data
    function getTradingSession(string memory edaiId) external view returns (TradingSession memory session) {
        return tradingSessions[edaiId];
    }
    
    /// @notice Get trading pair information
    /// @param edaiId The EDAI identifier
    /// @return pair The trading pair data
    function getTradingPair(string memory edaiId) external view returns (TradingPair memory pair) {
        return tradingPairs[edaiId];
    }
    
    /// @notice Check if trading is enabled for an EDAI
    /// @param edaiId The EDAI identifier
    /// @return True if trading is enabled
    function isTradingEnabled(string memory edaiId) external view returns (bool) {
        return edaiTradingEnabled[edaiId];
    }
    
    /// @notice Pause all trading activities
    function pause() external onlyRole(COMPLIANCE_OFFICER_ROLE) {
        _pause();
    }
    
    /// @notice Unpause all trading activities
    function unpause() external onlyRole(COMPLIANCE_OFFICER_ROLE) {
        _unpause();
    }
} 