# CTR Monitoring System

## Overview

The CTR Monitoring System provides real-time health monitoring, alerting, and incident response for the CivicTrustRegistry (CTR) system. It ensures system reliability, performance, and operational awareness.

## Features

- **Real-time Health Monitoring**: Continuous monitoring of contract health and system status
- **Multi-channel Alerting**: Slack, Discord, Email, and webhook notifications
- **Automated Incident Response**: Escalation and response procedures
- **Performance Metrics**: Gas usage, response times, and system metrics
- **Comprehensive Testing**: Integration tests and load testing
- **Automated Deployment**: CI/CD pipeline with rollback capabilities

## Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Health Check  │    │   Alert System   │    │   Monitoring    │
│   Service       │◄──►│   (Slack/Discord)│◄──►│   Dashboard     │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Contract      │    │   Incident       │    │   Performance   │
│   Health        │    │   Response       │    │   Metrics       │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## Quick Start

### 1. Installation

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
```

### 2. Configuration

```bash
# Required environment variables
RPC_URL=https://mainnet.infura.io/v3/YOUR_PROJECT_ID
REGISTRY_ADDRESS=0x...
INTEGRATION_HUB_ADDRESS=0x...
ORACLE_ADDRESS=0x...
ZK_VERIFIER_ADDRESS=0x...
FALLBACK_ENGINE_ADDRESS=0x...
TRADING_ADDRESS=0x...
ISSUANCE_ADDRESS=0x...
TOKEN_ADDRESS=0x...

# Alert channels
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
EMAIL_RECIPIENTS=admin@example.com,ops@example.com
```

### 3. Start Monitoring

```typescript
import { createMonitoringService } from './monitoring';

// Create monitoring service
const monitoring = createMonitoringService('mainnet');

// Start monitoring
await monitoring.start();

// Get system status
const status = await monitoring.getSystemStatus();
console.log('System status:', status);
```

## Components

### 1. Health Monitoring Service

Monitors contract health and system status in real-time.

```typescript
import { HealthMonitoringService } from './health-check';

const healthMonitoring = new HealthMonitoringService(provider, alertSystem);

// Start monitoring
await healthMonitoring.startMonitoring(contractAddresses, 30000);

// Get health status
const healthStatus = healthMonitoring.getHealthStatus();
```

**Features:**
- Contract accessibility checks
- Performance metrics collection
- Real-time status monitoring
- Automated health assessments

### 2. Alert System

Multi-channel alerting system with rate limiting and escalation.

```typescript
import { AlertSystem, AlertConfig } from './alerting';

const alertConfig: AlertConfig = {
  channels: [
    {
      id: 'slack',
      type: 'slack',
      config: { webhookUrl: 'https://hooks.slack.com/...' },
      enabled: true
    }
  ],
  rateLimit: { maxAlertsPerMinute: 10, maxAlertsPerHour: 100 },
  escalation: { enabled: true, escalationDelay: 5, escalationLevels: ['critical'] }
};

const alertSystem = new AlertSystem(alertConfig);

// Send alert
await alertSystem.sendAlert('critical', 'System breach detected');
```

**Supported Channels:**
- **Slack**: Webhook integration with rich formatting
- **Discord**: Webhook integration with embeds
- **Email**: SMTP integration with HTML formatting
- **Webhook**: Custom webhook endpoints

### 3. Integration Tests

Comprehensive testing suite for system integration.

```bash
# Run integration tests
npm run test:integration

# Run specific test suite
npm run test:integration -- --grep "Complete EDAI Lifecycle"
```

**Test Coverage:**
- Complete EDAI lifecycle testing
- High-volume trading operations
- Concurrent breach handling
- System health and monitoring
- Integration hub coordination
- Error handling and recovery
- Performance and scalability

### 4. Automated Deployment

CI/CD pipeline with automated testing and deployment.

```yaml
# .github/workflows/deploy.yml
name: Deploy CTR System

on:
  push:
    tags: ['v*']
  workflow_dispatch:
    inputs:
      environment:
        description: 'Deployment environment'
        required: true
        default: 'testnet'
        type: choice
        options:
        - testnet
        - mainnet
```

**Pipeline Stages:**
1. **Test**: Linting, unit tests, integration tests, security tests
2. **Security**: Slither analysis, Mythril analysis, dependency audit
3. **Build**: Contract compilation, artifact generation
4. **Deploy**: Environment-specific deployment
5. **Verify**: Contract verification, post-deployment tests
6. **Notify**: Deployment status notifications
7. **Rollback**: Emergency rollback procedures

## Usage Examples

### Basic Monitoring

```typescript
import { CTRMonitoringService } from './monitoring';

// Create monitoring service
const monitoring = new CTRMonitoringService({
  rpcUrl: 'https://mainnet.infura.io/v3/YOUR_PROJECT_ID',
  contractAddresses: ['0x...', '0x...'],
  healthCheckInterval: 30000,
  environment: 'mainnet',
  alertConfig: {
    channels: [],
    rateLimit: { maxAlertsPerMinute: 10, maxAlertsPerHour: 100 },
    escalation: { enabled: true, escalationDelay: 5, escalationLevels: ['critical'] }
  }
});

// Start monitoring
await monitoring.start();

