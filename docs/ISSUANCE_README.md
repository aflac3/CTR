# EDAI Securities Issuance System

## Overview

The EDAI Securities Issuance System is a comprehensive platform for creating, managing, and distributing Energy Dispatch Assurance Instrument (EDAI) securities. This system provides a complete infrastructure for securities issuance with regulatory compliance, investor management, and token distribution.

## Architecture

The issuance system consists of two main contracts:

1. **EDAIToken** - ERC20 token representing EDAI securities with compliance features
2. **EDAIIssuance** - Main issuance management contract

## Features

### Issuance Capabilities
- ✅ **Securities Creation** - Create new EDAI securities with metadata
- ✅ **Regulatory Compliance** - Approval workflow for securities issuance
- ✅ **Investor Management** - Allocation and purchase management
- ✅ **Token Distribution** - Automated token minting and distribution

### Compliance Features
- ✅ **Transfer Restrictions** - Account-level transfer limitations
- ✅ **Blacklisting** - Compliance-based account restrictions
- ✅ **Regulatory Approval** - Multi-stage approval process
- ✅ **Audit Trail** - Complete issuance history and tracking

### Token Features
- ✅ **ERC20 Standard** - Full ERC20 compatibility
- ✅ **Metadata Support** - Rich token metadata for EDAIs
- ✅ **Pausable** - Emergency pause functionality
- ✅ **Burnable** - Token burning capabilities

## Quick Start

### Installation
```bash
npm install
```

### Testing
```bash
npx hardhat test test/EDAIIssuance.test.js
```

### Deployment
```bash
npx hardhat run scripts/deploy-issuance.js --network <network>
```

## Usage Examples

### Create Issuance
```javascript
// Create a new EDAI issuance
const edaiId = "EDAI-ISSUANCE-001";
const totalSupply = ethers.parseEther("1000000"); // 1 million tokens
const pricePerToken = ethers.parseEther("100"); // $100 per token
const issuanceType = 0; // PRIVATE_PLACEMENT
const description = "Energy dispatch assurance instrument";
const maturityDate = Math.floor(Date.now() / 1000) + (365 * 24 * 60 * 60); // 1 year

await edaiIssuance.createIssuance(
    edaiId,
    totalSupply,
    pricePerToken,
    issuanceType,
    description,
    maturityDate
);
```

### Approve Issuance
```javascript
// Approve an issuance for activation
await edaiIssuance.approveIssuance(edaiId);
```

### Activate Issuance
```javascript
// Activate an approved issuance
await edaiIssuance.activateIssuance(edaiId);
```

### Allocate Tokens
```javascript
// Allocate tokens to an investor
const investor = "0x1234567890123456789012345678901234567890";
const allocationAmount = ethers.parseEther("10000"); // 10k tokens

await edaiIssuance.allocateTokens(edaiId, investor, allocationAmount);
```

### Purchase Tokens
```javascript
// Purchase tokens in an active issuance
const purchaseAmount = ethers.parseEther("1000"); // 1k tokens

await edaiIssuance.purchaseTokens(edaiId, purchaseAmount);
```

### Mint Tokens
```javascript
// Mint tokens for a specific EDAI
await edaiToken.mint(edaiId, recipient, amount);
```

## Configuration

### Issuance Parameters
| Parameter | Description | Default Value |
|-----------|-------------|---------------|
| `MIN_ISSUANCE_AMOUNT` | Minimum issuance amount | 1,000 tokens |
| `MAX_ISSUANCE_AMOUNT` | Maximum issuance amount | 1,000,000,000 tokens |
| `MIN_ISSUANCE_DURATION` | Minimum issuance duration | 1 day |
| `MAX_ISSUANCE_DURATION` | Maximum issuance duration | 365 days |

### Token Parameters
| Parameter | Description | Default Value |
|-----------|-------------|---------------|
| `MAX_SUPPLY` | Maximum token supply | 1,000,000,000 tokens |
| `MIN_TRANSFER_AMOUNT` | Minimum transfer amount | 1 token |

## Security

### Access Control
- Role-based permissions for all functions
- Multi-signature support for critical operations
- Emergency pause functionality

### Compliance
- Transfer restrictions and blacklisting
- Regulatory approval workflow
- Audit trails and issuance history

### Risk Management
- Supply limits and allocation controls
- Maturity date enforcement
- Investor eligibility checks

## Testing

### Run All Tests
```bash
npx hardhat test
```

### Run Specific Test
```bash
npx hardhat test test/EDAIIssuance.test.js
```

### Test Coverage
```bash
npx hardhat coverage
```

## Deployment

### Local Development
```bash
npx hardhat node
npx hardhat run scripts/deploy-issuance.js --network localhost
```

### Testnet Deployment
```bash
npx hardhat run scripts/deploy-issuance.js --network sepolia
```

### Mainnet Deployment
```bash
npx hardhat run scripts/deploy-issuance.js --network mainnet
```

## Integration

### Frontend Integration
```javascript
// Connect to the issuance system
const issuanceSystem = new EDAIIssuance(contractAddress, signer);

// Create issuance
await issuanceSystem.createIssuance(edaiId, totalSupply, pricePerToken, issuanceType, description, maturityDate);

// Purchase tokens
await issuanceSystem.purchaseTokens(edaiId, amount);
```

### API Integration
```javascript
// Get issuance information
const issuance = await issuanceSystem.getIssuance(edaiId);

// Get investor allocation
const allocation = await issuanceSystem.getInvestorAllocation(edaiId, investor);

// Check issuance status
const isActive = await issuanceSystem.isIssuanceActive(edaiId);
```

## Monitoring

### Issuance Tracking
- Real-time issuance status
- Allocation and purchase metrics
- Regulatory compliance status

### Token Metrics
- Total supply and circulation
- Transfer restrictions and blacklists
- Token metadata and history

### System Health
- Contract performance metrics
- Gas usage optimization
- Error rate monitoring

## Compliance

### Regulatory Requirements
- SEC compliance for securities issuance
- KYC/AML integration
- Transfer restrictions and reporting

### Audit Trail
- Complete issuance history
- Investor allocation records
- Regulatory approval tracking

### Reporting
- Issuance status reports
- Investor allocation reports
- Compliance monitoring reports

## Support

For technical support or questions about the EDAI Securities Issuance System:

- **Documentation**: [Technical Specification](./TECHNICAL_SPECIFICATION.md)
- **Issues**: [GitHub Issues](https://github.com/your-repo/issues)
- **Discussions**: [GitHub Discussions](https://github.com/your-repo/discussions)

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details. 