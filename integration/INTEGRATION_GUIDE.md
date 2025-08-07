# GVMS Dashboard Integration Guide

## Overview

This guide provides comprehensive instructions for integrating the GVMS dashboard with the CivicTrustRegistry smart contract. The integration enables real-time breach monitoring, automated enforcement actions, and seamless dashboard operations.

## Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────────┐
│   GVMS Dashboard│    │  Dashboard Adapter│    │ CivicTrustRegistry  │
│                 │◄──►│                  │◄──►│   Smart Contract     │
│ • UI Components │    │ • Event Monitoring│    │ • CEDAI Storage      │
│ • Analytics     │    │ • Metrics Cache  │    │ • Breach Management  │
│ • Alerts        │    │ • API Interface  │    │ • Enforcement Logic  │
└─────────────────┘    └──────────────────┘    └─────────────────────┘
```

## Quick Start

### 1. Install Dependencies

```bash
npm install ethers@^6.7.0 dotenv@^16.3.1
```

### 2. Configure Environment

Create a `.env` file in your GVMS dashboard project:

```env
# Contract Configuration
CONTRACT_ADDRESS=0x1234567890123456789012345678901234567890
RPC_URL=https://sepolia.infura.io/v3/YOUR-PROJECT-ID
NETWORK_ID=11155111

# Dashboard Operator
DASHBOARD_OPERATOR_PRIVATE_KEY=your_private_key_here

# Gas Configuration
GAS_LIMIT=3000000
GAS_PRICE=20000000000

# Monitoring
MONITORING_ENABLED=true
ALERT_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK
```

### 3. Initialize Dashboard Adapter

```javascript
const GVMSDashboardAdapter = require('./integration/gvms-dashboard-adapter');

const adapter = new GVMSDashboardAdapter({
    contractAddress: process.env.CONTRACT_ADDRESS,
    rpcUrl: process.env.RPC_URL,
    dashboardOperatorPrivateKey: process.env.DASHBOARD_OPERATOR_PRIVATE_KEY,
    gasLimit: parseInt(process.env.GAS_LIMIT),
    gasPrice: process.env.GAS_PRICE,
    monitoringEnabled: process.env.MONITORING_ENABLED === 'true',
    alertWebhookUrl: process.env.ALERT_WEBHOOK_URL
});

await adapter.initialize();
```

## Core Integration Features

### 1. Real-Time Metrics

Get comprehensive dashboard metrics:

```javascript
const metrics = await adapter.getDashboardMetrics();

console.log('System Health:', metrics.realTime.systemHealth);
console.log('Total Breaches:', metrics.realTime.totalBreaches);
console.log('Active CEDAIs:', metrics.realTime.activeCEDAIs);
console.log('System Paused:', metrics.systemStatus.isPaused);
```

**Response Structure:**
```javascript
{
    realTime: {
        activeCEDAIs: number,
        totalBreaches: number,
        pendingEnforcements: number,
        systemHealth: 'healthy' | 'warning' | 'critical'
    },
    breachStatistics: {
        totalBreaches: number,
        minorBreaches: number,
        moderateBreaches: number,
        severeBreaches: number,
        criticalBreaches: number,
        totalEnforcementActions: number,
        lastMetricsUpdate: number
    },
    systemStatus: {
        isPaused: boolean,
        contractAddress: string,
        networkId: number
    }
}
```

### 2. Breach Assessment Submission

Submit breach assessments from the dashboard:

```javascript
const assessment = {
    severity: 2, // MODERATE
    enforcementAction: 3, // PARTIAL_FALLBACK
    description: 'Service level violation detected by monitoring system'
};

const result = await adapter.submitBreachAssessment('CEDAI-001', assessment);

if (result.success) {
    console.log('Assessment submitted:', result.txHash);
}
```

**Severity Levels:**
- `0` - NONE
- `1` - MINOR
- `2` - MODERATE
- `3` - SEVERE
- `4` - CRITICAL

**Enforcement Actions:**
- `0` - NONE
- `1` - WARNING
- `2` - SUSPENSION
- `3` - PARTIAL_FALLBACK
- `4` - FULL_FALLBACK
- `5` - TERMINATION

### 3. Enforcement Action Execution

Execute enforcement actions:

```javascript
const result = await adapter.executeEnforcementAction('CEDAI-001');

if (result.success) {
    console.log('Enforcement executed:', result.txHash);
}
```

### 4. Emergency Controls

Emergency pause/resume functionality:

```javascript
// Pause system
await adapter.emergencyPause(true);

// Resume system
await adapter.emergencyPause(false);
```

### 5. CEDAI Information Retrieval

Get detailed CEDAI information:

```javascript
const cedaiInfo = await adapter.getCEDAIInfo('CEDAI-001');

