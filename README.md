# CivicTrustRegistry

This Solidity contract implements the on-chain enforcement layer for Energy Dispatch Assurance Instruments (EDAIs). It records breach events, manages enforcement actions, and provides comprehensive metrics for the GVMS dashboard integration. The contract serves as the authoritative source for breach attestations and enforcement actions.

## Features

- **Breach Registration**: Records verifiable EDAI breaches with severity assessment
- **Enforcement Actions**: Automated and manual enforcement based on breach severity
- **Compliance Tracking**: Comprehensive audit trail for regulatory compliance
- **Dashboard Integration**: Real-time metrics and event streaming for GVMS
- **Multi-Issuer Support**: Supports multiple issuers with role-based access control
- **Upgradeable Architecture**: UUPS upgradeable contract for future enhancements

## Contract Architecture

### Core Components

1. **Breach Management**: Centralized breach registration and assessment
2. **Enforcement Engine**: Automated enforcement actions based on severity
3. **Compliance Framework**: Regulatory compliance and audit capabilities
4. **Dashboard Integration**: Real-time data streaming for GVMS
5. **Access Control**: Role-based permissions for issuers and administrators

### EDAI Entry Structure
- `edaiId`: Unique identifier
- `issuer`: Issuer address
- `breachFlag`: Current breach status
- `severity`: Breach severity level
- `action`: Enforcement action taken
- `isActive`: Active status
- `registrationTime`: Registration timestamp
- `lastUpdated`: Last update timestamp

## Usage

### Basic Registration

```solidity
// Register a new EDAI
registry.registerEDAI(
    "EDAI-7f2a3c",
    issuerAddress,
    "Initial registration"
);
```

### Registering an EDAI with Breach Assessment

```solidity
// Register EDAI with moderate breach
registry.registerEDAI(
    "EDAI-7f2a3c",
    issuerAddress,
    "Initial registration"
);

// Assess breach severity
registry.assessBreach(
    "EDAI-7f2a3c",
    BreachSeverity.MODERATE,
    "Grid stability violation"
);
```

### Enforcement Actions

```solidity
// Execute enforcement action
registry.executeEnforcementAction("EDAI-7f2a3c");
```

## Events

### Core Events

- `EDAIRegistered`: New EDAI registration
- `BreachAssessed`: Breach severity assessment
- `EnforcementActionExecuted`: Enforcement action completion
- `EDAIStatusUpdated`: Status change notification

### Event Monitoring

```javascript
registry.on("BreachUpdated", (edaiId, oldSeverity, newSeverity, action, timestamp) => {
    console.log(`Breach updated for ${edaiId}: ${oldSeverity} -> ${newSeverity}`);
});
```

## API Reference

### Core Functions

- `registerEDAI(edaiId, issuer, description)`: Register new EDAI
- `assessBreach(edaiId, severity, description)`: Assess breach severity
- `executeEnforcementAction(edaiId)`: Execute enforcement action
- `getEDAIEntry(edaiId)`: Returns complete entry for analysis
- `getIssuerEDAIs(issuer)`: Returns all EDAIs for an issuer

### Management Functions

- `pause()`: Pause contract operations
- `unpause()`: Resume contract operations
- `reactivateEDAI()`: Reactivates suspended EDAIs
- `updateEnforcementThresholds()`: Update enforcement parameters

## Events

### Registration Events

- `EDAIRegistered`: New EDAI registration
- `BreachAssessed`: Breach severity assessment
- `EnforcementActionExecuted`: Enforcement action completion
- `EDAIStatusUpdated`: Status change notification

### Event Monitoring

```javascript
registry.on("BreachUpdated", (edaiId, oldSeverity, newSeverity, action, timestamp) => {
    console.log(`Breach updated for ${edaiId}: ${oldSeverity} -> ${newSeverity}`);
});
```
