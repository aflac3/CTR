// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/// @title EDAI Trading Engine
/// @notice Handles order book management and trade execution for EDAI securities
/// @dev Implements order matching and trade execution logic
contract EDAITradingEngine is ReentrancyGuard, AccessControl, Pausable {
    bytes32 public constant TRADER_ROLE = keccak256("TRADER_ROLE");
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");

    struct Order {
        uint256 orderId;
        address trader;
        string edaiId;
        uint256 quantity;
        uint256 price;
        bool isBuy;
        uint256 timestamp;
        bool isActive;
    }

    struct Trade {
        uint256 tradeId;
        uint256 buyOrderId;
        uint256 sellOrderId;
        string edaiId;
        uint256 quantity;
        uint256 price;
        address buyer;
        address seller;
        uint256 timestamp;
    }

    enum OrderStatus {
        PENDING,
        FILLED,
        CANCELLED,
        PARTIALLY_FILLED
    }

    // Order book storage
    mapping(string => Order[]) public buyOrders;
    mapping(string => Order[]) public sellOrders;
    mapping(uint256 => Order) public orders;
    mapping(uint256 => Trade) public trades;
    mapping(address => uint256[]) public traderOrders;

    // Market data
    mapping(string => uint256) public lastPrice;
    mapping(string => uint256) public volume24h;
    mapping(string => uint256) public high24h;
    mapping(string => uint256) public low24h;

    // Counters
    uint256 public orderIdCounter;
    uint256 public tradeIdCounter;

    // Constants
    uint256 public constant MAX_ORDERS_PER_EDAI = 1000;
    uint256 public constant MIN_ORDER_SIZE = 1;
    uint256 public constant MAX_ORDER_SIZE = 1000000;

    // Events
    event OrderPlaced(
        uint256 indexed orderId,
        address indexed trader,
        string indexed edaiId,
        uint256 quantity,
        uint256 price,
        bool isBuy,
        uint256 timestamp
    );

    event OrderCancelled(
        uint256 indexed orderId,
        address indexed trader,
        string indexed edaiId,
        uint256 timestamp
    );

    event TradeExecuted(
        uint256 indexed tradeId,
        uint256 indexed buyOrderId,
        uint256 indexed sellOrderId,
        string edaiId,
        uint256 quantity,
        uint256 price,
        address buyer,
        address seller,
        uint256 timestamp
    );

    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(OPERATOR_ROLE, msg.sender);
    }

    /// @notice Place a buy order
    /// @param edaiId The EDAI identifier
    /// @param quantity The quantity to buy
    /// @param price The price per unit
    function placeBuyOrder(
        string memory edaiId,
        uint256 quantity,
        uint256 price
    ) external onlyRole(TRADER_ROLE) whenNotPaused {
        _placeBuyOrder(edaiId, quantity, price, msg.sender);
    }

    /// @notice Place a buy order for a specific trader
    /// @param edaiId The EDAI identifier
    /// @param quantity The quantity to buy
    /// @param price The price per unit
    /// @param trader The trader address
    function placeBuyOrderForTrader(
        string memory edaiId,
        uint256 quantity,
        uint256 price,
        address trader
    ) external onlyRole(TRADER_ROLE) whenNotPaused {
        _placeBuyOrder(edaiId, quantity, price, trader);
    }

    /// @notice Place a sell order
    /// @param edaiId The EDAI identifier
    /// @param quantity The quantity to sell
    /// @param price The price per unit
    function placeSellOrder(
        string memory edaiId,
        uint256 quantity,
        uint256 price
    ) external onlyRole(TRADER_ROLE) whenNotPaused {
        _placeSellOrder(edaiId, quantity, price, msg.sender);
    }

    /// @notice Place a sell order for a specific trader
    /// @param edaiId The EDAI identifier
    /// @param quantity The quantity to sell
    /// @param price The price per unit
    /// @param trader The trader address
    function placeSellOrderForTrader(
        string memory edaiId,
        uint256 quantity,
        uint256 price,
        address trader
    ) external onlyRole(TRADER_ROLE) whenNotPaused {
        _placeSellOrder(edaiId, quantity, price, trader);
    }

    /// @notice Internal function to place a buy order
    /// @param edaiId The EDAI identifier
    /// @param quantity The quantity to buy
    /// @param price The price per unit
    /// @param trader The trader address
    function _placeBuyOrder(
        string memory edaiId,
        uint256 quantity,
        uint256 price,
        address trader
    ) internal {
        require(bytes(edaiId).length > 0, "Invalid EDAI ID");
        require(quantity >= MIN_ORDER_SIZE, "Order too small");
        require(quantity <= MAX_ORDER_SIZE, "Order too large");
        require(price > 0, "Invalid price");
        require(trader != address(0), "Invalid trader address");

        // Check if EDAI exists and is active (would integrate with CivicTrustRegistry)
        // require(registry.isActive(edaiId), "EDAI not active");

        orderIdCounter++;
        Order memory newOrder = Order({
            orderId: orderIdCounter,
            trader: trader,
            edaiId: edaiId,
            quantity: quantity,
            price: price,
            isBuy: true,
            timestamp: block.timestamp,
            isActive: true
        });

        orders[orderIdCounter] = newOrder;
        traderOrders[trader].push(orderIdCounter);
        _insertBuyOrder(edaiId, newOrder);

        emit OrderPlaced(
            orderIdCounter,
            trader,
            edaiId,
            quantity,
            price,
            true,
            block.timestamp
        );

        // Try to match orders
        _matchOrders(edaiId);
    }

    /// @notice Internal function to place a sell order
    /// @param edaiId The EDAI identifier
    /// @param quantity The quantity to sell
    /// @param price The price per unit
    /// @param trader The trader address
    function _placeSellOrder(
        string memory edaiId,
        uint256 quantity,
        uint256 price,
        address trader
    ) internal {
        require(bytes(edaiId).length > 0, "Invalid EDAI ID");
        require(quantity >= MIN_ORDER_SIZE, "Order too small");
        require(quantity <= MAX_ORDER_SIZE, "Order too large");
        require(price > 0, "Invalid price");
        require(trader != address(0), "Invalid trader address");

        // Check if trader has sufficient EDAI balance
        // require(edaiToken.balanceOf(trader, edaiId) >= quantity, "Insufficient balance");

        orderIdCounter++;
        Order memory newOrder = Order({
            orderId: orderIdCounter,
            trader: trader,
            edaiId: edaiId,
            quantity: quantity,
            price: price,
            isBuy: false,
            timestamp: block.timestamp,
            isActive: true
        });

        orders[orderIdCounter] = newOrder;
        traderOrders[trader].push(orderIdCounter);
        _insertSellOrder(edaiId, newOrder);

        emit OrderPlaced(
            orderIdCounter,
            trader,
            edaiId,
            quantity,
            price,
            false,
            block.timestamp
        );

        // Try to match orders
        _matchOrders(edaiId);
    }

    /// @notice Cancel an order
    /// @param orderId The order ID to cancel
    function cancelOrder(uint256 orderId) external whenNotPaused {
        Order storage order = orders[orderId];
        require(order.isActive, "Order not active");
        require(order.trader == msg.sender || hasRole(OPERATOR_ROLE, msg.sender), "Not authorized");

        order.isActive = false;
        _removeBuyOrder(order.edaiId, orderId);
        _removeSellOrder(order.edaiId, orderId);

        emit OrderCancelled(orderId, msg.sender, order.edaiId, block.timestamp);
    }

    /// @notice Get order book for an EDAI
    /// @param edaiId The EDAI identifier
    /// @return buyOrders_ Array of buy orders
    /// @return sellOrders_ Array of sell orders
    function getOrderBook(string memory edaiId) external view returns (Order[] memory buyOrders_, Order[] memory sellOrders_) {
        buyOrders_ = buyOrders[edaiId];
        sellOrders_ = sellOrders[edaiId];
    }

    /// @notice Get market data for an EDAI
    /// @param edaiId The EDAI identifier
    /// @return lastPrice_ Last traded price
    /// @return volume24h_ 24-hour volume
    /// @return high24h_ 24-hour high
    /// @return low24h_ 24-hour low
    function getMarketData(string memory edaiId) external view returns (
        uint256 lastPrice_,
        uint256 volume24h_,
        uint256 high24h_,
        uint256 low24h_
    ) {
        lastPrice_ = lastPrice[edaiId];
        volume24h_ = volume24h[edaiId];
        high24h_ = high24h[edaiId];
        low24h_ = low24h[edaiId];
    }

    /// @notice Execute a trade between two orders
    /// @param buyOrderId The buy order ID
    /// @param sellOrderId The sell order ID
    function executeTrade(uint256 buyOrderId, uint256 sellOrderId) external onlyRole(OPERATOR_ROLE) whenNotPaused {
        Order storage buyOrder = orders[buyOrderId];
        Order storage sellOrder = orders[sellOrderId];

        require(buyOrder.isActive && sellOrder.isActive, "Orders not active");
        require(buyOrder.isBuy && !sellOrder.isBuy, "Invalid order types");
        require(keccak256(bytes(buyOrder.edaiId)) == keccak256(bytes(sellOrder.edaiId)), "Orders must be for same EDAI");
        require(buyOrder.price >= sellOrder.price, "Price mismatch");

        uint256 tradeQuantity = buyOrder.quantity < sellOrder.quantity ? buyOrder.quantity : sellOrder.quantity;
        uint256 tradePrice = sellOrder.price; // Price of the maker order

        // Create trade
        tradeIdCounter++;
        Trade memory newTrade = Trade({
            tradeId: tradeIdCounter,
            buyOrderId: buyOrderId,
            sellOrderId: sellOrderId,
            edaiId: buyOrder.edaiId,
            quantity: tradeQuantity,
            price: tradePrice,
            buyer: buyOrder.trader,
            seller: sellOrder.trader,
            timestamp: block.timestamp
        });

        trades[tradeIdCounter] = newTrade;

        // Update orders
        if (buyOrder.quantity == tradeQuantity) {
            buyOrder.isActive = false;
            _removeBuyOrder(buyOrder.edaiId, buyOrderId);
        } else {
            buyOrder.quantity -= tradeQuantity;
        }

        if (sellOrder.quantity == tradeQuantity) {
            sellOrder.isActive = false;
            _removeSellOrder(sellOrder.edaiId, sellOrderId);
        } else {
            sellOrder.quantity -= tradeQuantity;
        }

        // Update market data
        _updateMarketData(buyOrder.edaiId, tradePrice, tradeQuantity);

        // Transfer tokens (would integrate with actual token contract)
        // edaiToken.transferFrom(seller, buyer, edaiId, quantity);

        emit TradeExecuted(
            tradeIdCounter,
            buyOrderId,
            sellOrderId,
            buyOrder.edaiId,
            tradeQuantity,
            tradePrice,
            buyOrder.trader,
            sellOrder.trader,
            block.timestamp
        );
    }

    /// @notice Match orders for an EDAI
    /// @param edaiId The EDAI identifier
    function _matchOrders(string memory edaiId) internal {
        Order[] storage buys = buyOrders[edaiId];
        Order[] storage sells = sellOrders[edaiId];

        while (buys.length > 0 && sells.length > 0) {
            Order storage bestBuy = buys[0];
            Order storage bestSell = sells[0];

            if (bestBuy.price < bestSell.price) {
                break; // No more matches possible
            }

            uint256 tradeQuantity = bestBuy.quantity < bestSell.quantity ? bestBuy.quantity : bestSell.quantity;
            uint256 tradePrice = bestSell.price; // Price of the maker order

            // Create trade
            tradeIdCounter++;
            Trade memory newTrade = Trade({
                tradeId: tradeIdCounter,
                buyOrderId: bestBuy.orderId,
                sellOrderId: bestSell.orderId,
                edaiId: edaiId,
                quantity: tradeQuantity,
                price: tradePrice,
                buyer: bestBuy.trader,
                seller: bestSell.trader,
                timestamp: block.timestamp
            });

            trades[tradeIdCounter] = newTrade;

            // Update orders
            if (bestBuy.quantity == tradeQuantity) {
                bestBuy.isActive = false;
                _removeBuyOrder(edaiId, bestBuy.orderId);
            } else {
                bestBuy.quantity -= tradeQuantity;
            }

            if (bestSell.quantity == tradeQuantity) {
                bestSell.isActive = false;
                _removeSellOrder(edaiId, bestSell.orderId);
            } else {
                bestSell.quantity -= tradeQuantity;
            }

            // Update market data
            _updateMarketData(edaiId, tradePrice, tradeQuantity);

            // Transfer tokens (would integrate with actual token contract)
            // edaiToken.transferFrom(seller, buyer, edaiId, quantity);

            emit TradeExecuted(
                tradeIdCounter,
                bestBuy.orderId,
                bestSell.orderId,
                edaiId,
                tradeQuantity,
                tradePrice,
                bestBuy.trader,
                bestSell.trader,
                block.timestamp
            );
        }
    }

    /// @notice Update market data for an EDAI
    /// @param edaiId The EDAI identifier
    /// @param price The trade price
    /// @param quantity The trade quantity
    function _updateMarketData(string memory edaiId, uint256 price, uint256 quantity) internal {
        uint256 oldPrice = lastPrice[edaiId];
        lastPrice[edaiId] = price;
        volume24h[edaiId] += quantity;

        if (price > high24h[edaiId] || high24h[edaiId] == 0) {
            high24h[edaiId] = price;
        }

        if (price < low24h[edaiId] || low24h[edaiId] == 0) {
            low24h[edaiId] = price;
        }
    }

    /// @notice Insert a buy order into the order book
    /// @param edaiId The EDAI identifier
    /// @param order The order to insert
    function _insertBuyOrder(string memory edaiId, Order memory order) internal {
        Order[] storage orders = buyOrders[edaiId];
        orders.push(order);
        // Sort by price (highest first) and then by timestamp
        _sortBuyOrders(orders);
    }

    /// @notice Insert a sell order into the order book
    /// @param edaiId The EDAI identifier
    /// @param order The order to insert
    function _insertSellOrder(string memory edaiId, Order memory order) internal {
        Order[] storage orders = sellOrders[edaiId];
        orders.push(order);
        // Sort by price (lowest first) and then by timestamp
        _sortSellOrders(orders);
    }

    /// @notice Remove a buy order from the order book
    /// @param edaiId The EDAI identifier
    /// @param orderId The order ID to remove
    function _removeBuyOrder(string memory edaiId, uint256 orderId) internal {
        Order[] storage orders = buyOrders[edaiId];
        for (uint256 i = 0; i < orders.length; i++) {
            if (orders[i].orderId == orderId) {
                orders[i] = orders[orders.length - 1];
                orders.pop();
                break;
            }
        }
    }

    /// @notice Remove a sell order from the order book
    /// @param edaiId The EDAI identifier
    /// @param orderId The order ID to remove
    function _removeSellOrder(string memory edaiId, uint256 orderId) internal {
        Order[] storage orders = sellOrders[edaiId];
        for (uint256 i = 0; i < orders.length; i++) {
            if (orders[i].orderId == orderId) {
                orders[i] = orders[orders.length - 1];
                orders.pop();
                break;
            }
        }
    }

    /// @notice Sort buy orders by price (highest first) and timestamp
    /// @param orders The orders to sort
    function _sortBuyOrders(Order[] storage orders) internal {
        // Simple bubble sort for small order books
        for (uint256 i = 0; i < orders.length - 1; i++) {
            for (uint256 j = 0; j < orders.length - i - 1; j++) {
                if (orders[j].price < orders[j + 1].price || 
                    (orders[j].price == orders[j + 1].price && orders[j].timestamp > orders[j + 1].timestamp)) {
                    Order memory temp = orders[j];
                    orders[j] = orders[j + 1];
                    orders[j + 1] = temp;
                }
            }
        }
    }

    /// @notice Sort sell orders by price (lowest first) and timestamp
    /// @param orders The orders to sort
    function _sortSellOrders(Order[] storage orders) internal {
        // Simple bubble sort for small order books
        for (uint256 i = 0; i < orders.length - 1; i++) {
            for (uint256 j = 0; j < orders.length - i - 1; j++) {
                if (orders[j].price > orders[j + 1].price || 
                    (orders[j].price == orders[j + 1].price && orders[j].timestamp > orders[j + 1].timestamp)) {
                    Order memory temp = orders[j];
                    orders[j] = orders[j + 1];
                    orders[j + 1] = temp;
                }
            }
        }
    }
} 