console.log('CEDAI ID:', cedaiInfo.cedaiId);
console.log('Issuer:', cedaiInfo.issuer);
console.log('Breach Flag:', cedaiInfo.breachFlag);
console.log('Severity:', cedaiInfo.severityName);
console.log('Action:', cedaiInfo.actionName);
console.log('Active:', cedaiInfo.isActive);
```

## Event Monitoring

### 1. Setup Event Listeners

```javascript
// Monitor CEDAI registrations
adapter.on('cedaiRegistered', (event) => {
    console.log('New CEDAI registered:', event.cedaiId);
    if (event.breachFlag) {
        console.log('Breach detected:', event.severity);
    }
});

// Monitor breach updates
adapter.on('breachUpdated', (event) => {
    console.log('Breach updated:', {
        cedaiId: event.cedaiId,
        oldSeverity: event.oldSeverity,
        newSeverity: event.newSeverity
    });
});

// Monitor enforcement actions
adapter.on('enforcementActionExecuted', (event) => {
    console.log('Enforcement executed:', {
        cedaiId: event.cedaiId,
        action: event.action,
        executor: event.executor
    });
});

// Monitor emergency pauses
adapter.on('emergencyPaused', (event) => {
    console.log('Emergency pause:', {
        operator: event.operator,
        paused: event.paused
    });
});
```

### 2. Event Data Structure

**CEDAI Registered Event:**
```javascript
{
    cedaiId: string,
    issuer: string,
    zkProofCommitment: string,
    breachFlag: boolean,
    breachSeverity: number,
    enforcementAction: number,
    breachTimestamp: number,
    entryHash: string
}
```

**Breach Updated Event:**
```javascript
{
    cedaiId: string,
    oldSeverity: number,
    newSeverity: number,
    enforcementAction: number,
    timestamp: number
}
```

**Enforcement Action Executed Event:**
```javascript
{
    cedaiId: string,
    action: number,
    executor: string,
    timestamp: number
}
```

## Dashboard Integration Patterns

### 1. Real-Time Dashboard Updates

```javascript
class DashboardManager {
    constructor(adapter) {
        this.adapter = adapter;
        this.metricsInterval = null;
        this.setupEventMonitoring();
    }

    setupEventMonitoring() {
        // Update dashboard on CEDAI registration
        this.adapter.on('cedaiRegistered', (event) => {
            this.updateDashboardMetrics();
            this.showNotification('New CEDAI registered', event);
        });

        // Update dashboard on breach updates
        this.adapter.on('breachUpdated', (event) => {
            this.updateDashboardMetrics();
            this.showBreachAlert(event);
        });

        // Update dashboard on enforcement actions
        this.adapter.on('enforcementActionExecuted', (event) => {
            this.updateDashboardMetrics();
            this.showEnforcementNotification(event);
        });
    }

    async updateDashboardMetrics() {
        const metrics = await this.adapter.getDashboardMetrics();
        this.updateUI(metrics);
    }

    startMetricsPolling() {
        this.metricsInterval = setInterval(() => {
            this.updateDashboardMetrics();
        }, 30000); // Update every 30 seconds
    }

    stopMetricsPolling() {
        if (this.metricsInterval) {
            clearInterval(this.metricsInterval);
            this.metricsInterval = null;
        }
    }
}
```

### 2. Breach Assessment Workflow

```javascript
class BreachAssessmentManager {
    constructor(adapter) {
        this.adapter = adapter;
    }

    async assessBreach(cedaiId, assessmentData) {
        try {
            // Validate assessment data
            this.validateAssessment(assessmentData);

            // Submit assessment
            const result = await this.adapter.submitBreachAssessment(cedaiId, assessmentData);

            if (result.success) {
                // Update UI
                this.updateBreachDisplay(cedaiId, assessmentData);
                
                // Show success notification
                this.showNotification('Assessment submitted successfully', result);
                
                return result;
            }
        } catch (error) {
            console.error('Assessment failed:', error);
            this.showError('Assessment submission failed', error.message);
            throw error;
        }
    }

    validateAssessment(assessment) {
        if (assessment.severity < 0 || assessment.severity > 4) {
            throw new Error('Invalid severity level');
        }
        if (assessment.enforcementAction < 0 || assessment.enforcementAction > 5) {
            throw new Error('Invalid enforcement action');
        }
        if (!assessment.description || assessment.description.length > 1000) {
            throw new Error('Invalid description');
        }
    }
}
```

### 3. Emergency Response System

```javascript
class EmergencyResponseManager {
    constructor(adapter) {
        this.adapter = adapter;
        this.setupEmergencyMonitoring();
    }

    setupEmergencyMonitoring() {
        this.adapter.on('emergencyPaused', (event) => {
            if (event.paused) {
                this.activateEmergencyMode();
            } else {
                this.deactivateEmergencyMode();
            }
        });
    }

    async activateEmergencyMode() {
        // Show emergency UI
        this.showEmergencyUI();
        
        // Disable non-critical operations
        this.disableNonCriticalOperations();
        
        // Send emergency notifications
        this.sendEmergencyNotifications();
    }

