const { ethers } = require('ethers');
require('dotenv').config();

/**
 * GVMS Dashboard Integration with CivicTrustRegistry
 * 
 * This example demonstrates how the GVMS dashboard can integrate with
 * the CivicTrustRegistry smart contract for breach management and enforcement.
 */
class GVMSDashboardIntegration {
    constructor(config) {
        this.config = config;
        this.provider = null;
        this.contract = null;
        this.signer = null;
        this.isInitialized = false;
    }

    /**
     * Initialize the dashboard integration
     */
    async initialize() {
        try {
            console.log('🚀 Initializing GVMS Dashboard Integration...');
            
            // Setup provider
            this.provider = new ethers.JsonRpcProvider(this.config.rpcUrl);
            
            // Setup signer for dashboard operations
            this.signer = new ethers.Wallet(this.config.dashboardOperatorPrivateKey, this.provider);
            
            // Load contract ABI and create contract instance
            const contractABI = require('../artifacts/contracts/CivicTrustRegistry.sol/CivicTrustRegistry.json').abi;
            this.contract = new ethers.Contract(this.config.contractAddress, contractABI, this.signer);
            
            // Verify connection
            await this.contract.getBreachStatistics();
            
            this.isInitialized = true;
            console.log('✅ Dashboard integration initialized successfully');
            
            // Setup event monitoring
            if (this.config.monitoringEnabled) {
                await this.setupEventMonitoring();
            }
            
        } catch (error) {
            console.error('❌ Failed to initialize dashboard integration:', error);
            throw error;
        }
    }

    /**
     * Setup real-time event monitoring
     */
    async setupEventMonitoring() {
        console.log('📡 Setting up event monitoring...');
        
        // Monitor CEDAI registrations
        this.contract.on('CEDAIRegistered', (cedaiId, issuer, zkProofCommitment, breachFlag, breachSeverity, enforcementAction, breachTimestamp, entryHash) => {
            console.log('📝 CEDAI Registered:', {
                cedaiId,
                issuer,
                breachFlag,
                severity: this.getSeverityName(breachSeverity),
                action: this.getActionName(enforcementAction),
                timestamp: new Date(breachTimestamp * 1000).toISOString()
            });
            
            // Send alert if breach detected
            if (breachFlag && this.config.alertWebhookUrl) {
                this.sendAlert('CEDAI Breach Detected', {
                    cedaiId,
                    severity: this.getSeverityName(breachSeverity),
                    action: this.getActionName(enforcementAction)
                });
            }
        });

        // Monitor breach updates
        this.contract.on('BreachUpdated', (cedaiId, oldSeverity, newSeverity, enforcementAction, timestamp) => {
            console.log('🔄 Breach Updated:', {
                cedaiId,
                oldSeverity: this.getSeverityName(oldSeverity),
                newSeverity: this.getSeverityName(newSeverity),
                action: this.getActionName(enforcementAction),
                timestamp: new Date(timestamp * 1000).toISOString()
            });
        });

        // Monitor enforcement actions
        this.contract.on('EnforcementActionExecuted', (cedaiId, action, executor, timestamp) => {
            console.log('⚡ Enforcement Action Executed:', {
                cedaiId,
                action: this.getActionName(action),
                executor,
                timestamp: new Date(timestamp * 1000).toISOString()
            });
        });

        // Monitor batch operations
        this.contract.on('BatchOperationExecuted', (operator, batchSize, timestamp) => {
            console.log('📦 Batch Operation Executed:', {
                operator,
                batchSize: batchSize.toString(),
                timestamp: new Date(timestamp * 1000).toISOString()
            });
        });

        // Monitor emergency controls
        this.contract.on('EmergencyPaused', (operator, paused) => {
            console.log('🚨 Emergency Control:', {
                operator,
                paused,
                timestamp: new Date().toISOString()
            });
        });

        console.log('✅ Event monitoring setup complete');
    }

