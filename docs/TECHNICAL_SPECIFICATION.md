# Technical Specification

## Overview

The CivicTrustRegistry is a smart contract that serves as the on-chain enforcement layer for Energy Dispatch Assurance Instruments (EDAIs). It integrates with the GVMS dashboard to provide comprehensive breach detection, assessment, and enforcement capabilities.

## Architecture

### System Components

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   GVMS Dashboard│    │ CivicTrustRegistry│    │  On-chain      │
│   (Diagnosis)   │◄──►│   (Enforcement)  │◄──►│  Actions        │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

### Data Flow

1. **Breach Detection**: GVMS dashboard analyzes CEDAI performance and detects violations
2. **Assessment Submission**: Dashboard submits breach assessment to registry
3. **Enforcement Execution**: Registry executes appropriate enforcement actions
4. **Metrics Feedback**: Registry provides real-time metrics back to dashboard

## Contract Specification

### Core Data Structures

#### BreachSeverity Enum
```solidity
enum BreachSeverity {
    NONE,           // 0 - No breach detected
    MINOR,          // 1 - Minor violation, warning issued
    MODERATE,       // 2 - Moderate breach, partial fallback
    SEVERE,         // 3 - Severe breach, full fallback
    CRITICAL        // 4 - Critical breach, immediate termination
}
```

#### EnforcementAction Enum
```solidity
enum EnforcementAction {
    NONE,           // 0 - No action required
    WARNING,        // 1 - Issue warning notification
    SUSPENSION,     // 2 - Temporary suspension
    PARTIAL_FALLBACK, // 3 - Partial fallback execution
    FULL_FALLBACK,  // 4 - Complete fallback execution
    TERMINATION     // 5 - Immediate contract termination
}
```

#### CEDAIEntry Struct
```solidity
struct CEDAIEntry {
    string cedaiId;                    // Unique identifier
    address issuer;                    // CEDAI issuer address
    bytes32 zkProofCommitment;         // Zero-knowledge proof hash
    bool breachFlag;                   // Breach status flag
    BreachSeverity breachSeverity;     // Severity level
    EnforcementAction enforcementAction; // Required action
    uint256 breachTimestamp;           // Breach detection time
    uint256 lastUpdated;               // Last modification time
    string breachDescription;          // Human-readable description
    bytes32 entryHash;                 // Cryptographic commitment
    bool isActive;                     // Active status
}
```

### Core Functions

#### Registration Functions

**registerCEDAI**
- **Purpose**: Register a new CEDAI with breach assessment
- **Access**: Public
- **Parameters**:
  - `cedaiId`: Unique identifier
  - `zkProofCommitment`: Zero-knowledge proof hash
  - `breachFlag`: Breach status
  - `breachSeverity`: Severity level
  - `enforcementAction`: Required action
  - `breachDescription`: Description
- **Events**: `CEDAIRegistered`

#### Assessment Functions

**updateBreachAssessment**
- **Purpose**: Update breach assessment from dashboard
- **Access**: Dashboard operator only
- **Parameters**:
  - `cedaiId`: CEDAI identifier
  - `newSeverity`: Updated severity
  - `newEnforcementAction`: Updated action
  - `updatedDescription`: Updated description
- **Events**: `BreachUpdated`

#### Enforcement Functions

**executeEnforcementAction**
- **Purpose**: Execute prescribed enforcement action
- **Access**: Dashboard operator only
- **Parameters**:
  - `cedaiId`: CEDAI identifier
- **Events**: `EnforcementActionExecuted`

**reactivateCEDAI**
- **Purpose**: Reactivate suspended CEDAI
- **Access**: Dashboard operator only
- **Parameters**:
  - `cedaiId`: CEDAI identifier

#### Query Functions

**getBreachStatistics**
- **Purpose**: Get global breach metrics
- **Returns**: BreachMetrics struct

**getCEDAIEntry**
- **Purpose**: Get complete CEDAI entry
- **Parameters**:
  - `cedaiId`: CEDAI identifier
- **Returns**: CEDAIEntry struct

**getIssuerCEDAIs**
- **Purpose**: Get all CEDAIs for an issuer
- **Parameters**:
  - `issuer`: Issuer address
- **Returns**: Array of CEDAI IDs

### Access Control

#### Modifiers

- **onlyDashboardOperator**: Restricts access to dashboard operator
- **whenNotPaused**: Prevents operations when contract is paused

#### Emergency Controls

- **setEmergencyPause**: Pause/unpause contract operations
- **updateDashboardOperator**: Change dashboard operator address