// Get system status
const status = await monitoring.getSystemStatus();
console.log('System status:', status);
```

### Custom Alerts

```typescript
// Send custom alert
await monitoring.sendAlert('warning', 'High gas prices detected', 'gas-monitor');

// Add new alert channel
await monitoring.addAlertChannel({
  id: 'custom-webhook',
  type: 'webhook',
  config: { url: 'https://api.example.com/webhook' },
  enabled: true
});
```

### Health Checks

```typescript
// Perform manual health check
const healthCheck = await monitoring.performManualHealthCheck();
console.log('Health check result:', healthCheck);

// Get contract health details
const contractHealth = await monitoring.getContractHealth();
console.log('Contract health:', contractHealth);
```

## Configuration

### Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `RPC_URL` | Ethereum RPC endpoint | Yes | - |
| `REGISTRY_ADDRESS` | CivicTrustRegistry contract address | Yes | - |
| `INTEGRATION_HUB_ADDRESS` | EDAIIntegrationHub contract address | Yes | - |
| `ORACLE_ADDRESS` | EDAIOracle contract address | Yes | - |
| `ZK_VERIFIER_ADDRESS` | EDAIZKVerifier contract address | Yes | - |
| `FALLBACK_ENGINE_ADDRESS` | EDAIFallbackEngine contract address | Yes | - |
| `TRADING_ADDRESS` | EDAISecuritiesTrading contract address | Yes | - |
| `ISSUANCE_ADDRESS` | EDAIIssuance contract address | Yes | - |
| `TOKEN_ADDRESS` | EDAIToken contract address | Yes | - |
| `HEALTH_CHECK_INTERVAL` | Health check interval (ms) | No | 30000 |
| `SLACK_WEBHOOK_URL` | Slack webhook URL | No | - |
| `DISCORD_WEBHOOK_URL` | Discord webhook URL | No | - |
| `SMTP_HOST` | SMTP server host | No | - |
| `SMTP_PORT` | SMTP server port | No | 587 |
| `SMTP_USER` | SMTP username | No | - |
| `SMTP_PASS` | SMTP password | No | - |
| `EMAIL_RECIPIENTS` | Email recipients (comma-separated) | No | - |

### Alert Configuration

```typescript
const alertConfig: AlertConfig = {
  channels: [
    {
      id: 'slack',
      type: 'slack',
      config: {
        webhookUrl: 'https://hooks.slack.com/services/...',
        channel: '#alerts'
      },
      enabled: true
    },
    {
      id: 'discord',
      type: 'discord',
      config: {
        webhookUrl: 'https://discord.com/api/webhooks/...'
      },
      enabled: true
    }
  ],
  rateLimit: {
    maxAlertsPerMinute: 10,
    maxAlertsPerHour: 100
  },
  escalation: {
    enabled: true,
    escalationDelay: 5, // minutes
    escalationLevels: ['critical']
  }
};
```

## Testing

### Run All Tests

```bash
# Run all tests
npm test

# Run integration tests
npm run test:integration

# Run security tests
npm run test:security

# Run with coverage
npm run test:coverage
```

### Test Categories

1. **Unit Tests**: Individual component testing
2. **Integration Tests**: Full system integration testing
3. **Security Tests**: Security vulnerability testing
4. **Load Tests**: Performance under load testing
5. **Stress Tests**: System behavior under stress testing

## Deployment

### Automated Deployment

```bash
# Deploy to testnet
git tag v1.0.0
git push origin v1.0.0

# Deploy to mainnet (manual)
# Go to GitHub Actions and trigger manual deployment
```

### Manual Deployment

```bash
# Deploy to testnet
npx hardhat run scripts/deploy-complete-system.js --network testnet

# Deploy to mainnet
npx hardhat run scripts/deploy-complete-system.js --network mainnet

# Verify contracts
npx hardhat run scripts/verify.js --network mainnet
```

### Rollback

```bash
# Emergency rollback
npx hardhat run scripts/rollback.js --network mainnet
```

## Monitoring Dashboard

### System Status

- **Overall Health**: System-wide health status
- **Contract Health**: Individual contract status
- **Performance Metrics**: Response times, gas usage
- **Alert History**: Recent alerts and notifications
- **Uptime**: System uptime and availability

### Health Metrics

- **Contract Status**: Healthy, Warning, Critical
- **Response Time**: Average response time
- **Gas Usage**: Gas consumption metrics
- **Error Rate**: Error frequency and types
- **System Load**: System performance under load

## Troubleshooting

### Common Issues

1. **RPC Connection Failed**
   - Check RPC URL configuration
   - Verify network connectivity
   - Check rate limits

2. **Contract Not Found**
   - Verify contract addresses
   - Check network configuration
   - Ensure contracts are deployed

3. **Alert Delivery Failed**
   - Check webhook URLs
   - Verify channel configuration
   - Check rate limiting

4. **High Gas Usage**
   - Optimize contract interactions
   - Check for gas-intensive operations
   - Monitor gas prices

### Debug Mode

```typescript
// Enable debug logging
process.env.DEBUG = 'ctr-monitoring:*';

const monitoring = createMonitoringService('mainnet');
await monitoring.start();
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Run the test suite
6. Submit a pull request

## License

MIT License - see LICENSE file for details.