    /**
     * Submit breach assessment from dashboard analysis
     */
    async submitBreachAssessment(cedaiId, assessment) {
        if (!this.isInitialized) {
            throw new Error('Dashboard integration not initialized');
        }

        try {
            console.log(`🔍 Submitting breach assessment for ${cedaiId}...`);
            
            // Validate assessment data
            if (!this.validateAssessmentData(assessment)) {
                throw new Error('Invalid assessment data');
            }

            const tx = await this.contract.updateBreachAssessment(
                cedaiId,
                assessment.severity,
                assessment.enforcementAction,
                assessment.description,
                { gasLimit: this.config.gasLimit || 300000 }
            );

            console.log(`⏳ Transaction submitted: ${tx.hash}`);
            const receipt = await tx.wait();
            console.log(`✅ Breach assessment updated in block ${receipt.blockNumber}`);

            return {
                success: true,
                transactionHash: tx.hash,
                blockNumber: receipt.blockNumber,
                gasUsed: receipt.gasUsed.toString()
            };

        } catch (error) {
            console.error('❌ Failed to submit breach assessment:', error);
            throw error;
        }
    }

    /**
     * Execute enforcement action based on breach severity
     */
    async executeEnforcement(cedaiId) {
        if (!this.isInitialized) {
            throw new Error('Dashboard integration not initialized');
        }

        try {
            console.log(`⚡ Executing enforcement for ${cedaiId}...`);
            
            const tx = await this.contract.executeEnforcementAction(
                cedaiId,
                { gasLimit: this.config.gasLimit || 200000 }
            );

            console.log(`⏳ Enforcement transaction submitted: ${tx.hash}`);
            const receipt = await tx.wait();
            console.log(`✅ Enforcement executed in block ${receipt.blockNumber}`);

            return {
                success: true,
                transactionHash: tx.hash,
                blockNumber: receipt.blockNumber,
                gasUsed: receipt.gasUsed.toString()
            };

        } catch (error) {
            console.error('❌ Failed to execute enforcement:', error);
            throw error;
        }
    }

    /**
     * Batch register multiple CEDAIs (gas efficient)
     */
    async batchRegisterCEDAIs(batchData) {
        if (!this.isInitialized) {
            throw new Error('Dashboard integration not initialized');
        }

        try {
            console.log(`📦 Batch registering ${batchData.cedaiIds.length} CEDAIs...`);
            
            // Validate batch data
            if (!this.validateBatchData(batchData)) {
                throw new Error('Invalid batch data');
            }

            const tx = await this.contract.batchRegisterCEDAIs(
                batchData,
                { gasLimit: this.config.gasLimit || 1000000 }
            );

            console.log(`⏳ Batch transaction submitted: ${tx.hash}`);
            const receipt = await tx.wait();
            console.log(`✅ Batch registration completed in block ${receipt.blockNumber}`);

            return {
                success: true,
                transactionHash: tx.hash,
                blockNumber: receipt.blockNumber,
                gasUsed: receipt.gasUsed.toString(),
                batchSize: batchData.cedaiIds.length
            };

        } catch (error) {
            console.error('❌ Failed to batch register CEDAIs:', error);
            throw error;
        }
    }

    /**
     * Get comprehensive dashboard metrics
     */
    async getDashboardMetrics() {
        if (!this.isInitialized) {
            throw new Error('Dashboard integration not initialized');
        }

        try {
            console.log('📊 Fetching dashboard metrics...');
            
            const [breachStats, isPaused] = await Promise.all([
                this.contract.getBreachStatistics(),
                this.contract.paused()
            ]);

            const metrics = {
                realTime: {
                    totalBreaches: breachStats.totalBreaches.toString(),
                    minorBreaches: breachStats.minorBreaches.toString(),
                    moderateBreaches: breachStats.moderateBreaches.toString(),
                    severeBreaches: breachStats.severeBreaches.toString(),
                    criticalBreaches: breachStats.criticalBreaches.toString(),
                    totalEnforcementActions: breachStats.totalEnforcementActions.toString(),
                    lastMetricsUpdate: new Date(breachStats.lastMetricsUpdate * 1000).toISOString(),
                    isPaused: isPaused
                },
                systemHealth: this.calculateSystemHealth(breachStats)
            };

            console.log('✅ Dashboard metrics retrieved');
            return metrics;

        } catch (error) {
            console.error('❌ Failed to get dashboard metrics:', error);
            throw error;
        }
    }

