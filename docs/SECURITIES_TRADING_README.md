# EDAI Securities Trading System

## Overview

The EDAI Securities Trading System is a comprehensive decentralized trading platform for EDAI (Energy Dispatch Assurance Instrument) securities. This system provides a complete infrastructure for trading, compliance, liquidity provision, and market data management.

## Architecture

The system consists of five main contracts:

1. **EDAITradingEngine** - Core order book management and trade execution
2. **EDAILiquidityPool** - AMM-style liquidity provision
3. **EDAISecuritiesCompliance** - KYC/AML and trading restrictions
4. **EDAIMarketData** - Price feeds and market analytics
5. **EDAISecuritiesTrading** - Main integration contract

## Features

### Trading Capabilities
- ✅ **Order Book Management** - Centralized order matching
- ✅ **Liquidity Provision** - AMM-style pools for price discovery
- ✅ **Trade Execution** - Automated matching and settlement
- ✅ **Market Data** - Real-time price feeds and analytics

### Compliance Features
- ✅ **KYC/AML Integration** - Investor verification
- ✅ **Trading Restrictions** - Position limits and access controls
- ✅ **Accredited Investor Checks** - For certain EDAI types
- ✅ **Regulatory Reporting** - Trade surveillance and reporting

### Risk Management
- ✅ **Position Limits** - Per-investor and per-EDAI limits
- ✅ **Circuit Breakers** - Trading halts during volatility
- ✅ **Liquidity Requirements** - Minimum pool depths
- ✅ **Settlement Risk** - Atomic trade execution

## Quick Start

### Installation
```bash
npm install
```

### Testing
```bash
npx hardhat test test/EDAISecuritiesTrading.test.js
```

### Deployment
```bash
npx hardhat run scripts/deploy-securities-trading.js --network <network>
```

## Usage Examples

### Start Trading Session
```javascript
// Start a trading session for an EDAI
const edaiId = "EDAI-TEST-001";
const openPrice = ethers.parseEther("100"); // $100 per EDAI

await securitiesTrading.startTradingSession(edaiId, openPrice);
```

### Create Trading Pair
```javascript
// Create a trading pair with specific parameters
await securitiesTrading.createTradingPair(
    edaiId,
    ethers.parseEther("1"),    // min order size
    ethers.parseEther("10000"), // max order size
    ethers.parseEther("0.01"),  // tick size
    ethers.parseEther("1"),     // lot size
    false,                      // no margin
    0                           // margin requirement
);
```

### Place Orders
```javascript
// Place buy and sell orders
await securitiesTrading.placeBuyOrder(edaiId, quantity, price);
await securitiesTrading.placeSellOrder(edaiId, quantity, price);
```

### Add Liquidity
```javascript
// Add liquidity to the pool
const allowedEdaiIds = [edaiId]; // allowed EDAI IDs
await compliance.registerInvestor(
    investor.address,
    true, // accredited
    maxInvestment,
    allowedEdaiIds
);
```

### Get Market Data
```javascript
// Get price data and market metrics
const priceData = await marketData.getPriceData(edaiId);
const metrics = await marketData.getMarketMetrics(edaiId);
```

## Configuration

### Trading Parameters
| Parameter | Description | Default Value |
|-----------|-------------|---------------|
| `MIN_ORDER_SIZE` | Minimum order size | 1 EDAI |
| `MAX_ORDER_SIZE` | Maximum order size | 1,000,000 EDAI |
| `TRADING_FEE` | Trading fee percentage | 0.3% |
| `LIQUIDITY_FEE` | Liquidity provision fee | 0.1% |

### Compliance Parameters
| Parameter | Description | Default Value |
|-----------|-------------|---------------|
| `KYC_REQUIRED` | KYC verification required | true |
| `AML_REQUIRED` | AML clearance required | true |
| `MAX_POSITION_SIZE` | Maximum position per investor | 1,000,000 EDAI |
| `ACCREDITED_ONLY` | Accredited investors only | false |

## Security

### Access Control
- Role-based permissions for all functions
- Multi-signature support for critical operations
- Emergency pause functionality

### Risk Management
- Position limits and trading restrictions
- Circuit breakers for volatility protection
- Liquidity requirements and pool depths

### Compliance
- KYC/AML integration
- Regulatory reporting capabilities
- Audit trails and trade history

## Testing

### Run All Tests
```bash
npx hardhat test
```

### Run Specific Test
```bash
npx hardhat test test/EDAISecuritiesTrading.test.js
```

### Test Coverage
```bash
npx hardhat coverage
```

## Deployment

### Local Development
```bash
npx hardhat node
npx hardhat run scripts/deploy-securities-trading.js --network localhost
```

### Testnet Deployment
```bash
npx hardhat run scripts/deploy-securities-trading.js --network sepolia
```

### Mainnet Deployment
```bash
npx hardhat run scripts/deploy-securities-trading.js --network mainnet
```

## Integration

### Frontend Integration
```javascript
// Connect to the trading system
const tradingSystem = new EDAISecuritiesTrading(contractAddress, signer);

// Start trading session
await tradingSystem.startTradingSession(edaiId, openPrice);

// Place orders
await tradingSystem.placeBuyOrder(edaiId, quantity, price);
```

### API Integration
```javascript
// Get market data
const marketData = await tradingSystem.getMarketData(edaiId);

// Get order book
const orderBook = await tradingSystem.getOrderBook(edaiId);

// Get investor information
const investor = await tradingSystem.getInvestorInfo(investorAddress);
```

## Monitoring

### Market Data
- Real-time price feeds
- Volume and liquidity metrics
- Order book depth analysis

### Compliance Monitoring
- Investor verification status
- Trading restriction compliance
- Regulatory reporting status

### System Health
- Contract performance metrics
- Gas usage optimization
- Error rate monitoring

## Support

For technical support or questions about the EDAI Securities Trading System:

- **Documentation**: [Technical Specification](./TECHNICAL_SPECIFICATION.md)
- **Issues**: [GitHub Issues](https://github.com/your-repo/issues)
- **Discussions**: [GitHub Discussions](https://github.com/your-repo/discussions)

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details. 