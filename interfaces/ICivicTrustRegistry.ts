// TypeScript interfaces for CivicTrustRegistry contract integration

export enum BreachSeverity {
    NONE = 0,
    MINOR = 1,
    MODERATE = 2,
    SEVERE = 3,
    CRITICAL = 4
}

export enum EnforcementAction {
    NONE = 0,
    WARNING = 1,
    SUSPENSION = 2,
    PARTIAL_FALLBACK = 3,
    FULL_FALLBACK = 4,
    TERMINATION = 5
}

export interface EDAIEntry {
    edaiId: string;
    issuer: string;
    zkProofCommitment: string;
    breachFlag: boolean;
    breachSeverity: BreachSeverity;
    enforcementAction: EnforcementAction;
    breachTimestamp: number;
    lastUpdated: number;
    breachDescription: string;
    entryHash: string;
    isActive: boolean;
}

export interface BreachMetrics {
    totalBreaches: number;
    minorBreaches: number;
    moderateBreaches: number;
    severeBreaches: number;
    criticalBreaches: number;
    totalEnforcementActions: number;
    lastMetricsUpdate: number;
}

export interface BatchOperation {
    edaiIds: string[];
    zkProofCommitments: string[];
    breachFlags: boolean[];
    breachSeverities: BreachSeverity[];
    enforcementActions: EnforcementAction[];
    breachDescriptions: string[];
}

// Contract Events
export interface EDAIRegisteredEvent {
    edaiId: string;
    issuer: string;
    zkProofCommitment: string;
    breachFlag: boolean;
    breachSeverity: BreachSeverity;
    enforcementAction: EnforcementAction;
    breachTimestamp: number;
    entryHash: string;
}

export interface BreachUpdatedEvent {
    edaiId: string;
    oldSeverity: BreachSeverity;
    newSeverity: BreachSeverity;
    enforcementAction: EnforcementAction;
    timestamp: number;
}

export interface EnforcementActionExecutedEvent {
    edaiId: string;
    action: EnforcementAction;
    executor: string;
    timestamp: number;
}

export interface BatchOperationExecutedEvent {
    operator: string;
    batchSize: number;
    timestamp: number;
}

export interface EmergencyPausedEvent {
    operator: string;
    paused: boolean;
}

export interface DashboardOperatorUpdatedEvent {
    oldOperator: string;
    newOperator: string;
}

// Dashboard Integration Interface
export interface DashboardIntegration {
    // Core Registration Functions
    registerEDAI: (
        edaiId: string,
        zkProofCommitment: string,
        breachFlag: boolean,
        breachSeverity: BreachSeverity,
        enforcementAction: EnforcementAction,
        breachDescription: string,
        options?: TransactionOptions
    ) => Promise<TransactionResult>;

    batchRegisterEDAIs: (
        batch: BatchOperation,
        options?: TransactionOptions
    ) => Promise<TransactionResult>;

    // Breach Management Functions
    updateBreachAssessment: (
        edaiId: string,
        newSeverity: BreachSeverity,
        newEnforcementAction: EnforcementAction,
        updatedDescription: string,
        options?: TransactionOptions
    ) => Promise<TransactionResult>;

    executeEnforcementAction: (
        edaiId: string,
        options?: TransactionOptions
    ) => Promise<TransactionResult>;

    reactivateEDAI: (
        edaiId: string,
        options?: TransactionOptions
    ) => Promise<TransactionResult>;

    // Query Functions
    getBreachStatistics: () => Promise<BreachMetrics>;
    getEDAIEntry: (edaiId: string) => Promise<EDAIEntry>;
    getBatchEDAIEntries: (edaiIds: string[]) => Promise<EDAIEntry[]>;
    getIssuerEDAIs: (issuer: string) => Promise<string[]>;
    getEDAIHash: (edaiId: string) => Promise<string>;

    // Emergency Control Functions
    setEmergencyPause: (
        paused: boolean,
        options?: TransactionOptions
    ) => Promise<TransactionResult>;

    // Access Control Functions
    updateDashboardOperator: (
        newOperator: string,
        options?: TransactionOptions
    ) => Promise<TransactionResult>;

    grantBatchOperatorRole: (
        operator: string,
        options?: TransactionOptions
    ) => Promise<TransactionResult>;

    revokeBatchOperatorRole: (
        operator: string,
        options?: TransactionOptions
    ) => Promise<TransactionResult>;

    // Role Checking Functions
    hasRole: (role: string, account: string) => Promise<boolean>;
    getRoleMember: (role: string, index: number) => Promise<string>;

