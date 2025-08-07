# EDAI Securities Trading Specification

This document outlines the missing securities trading capabilities required for EDAI issuance and trading in compliance with regulatory requirements.

## Overview

The current CTR system lacks essential securities trading infrastructure. This specification proposes the following contracts:

### 1. EDAI Trading Engine

```solidity
contract EDAITradingEngine {
    struct Order {
        uint256 orderId;
        address trader;
        string edaiId;
        uint256 quantity;
        uint256 price;
        OrderType orderType;
        OrderStatus status;
        uint256 timestamp;
    }
    
    // Core trading functions
    function placeBuyOrder(string memory edaiId, uint256 quantity, uint256 price) external;
    function placeSellOrder(string memory edaiId, uint256 quantity, uint256 price) external;
    function cancelOrder(uint256 orderId) external;
    function executeTrade(uint256 buyOrderId, uint256 sellOrderId) external;
    
    // Market data
    function getOrderBook(string memory edaiId) external view returns (Order[] memory, Order[] memory);
    function getMarketData(string memory edaiId) external view returns (uint256, uint256, uint256, uint256);
}
```

### 2. EDAI Liquidity Pool

```solidity
contract EDAILiquidityPool {
    struct Pool {
        string edaiId;
        uint256 edaiBalance;
        uint256 stablecoinBalance;
        uint256 lpTokenSupply;
        uint256 lastPrice;
        uint256 lastUpdateTime;
        bool isActive;
    }
    
    // Liquidity provision
    function addLiquidity(string memory edaiId, uint256 edaiAmount, uint256 stablecoinAmount) external;
    function removeLiquidity(string memory edaiId, uint256 lpTokens) external;
    function swapEdaiForStablecoin(string memory edaiId, uint256 edaiAmount) external;
    function swapStablecoinForEdai(string memory edaiId, uint256 stablecoinAmount) external;
}
```

### 3. EDAI Securities Compliance

```solidity
contract EDAISecuritiesCompliance {
    struct Investor {
        address investor;
        bool isAccredited;
        uint256 maxInvestment;
        string[] allowedEdaiIds;
        bool kycVerified;
        bool amlCleared;
        uint256 currentPosition;
    }
    
    // Compliance functions
    function verifyInvestorEligibility(address investor, string memory edaiId) external view returns (bool);
    function checkTradingRestrictions(address investor, string memory edaiId, uint256 amount) external view returns (bool);
    function recordTrade(address buyer, address seller, string memory edaiId, uint256 amount, uint256 price) external;
}
```

### 4. EDAI Market Data

```solidity
contract EDAIMarketData {
    struct PriceData {
        string edaiId;
        uint256 lastPrice;
        uint256 volume24h;
        uint256 high24h;
        uint256 low24h;
        uint256 timestamp;
    }
    
    // Market data functions
    function updatePrice(string memory edaiId, uint256 price) external;
    function getPrice(string memory edaiId) external view returns (uint256);
    function getVolume24h(string memory edaiId) external view returns (uint256);
}
```

## Key Features

### Trading Capabilities
- **Order Book Management** - Centralized order matching
- **Liquidity Provision** - AMM-style pools for price discovery
- **Trade Execution** - Automated matching and settlement
- **Market Data** - Real-time price feeds and analytics

### Compliance Features
- **KYC/AML Integration** - Investor verification
- **Trading Restrictions** - Position limits and access controls
- **Accredited Investor Checks** - For certain EDAI types
- **Regulatory Reporting** - Trade surveillance and reporting

### Risk Management
- **Position Limits** - Per-investor and per-EDAI limits
- **Circuit Breakers** - Trading halts during volatility
- **Liquidity Requirements** - Minimum pool depths
- **Settlement Risk** - Atomic trade execution

## Implementation Priority

1. **Phase 1**: Core trading engine and order book
2. **Phase 2**: Liquidity pools and AMM functionality
3. **Phase 3**: Compliance and risk management
4. **Phase 4**: Advanced market data and analytics

## Integration Points

### Existing CTR Integration
```solidity
// Extend existing EDAIEntry
struct EDAIEntry {
    string edaiId;
    address issuer;
    bool breachFlag;
    uint256 breachSeverity;
    uint256 enforcementAction;
    uint256 breachTimestamp;
    string breachDescription;
    bool isActive;
    // New trading fields
    bool tradingEnabled;
    uint256 totalSupply;
    uint256 circulatingSupply;
    uint256 lastTradePrice;
    uint256 lastTradeTime;
}

// Trading events
event TradeExecuted(
    string indexed edaiId,
    address indexed buyer,
    address indexed seller,
    uint256 quantity,
    uint256 price,
    uint256 timestamp
);

event LiquidityAdded(
    string indexed edaiId,
    address indexed provider,
    uint256 edaiAmount,
    uint256 stablecoinAmount,
    uint256 lpTokens,
    uint256 timestamp
);
```

## Conclusion

The CTR currently lacks essential securities trading capabilities required for a complete EDAI ecosystem. Implementation of these features should be prioritized based on regulatory requirements and market demand. 