    /**
     * Get detailed CEDAI information
     */
    async getCEDAIInfo(cedaiId) {
        if (!this.isInitialized) {
            throw new Error('Dashboard integration not initialized');
        }

        try {
            console.log(`🔍 Fetching CEDAI info for ${cedaiId}...`);
            
            const entry = await this.contract.getCEDAIEntry(cedaiId);
            
            if (entry.cedaiId === '') {
                throw new Error('CEDAI not found');
            }

            const info = {
                cedaiId: entry.cedaiId,
                issuer: entry.issuer,
                breachFlag: entry.breachFlag,
                breachSeverity: this.getSeverityName(entry.breachSeverity),
                enforcementAction: this.getActionName(entry.enforcementAction),
                breachTimestamp: new Date(entry.breachTimestamp * 1000).toISOString(),
                lastUpdated: new Date(entry.lastUpdated * 1000).toISOString(),
                breachDescription: entry.breachDescription,
                isActive: entry.isActive,
                entryHash: entry.entryHash
            };

            console.log('✅ CEDAI info retrieved');
            return info;

        } catch (error) {
            console.error('❌ Failed to get CEDAI info:', error);
            throw error;
        }
    }

    /**
     * Emergency pause/unpause functionality
     */
    async emergencyPause(paused) {
        if (!this.isInitialized) {
            throw new Error('Dashboard integration not initialized');
        }

        try {
            console.log(`🚨 ${paused ? 'Pausing' : 'Unpausing'} contract...`);
            
            const tx = await this.contract.setEmergencyPause(
                paused,
                { gasLimit: this.config.gasLimit || 100000 }
            );

            console.log(`⏳ Emergency control transaction submitted: ${tx.hash}`);
            const receipt = await tx.wait();
            console.log(`✅ Contract ${paused ? 'paused' : 'unpaused'} in block ${receipt.blockNumber}`);

            return {
                success: true,
                transactionHash: tx.hash,
                blockNumber: receipt.blockNumber,
                gasUsed: receipt.gasUsed.toString(),
                paused: paused
            };

        } catch (error) {
            console.error('❌ Failed to set emergency pause:', error);
            throw error;
        }
    }

    /**
     * Grant batch operator role to new address
     */
    async grantBatchOperatorRole(operatorAddress) {
        if (!this.isInitialized) {
            throw new Error('Dashboard integration not initialized');
        }

        try {
            console.log(`🔐 Granting batch operator role to ${operatorAddress}...`);
            
            const tx = await this.contract.grantBatchOperatorRole(
                operatorAddress,
                { gasLimit: this.config.gasLimit || 100000 }
            );

            console.log(`⏳ Role grant transaction submitted: ${tx.hash}`);
            const receipt = await tx.wait();
            console.log(`✅ Batch operator role granted in block ${receipt.blockNumber}`);

            return {
                success: true,
                transactionHash: tx.hash,
                blockNumber: receipt.blockNumber,
                gasUsed: receipt.gasUsed.toString(),
                operator: operatorAddress
            };

        } catch (error) {
            console.error('❌ Failed to grant batch operator role:', error);
            throw error;
        }
    }

    // Helper methods
    getSeverityName(severity) {
        const names = ['None', 'Minor', 'Moderate', 'Severe', 'Critical'];
        return names[severity] || 'Unknown';
    }

    getActionName(action) {
        const names = ['None', 'Warning', 'Suspension', 'Partial Fallback', 'Full Fallback', 'Termination'];
        return names[action] || 'Unknown';
    }