## Breach Assessment Criteria

### Severity Classification

#### MINOR (Level 1)
- **Threshold**: < 5% SLA violation
- **Action**: Warning notification
- **Response Time**: 24 hours

#### MODERATE (Level 2)
- **Threshold**: 5-15% SLA violation
- **Action**: Partial fallback execution
- **Response Time**: 4 hours

#### SEVERE (Level 3)
- **Threshold**: 15-30% SLA violation
- **Action**: Full fallback execution
- **Response Time**: 1 hour

#### CRITICAL (Level 4)
- **Threshold**: > 30% SLA violation
- **Action**: Immediate termination
- **Response Time**: Immediate

### Assessment Metrics

The GVMS dashboard should consider the following metrics when assessing breaches:

1. **Service Level Agreement (SLA) Compliance**
   - Response time violations
   - Availability violations
   - Throughput violations

2. **Financial Impact**
   - Loss of funds
   - Opportunity cost
   - Reputation damage

3. **Security Violations**
   - Unauthorized access attempts
   - Data breaches
   - Protocol violations

4. **Operational Issues**
   - System failures
   - Network issues
   - Resource exhaustion

## Dashboard Integration

### Event Monitoring

The dashboard should monitor the following events:

```javascript
// CEDAI Registration
contract.on("CEDAIRegistered", (cedaiId, issuer, ...) => {
    // Update dashboard metrics
    // Trigger notifications
});

// Breach Updates
contract.on("BreachUpdated", (cedaiId, oldSeverity, newSeverity, ...) => {
    // Update breach tracking
    // Trigger alerts
});

// Enforcement Actions
contract.on("EnforcementActionExecuted", (cedaiId, action, ...) => {
    // Update enforcement tracking
    // Log action execution
});
```

### Real-time Metrics

The dashboard should display:

1. **Current Status**
   - Total CEDAIs
   - Active CEDAIs
   - Breached CEDAIs
   - Enforcement actions

2. **Historical Data**
   - Breach trends
   - Enforcement patterns
   - Issuer performance

3. **Analytics**
   - Risk assessment
   - Predictive analysis
   - Performance metrics

### API Integration

```typescript
interface DashboardIntegration {
    // Submit breach assessment
    submitBreachAssessment(cedaiId: string, data: BreachData): Promise<void>;
    
    // Execute enforcement
    executeEnforcement(cedaiId: string): Promise<void>;
    
    // Get metrics
    getMetrics(): Promise<BreachMetrics>;
    
    // Monitor events
    setupEventMonitoring(): void;
}
```

## Security Considerations

### Access Control
- Only dashboard operator can update assessments
- Emergency pause functionality
- Operator address management

### Data Integrity
- Immutable breach records
- Cryptographic commitments
- Audit trail preservation

### Gas Optimization
- Efficient storage patterns
- Batch operations where possible
- Event-driven updates

## Deployment Configuration

### Network Requirements
- **Testnet**: Sepolia or Goerli for testing
- **Mainnet**: Ethereum mainnet for production
- **Gas Limits**: 3,000,000 gas limit recommended
- **Gas Price**: Dynamic pricing based on network conditions

### Environment Variables
```bash
# Required
PRIVATE_KEY=your_private_key
DASHBOARD_OPERATOR=operator_address
CONTRACT_ADDRESS=deployed_contract_address

# Optional
RPC_URL=your_rpc_endpoint
ETHERSCAN_API_KEY=your_api_key
```

## Testing Strategy

### Unit Tests
- Function behavior validation
- Access control verification
- Event emission testing

### Integration Tests
- Dashboard-contract interaction
- Event monitoring
- Error handling

### Security Tests
- Access control validation
- Emergency pause functionality
- Operator management

## Monitoring and Maintenance

### Health Checks
- Contract availability
- Event emission monitoring
- Gas usage tracking

### Alerting
- Breach detection alerts
- Enforcement action notifications
- System health warnings

### Maintenance
- Regular security audits
- Performance optimization
- Feature updates

## Future Enhancements

### Planned Features
1. **Multi-signature enforcement**: Require multiple approvals for critical actions
2. **Time-based escalations**: Automatic severity increases for unresolved breaches
3. **DeFi protocol integration**: Direct fallback execution
4. **Cross-chain enforcement**: Multi-chain breach coordination
5. **AI-powered assessment**: Automated breach severity classification

### Scalability Considerations
- Layer 2 solutions for gas optimization
- Batch processing for multiple CEDAIs
- Off-chain computation with on-chain verification 