    // Event Listeners
    onEDAIRegistered: (callback: (event: EDAIRegisteredEvent) => void) => void;
    onBreachUpdated: (callback: (event: BreachUpdatedEvent) => void) => void;
    onEnforcementActionExecuted: (callback: (event: EnforcementActionExecutedEvent) => void) => void;
    onBatchOperationExecuted: (callback: (event: BatchOperationExecutedEvent) => void) => void;
    onEmergencyPaused: (callback: (event: EmergencyPausedEvent) => void) => void;
    onDashboardOperatorUpdated: (callback: (event: DashboardOperatorUpdatedEvent) => void) => void;

    // Contract State
    isPaused: () => Promise<boolean>;
    getContractAddress: () => string;
}

// Configuration Interfaces
export interface DashboardConfig {
    contractAddress: string;
    rpcUrl: string;
    networkId: number;
    dashboardOperatorPrivateKey: string;
    gasLimit?: number;
    gasPrice?: string;
    monitoringEnabled: boolean;
    alertWebhookUrl?: string;
}

export interface BreachAssessmentCriteria {
    severityThresholds: {
        minor: number;
        moderate: number;
        severe: number;
        critical: number;
    };
    assessmentMetrics: {
        responseTime: number;
        availability: number;
        accuracy: number;
        compliance: number;
    };
    enforcementRules: {
        [key in BreachSeverity]: EnforcementAction;
    };
}

export interface DashboardMetrics {
    realTime: {
        activeEDAIs: number;
        totalBreaches: number;
        pendingEnforcements: number;
        systemHealth: 'healthy' | 'warning' | 'critical';
    };
    historical: {
        breachesByDay: Array<{ date: string; count: number }>;
        enforcementActions: Array<{ action: EnforcementAction; count: number }>;
        severityDistribution: Array<{ severity: BreachSeverity; count: number }>;
    };
    performance: {
        averageResponseTime: number;
        gasUsage: number;
        transactionSuccessRate: number;
    };
}

// Transaction and Error Handling
export interface TransactionOptions {
    gasLimit?: number;
    gasPrice?: string;
    maxFeePerGas?: string;
    maxPriorityFeePerGas?: string;
    nonce?: number;
}

export interface TransactionResult {
    hash: string;
    blockNumber?: number;
    gasUsed?: number;
    status: 'pending' | 'confirmed' | 'failed';
    error?: string;
}

export interface ContractError {
    code: string;
    message: string;
    details?: any;
}

// Utility Functions
export const BreachSeverityNames: Record<BreachSeverity, string> = {
    [BreachSeverity.NONE]: 'None',
    [BreachSeverity.MINOR]: 'Minor',
    [BreachSeverity.MODERATE]: 'Moderate',
    [BreachSeverity.SEVERE]: 'Severe',
    [BreachSeverity.CRITICAL]: 'Critical'
};

export const EnforcementActionNames: Record<EnforcementAction, string> = {
    [EnforcementAction.NONE]: 'None',
    [EnforcementAction.WARNING]: 'Warning',
    [EnforcementAction.SUSPENSION]: 'Suspension',
    [EnforcementAction.PARTIAL_FALLBACK]: 'Partial Fallback',
    [EnforcementAction.FULL_FALLBACK]: 'Full Fallback',
    [EnforcementAction.TERMINATION]: 'Termination'
};

// Role Constants
export const ROLES = {
    DEFAULT_ADMIN_ROLE: '0x0000000000000000000000000000000000000000000000000000000000000000',
    DASHBOARD_OPERATOR_ROLE: '0x' + Buffer.from('DASHBOARD_OPERATOR_ROLE').toString('hex'),
    EMERGENCY_OPERATOR_ROLE: '0x' + Buffer.from('EMERGENCY_OPERATOR_ROLE').toString('hex'),
    BATCH_OPERATOR_ROLE: '0x' + Buffer.from('BATCH_OPERATOR_ROLE').toString('hex')
} as const;

// Validation Functions
export const validateBreachAssessment = (assessment: {
    severity: BreachSeverity;
    action: EnforcementAction;
    description: string;
}): boolean => {
    if (assessment.severity === BreachSeverity.NONE && assessment.action !== EnforcementAction.NONE) {
        return false;
    }
    if (assessment.description.length > 1000) {
        return false;
    }
    return true;
};

export const validateBatchOperation = (batch: BatchOperation): boolean => {
    if (batch.edaiIds.length === 0 || batch.edaiIds.length > 50) {
        return false;
    }
    if (batch.edaiIds.length !== batch.zkProofCommitments.length ||
        batch.edaiIds.length !== batch.breachFlags.length ||
        batch.edaiIds.length !== batch.breachSeverities.length ||
        batch.edaiIds.length !== batch.enforcementActions.length ||
        batch.edaiIds.length !== batch.breachDescriptions.length) {
        return false;
    }
    return true;
}; 