    validateAssessmentData(assessment) {
        return assessment &&
               typeof assessment.severity === 'number' &&
               typeof assessment.enforcementAction === 'number' &&
               typeof assessment.description === 'string' &&
               assessment.description.length <= 1000;
    }

    validateBatchData(batchData) {
        return batchData &&
               Array.isArray(batchData.cedaiIds) &&
               batchData.cedaiIds.length > 0 &&
               batchData.cedaiIds.length <= 50 &&
               batchData.cedaiIds.length === batchData.zkProofCommitments.length &&
               batchData.cedaiIds.length === batchData.breachFlags.length &&
               batchData.cedaiIds.length === batchData.breachSeverities.length &&
               batchData.cedaiIds.length === batchData.enforcementActions.length &&
               batchData.cedaiIds.length === batchData.breachDescriptions.length;
    }

    calculateSystemHealth(breachStats) {
        const totalBreaches = Number(breachStats.totalBreaches);
        const criticalBreaches = Number(breachStats.criticalBreaches);
        const severeBreaches = Number(breachStats.severeBreaches);

        if (criticalBreaches > 0) return 'critical';
        if (severeBreaches > 0) return 'warning';
        if (totalBreaches > 0) return 'healthy';
        return 'healthy';
    }

    async sendAlert(title, data) {
        if (!this.config.alertWebhookUrl) return;

        try {
            const response = await fetch(this.config.alertWebhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title, data, timestamp: new Date().toISOString() })
            });
            
            if (!response.ok) {
                console.warn('⚠️ Alert webhook failed:', response.status);
            }
        } catch (error) {
            console.warn('⚠️ Failed to send alert:', error);
        }
    }
}

// Example usage
async function exampleUsage() {
    const config = {
        contractAddress: process.env.DASHBOARD_CONTRACT_ADDRESS,
        rpcUrl: process.env.DASHBOARD_RPC_URL,
        networkId: parseInt(process.env.DASHBOARD_NETWORK_ID || '1'),
        dashboardOperatorPrivateKey: process.env.DASHBOARD_OPERATOR_PRIVATE_KEY,
        gasLimit: parseInt(process.env.GAS_LIMIT || '300000'),
        gasPrice: process.env.GAS_PRICE || '20000000000',
        monitoringEnabled: process.env.MONITORING_ENABLED === 'true',
        alertWebhookUrl: process.env.ALERT_WEBHOOK_URL
    };

    const dashboard = new GVMSDashboardIntegration(config);

    try {
        // Initialize dashboard
        await dashboard.initialize();

        // Get current metrics
        const metrics = await dashboard.getDashboardMetrics();
        console.log('📊 Current Metrics:', metrics);

        // Example: Submit breach assessment
        const assessment = {
            severity: 2, // MODERATE
            enforcementAction: 3, // PARTIAL_FALLBACK
            description: 'Service level agreement violation detected by dashboard analysis'
        };

        // await dashboard.submitBreachAssessment('CEDAI-EXAMPLE-001', assessment);

        // Example: Execute enforcement
        // await dashboard.executeEnforcement('CEDAI-EXAMPLE-001');

        // Example: Batch registration
        const batchData = {
            cedaiIds: ['BATCH-001', 'BATCH-002', 'BATCH-003'],
            zkProofCommitments: [
                '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
                '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
                '0x567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234'
            ],
            breachFlags: [false, true, false],
            breachSeverities: [0, 1, 0],
            enforcementActions: [0, 1, 0],
            breachDescriptions: ['', 'Minor violation', '']
        };

        // await dashboard.batchRegisterCEDAIs(batchData);

        console.log('✅ Example usage completed successfully');

    } catch (error) {
        console.error('❌ Example usage failed:', error);
    }
}

// Export for use in other modules
module.exports = {
    GVMSDashboardIntegration,
    exampleUsage
};

// Run example if this file is executed directly
if (require.main === module) {
    exampleUsage();
} 