    async deactivateEmergencyMode() {
        // Hide emergency UI
        this.hideEmergencyUI();
        
        // Re-enable operations
        this.enableOperations();
        
        // Send recovery notifications
        this.sendRecoveryNotifications();
    }

    async triggerEmergencyPause() {
        try {
            const result = await this.adapter.emergencyPause(true);
            console.log('Emergency pause triggered:', result.txHash);
        } catch (error) {
            console.error('Emergency pause failed:', error);
        }
    }
}
```

## Error Handling

### 1. Network Errors

```javascript
try {
    const metrics = await adapter.getDashboardMetrics();
} catch (error) {
    if (error.code === 'NETWORK_ERROR') {
        console.error('Network connection failed');
        this.showOfflineMode();
    } else if (error.code === 'CONTRACT_ERROR') {
        console.error('Contract interaction failed');
        this.showContractError(error);
    } else {
        console.error('Unexpected error:', error);
        this.showGenericError(error);
    }
}
```

### 2. Transaction Failures

```javascript
async function submitAssessmentWithRetry(cedaiId, assessment, maxRetries = 3) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const result = await adapter.submitBreachAssessment(cedaiId, assessment);
            return result;
        } catch (error) {
            if (attempt === maxRetries) {
                throw error;
            }
            
            console.log(`Attempt ${attempt} failed, retrying...`);
            await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }
    }
}
```

## Performance Optimization

### 1. Metrics Caching

The adapter automatically caches metrics for 30 seconds to improve performance:

```javascript
// First call - fetches from blockchain
const metrics1 = await adapter.getDashboardMetrics();

// Second call within 30 seconds - returns cached data
const metrics2 = await adapter.getDashboardMetrics();
```

### 2. Batch Operations

For multiple operations, use batch processing:

```javascript
// Instead of multiple individual calls
for (const cedaiId of cedaiIds) {
    await adapter.getCEDAIInfo(cedaiId);
}

// Use batch retrieval
const entries = await adapter.contract.getBatchCEDAIEntries(cedaiIds);
```

### 3. Event-Driven Updates

Use events instead of polling for real-time updates:

```javascript
// Good: Event-driven
adapter.on('breachUpdated', (event) => {
    this.updateBreachDisplay(event.cedaiId);
});

// Avoid: Polling
setInterval(async () => {
    const cedaiInfo = await adapter.getCEDAIInfo(cedaiId);
    this.updateBreachDisplay(cedaiInfo);
}, 5000);
```

## Security Considerations

### 1. Private Key Management

- Never hardcode private keys in source code
- Use environment variables or secure key management systems
- Consider using hardware wallets for production deployments

### 2. Access Control

- Verify dashboard operator permissions before operations
- Implement role-based access control in the dashboard
- Audit all contract interactions

### 3. Input Validation

- Validate all user inputs before submitting to the contract
- Sanitize descriptions and other string inputs
- Check severity and action values are within valid ranges

## Testing

### 1. Run Integration Tests

```bash
npm test integration/integration-test.js
```

### 2. Test Coverage

The integration test suite covers:
- Adapter initialization
- Metrics retrieval
- Breach assessment submission
- Enforcement action execution
- Emergency controls
- Event monitoring
- Error handling
- Performance testing

### 3. Manual Testing

```javascript
// Test script for manual verification
async function testIntegration() {
    const adapter = new GVMSDashboardAdapter(config);
    await adapter.initialize();
    
    // Test metrics
    const metrics = await adapter.getDashboardMetrics();
    console.log('Metrics:', metrics);
    
    // Test CEDAI info
    const cedaiInfo = await adapter.getCEDAIInfo('TEST-001');
    console.log('CEDAI Info:', cedaiInfo);
    
    // Test emergency pause
    await adapter.emergencyPause(true);
    console.log('System paused');
    
    await adapter.emergencyPause(false);
    console.log('System resumed');
}
```

## Troubleshooting

### Common Issues

1. **Connection Failed**
   - Check RPC URL configuration
   - Verify network connectivity
   - Ensure contract address is correct

2. **Permission Denied**
   - Verify dashboard operator private key
   - Check if the address has required roles
   - Ensure contract is deployed and accessible

3. **Transaction Failed**
   - Check gas limit and price settings
   - Verify account has sufficient balance
   - Check contract state (paused, etc.)

4. **Event Monitoring Not Working**
   - Ensure monitoring is enabled in configuration
   - Check event listener setup
   - Verify contract events are being emitted

### Debug Mode

Enable debug logging:

```javascript
const adapter = new GVMSDashboardAdapter({
    ...config,
    debug: true
});
```

## Support

For integration support:
1. Check the test suite for examples
2. Review the TypeScript interfaces
3. Consult the contract documentation
4. Run integration tests to verify functionality

## Next Steps

1. **Deploy to Testnet**: Test the integration on Sepolia testnet
2. **Security Audit**: Conduct security review of integration code
3. **Performance Testing**: Load test the integration
4. **Production Deployment**: Deploy to mainnet with proper monitoring 