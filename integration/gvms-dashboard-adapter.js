const { ethers } = require('ethers');
// Define enums locally since we can't import from TypeScript file
const BreachSeverity = {
    NONE: 0,
    MINOR: 1,
    MODERATE: 2,
    SEVERE: 3,
    CRITICAL: 4
};

const EnforcementAction = {
    NONE: 0,
    WARNING: 1,
    SUSPENSION: 2,
    PARTIAL_FALLBACK: 3,
    FULL_FALLBACK: 4,
    TERMINATION: 5
};

/**
 * GVMS Dashboard Adapter
 * 
 * This adapter provides a clean interface for the GVMS dashboard to interact
 * with the CivicTrustRegistry smart contract. It handles all the complexity
 * of blockchain interactions and provides dashboard-friendly methods.
 */
class GVMSDashboardAdapter {
    constructor(config) {
        this.config = {
            contractAddress: config.contractAddress,
            rpcUrl: config.rpcUrl,
            dashboardOperatorPrivateKey: config.dashboardOperatorPrivateKey,
            gasLimit: config.gasLimit || 3000000,
            gasPrice: config.gasPrice || '20000000000',
            monitoringEnabled: config.monitoringEnabled || true,
            alertWebhookUrl: config.alertWebhookUrl,
            ...config
        };
        
        this.provider = null;
        this.contract = null;
        this.signer = null;
        this.isInitialized = false;
        this.eventListeners = new Map();
        this.metricsCache = null;
        this.lastMetricsUpdate = 0;
    }

    /**
     * Initialize the dashboard adapter
     */
    async initialize() {
        try {
            console.log('🚀 Initializing GVMS Dashboard Adapter...');
            
            // Setup provider
            this.provider = new ethers.JsonRpcProvider(this.config.rpcUrl);
            
            // Setup signer
            this.signer = new ethers.Wallet(this.config.dashboardOperatorPrivateKey, this.provider);
            
            // Load contract
            const contractABI = require('../artifacts/contracts/CivicTrustRegistry.sol/CivicTrustRegistry.json').abi;
            this.contract = new ethers.Contract(this.config.contractAddress, contractABI, this.signer);
            
            // Verify connection
            await this.contract.getBreachStatistics();
            
            this.isInitialized = true;
            console.log('✅ GVMS Dashboard Adapter initialized successfully');
            
            // Setup monitoring if enabled
            if (this.config.monitoringEnabled) {
                await this.setupEventMonitoring();
            }
            
        } catch (error) {
            console.error('❌ Failed to initialize GVMS Dashboard Adapter:', error);
            throw error;
        }
    }

    /**
     * Setup real-time event monitoring for dashboard updates
     */
    async setupEventMonitoring() {
        console.log('📡 Setting up GVMS dashboard event monitoring...');
        
        // Monitor CEDAI registrations
        this.contract.on('CEDAIRegistered', (cedaiId, issuer, zkProofCommitment, breachFlag, breachSeverity, enforcementAction, breachTimestamp, entryHash) => {
            const event = {
                cedaiId,
                issuer,
                zkProofCommitment,
                breachFlag,
                breachSeverity: Number(breachSeverity),
                enforcementAction: Number(enforcementAction),
                breachTimestamp: Number(breachTimestamp),
                entryHash
            };
            
            this.handleCEDAIRegistered(event);
        });

        // Monitor breach updates
        this.contract.on('BreachUpdated', (cedaiId, oldSeverity, newSeverity, enforcementAction, timestamp) => {
            const event = {
                cedaiId,
                oldSeverity: Number(oldSeverity),
                newSeverity: Number(newSeverity),
                enforcementAction: Number(enforcementAction),
                timestamp: Number(timestamp)
            };
            
            this.handleBreachUpdated(event);
        });

        // Monitor enforcement actions
        this.contract.on('EnforcementActionExecuted', (cedaiId, action, executor, timestamp) => {
            const event = {
                cedaiId,
                action: Number(action),
                executor,
                timestamp: Number(timestamp)
            };
            
            this.handleEnforcementActionExecuted(event);
        });

        // Monitor emergency pauses
        this.contract.on('EmergencyPaused', (operator, paused) => {
            const event = {
                operator,
                paused
            };
            
            this.handleEmergencyPaused(event);
        });

        console.log('✅ Event monitoring setup complete');
    }

    /**
     * Handle CEDAI registration events
     */
    handleCEDAIRegistered(event) {
        console.log('📝 CEDAI Registered:', {
            cedaiId: event.cedaiId,
            issuer: event.issuer,
            breachFlag: event.breachFlag,
            severity: this.getSeverityName(event.breachSeverity),
            action: this.getActionName(event.enforcementAction),
            timestamp: new Date(event.breachTimestamp * 1000).toISOString()
        });
        
        // Invalidate metrics cache
        this.metricsCache = null;
        
        // Send alert if breach detected
        if (event.breachFlag && this.config.alertWebhookUrl) {
            this.sendAlert('CEDAI Breach Detected', {
                cedaiId: event.cedaiId,
                severity: this.getSeverityName(event.breachSeverity),
                action: this.getActionName(event.enforcementAction),
                issuer: event.issuer
            });
        }
        
        // Notify dashboard listeners
        this.notifyListeners('cedaiRegistered', event);
    }

    /**
     * Handle breach update events
     */
    handleBreachUpdated(event) {
        console.log('🔄 Breach Updated:', {
            cedaiId: event.cedaiId,
            oldSeverity: this.getSeverityName(event.oldSeverity),
            newSeverity: this.getSeverityName(event.newSeverity),
            action: this.getActionName(event.enforcementAction),
            timestamp: new Date(event.timestamp * 1000).toISOString()
        });
        
        // Invalidate metrics cache
        this.metricsCache = null;
        
        // Send alert for severity escalation
        if (event.newSeverity > event.oldSeverity && this.config.alertWebhookUrl) {
            this.sendAlert('Breach Severity Escalated', {
                cedaiId: event.cedaiId,
                oldSeverity: this.getSeverityName(event.oldSeverity),
                newSeverity: this.getSeverityName(event.newSeverity),
                action: this.getActionName(event.enforcementAction)
            });
        }
        
        // Notify dashboard listeners
        this.notifyListeners('breachUpdated', event);
    }

    /**
     * Handle enforcement action events
     */
    handleEnforcementActionExecuted(event) {
        console.log('⚡ Enforcement Action Executed:', {
            cedaiId: event.cedaiId,
            action: this.getActionName(event.action),
            executor: event.executor,
            timestamp: new Date(event.timestamp * 1000).toISOString()
        });
        
        // Send alert for critical actions
        if (event.action >= EnforcementAction.SUSPENSION && this.config.alertWebhookUrl) {
            this.sendAlert('Enforcement Action Executed', {
                cedaiId: event.cedaiId,
                action: this.getActionName(event.action),
                executor: event.executor
            });
        }
        
        // Notify dashboard listeners
        this.notifyListeners('enforcementActionExecuted', event);
    }

    /**
     * Handle emergency pause events
     */
    handleEmergencyPaused(event) {
        console.log('🚨 Emergency Pause:', {
            operator: event.operator,
            paused: event.paused,
            timestamp: new Date().toISOString()
        });
        
        // Send immediate alert
        if (this.config.alertWebhookUrl) {
            this.sendAlert('Emergency Pause', {
                operator: event.operator,
                paused: event.paused,
                action: event.paused ? 'System Paused' : 'System Resumed'
            });
        }
        
        // Notify dashboard listeners
        this.notifyListeners('emergencyPaused', event);
    }

    /**
     * Dashboard Integration Methods
     */

    /**
     * Submit breach assessment from GVMS dashboard
     */
    async submitBreachAssessment(cedaiId, assessment) {
        if (!this.isInitialized) {
            throw new Error('Adapter not initialized');
        }

        try {
            console.log('📊 Submitting breach assessment:', { cedaiId, assessment });
            
            const tx = await this.contract.updateBreachAssessment(
                cedaiId,
                assessment.severity,
                assessment.enforcementAction,
                assessment.description,
                {
                    gasLimit: this.config.gasLimit,
                    gasPrice: this.config.gasPrice
                }
            );
            
            const receipt = await tx.wait();
            
            console.log('✅ Breach assessment submitted:', {
                cedaiId,
                txHash: receipt.hash,
                gasUsed: receipt.gasUsed.toString()
            });
            
            return {
                success: true,
                txHash: receipt.hash,
                gasUsed: receipt.gasUsed.toString(),
                blockNumber: receipt.blockNumber
            };
            
        } catch (error) {
            console.error('❌ Failed to submit breach assessment:', error);
            throw error;
        }
    }

    /**
     * Execute enforcement action from dashboard
     */
    async executeEnforcementAction(cedaiId) {
        if (!this.isInitialized) {
            throw new Error('Adapter not initialized');
        }

        try {
            console.log('⚡ Executing enforcement action:', { cedaiId });
            
            const tx = await this.contract.executeEnforcementAction(cedaiId, {
                gasLimit: this.config.gasLimit,
                gasPrice: this.config.gasPrice
            });
            
            const receipt = await tx.wait();
            
            console.log('✅ Enforcement action executed:', {
                cedaiId,
                txHash: receipt.hash,
                gasUsed: receipt.gasUsed.toString()
            });
            
            return {
                success: true,
                txHash: receipt.hash,
                gasUsed: receipt.gasUsed.toString(),
                blockNumber: receipt.blockNumber
            };
            
        } catch (error) {
            console.error('❌ Failed to execute enforcement action:', error);
            throw error;
        }
    }

    /**
     * Get real-time dashboard metrics
     */
    async getDashboardMetrics() {
        if (!this.isInitialized) {
            throw new Error('Adapter not initialized');
        }

        try {
            // Check cache first
            const now = Date.now();
            if (this.metricsCache && (now - this.lastMetricsUpdate) < 30000) { // 30 second cache
                return this.metricsCache;
            }

            const breachStats = await this.contract.getBreachStatistics();
            const isPaused = await this.contract.paused();
            
            const metrics = {
                realTime: {
                    activeCEDAIs: await this.getActiveCEDAIsCount(),
                    totalBreaches: Number(breachStats.totalBreaches),
                    pendingEnforcements: await this.getPendingEnforcementsCount(),
                    systemHealth: this.calculateSystemHealth(breachStats, isPaused)
                },
                breachStatistics: {
                    totalBreaches: Number(breachStats.totalBreaches),
                    minorBreaches: Number(breachStats.minorBreaches),
                    moderateBreaches: Number(breachStats.moderateBreaches),
                    severeBreaches: Number(breachStats.severeBreaches),
                    criticalBreaches: Number(breachStats.criticalBreaches),
                    totalEnforcementActions: Number(breachStats.totalEnforcementActions),
                    lastMetricsUpdate: Number(breachStats.lastMetricsUpdate)
                },
                systemStatus: {
                    isPaused,
                    contractAddress: this.config.contractAddress,
                    networkId: await this.provider.getNetwork().then(n => n.chainId)
                }
            };
            
            // Update cache
            this.metricsCache = metrics;
            this.lastMetricsUpdate = now;
            
            return metrics;
            
        } catch (error) {
            console.error('❌ Failed to get dashboard metrics:', error);
            throw error;
        }
    }

    /**
     * Get CEDAI information for dashboard display
     */
    async getCEDAIInfo(cedaiId) {
        if (!this.isInitialized) {
            throw new Error('Adapter not initialized');
        }

        try {
            const entry = await this.contract.getCEDAIEntry(cedaiId);
            
            return {
                cedaiId: entry[0],
                issuer: entry[1],
                zkProofCommitment: entry[2],
                breachFlag: entry[3],
                breachSeverity: Number(entry[4]),
                enforcementAction: Number(entry[5]),
                breachTimestamp: Number(entry[6]),
                lastUpdated: Number(entry[7]),
                breachDescription: entry[8],
                entryHash: entry[9],
                isActive: entry[10],
                severityName: this.getSeverityName(Number(entry[4])),
                actionName: this.getActionName(Number(entry[5]))
            };
            
        } catch (error) {
            console.error('❌ Failed to get CEDAI info:', error);
            throw error;
        }
    }

    /**
     * Emergency pause/unpause from dashboard
     */
    async emergencyPause(paused) {
        if (!this.isInitialized) {
            throw new Error('Adapter not initialized');
        }

        try {
            console.log('🚨 Emergency pause operation:', { paused });
            
            const tx = await this.contract.setEmergencyPause(paused, {
                gasLimit: this.config.gasLimit,
                gasPrice: this.config.gasPrice
            });
            
            const receipt = await tx.wait();
            
            console.log('✅ Emergency pause operation completed:', {
                paused,
                txHash: receipt.hash,
                gasUsed: receipt.gasUsed.toString()
            });
            
            return {
                success: true,
                txHash: receipt.hash,
                gasUsed: receipt.gasUsed.toString(),
                blockNumber: receipt.blockNumber
            };
            
        } catch (error) {
            console.error('❌ Failed to execute emergency pause:', error);
            throw error;
        }
    }

    /**
     * Helper Methods
     */

    async getActiveCEDAIsCount() {
        // This would need to be implemented based on your specific requirements
        // For now, we'll return a placeholder
        return 0;
    }

    async getPendingEnforcementsCount() {
        // This would need to be implemented based on your specific requirements
        // For now, we'll return a placeholder
        return 0;
    }

    calculateSystemHealth(breachStats, isPaused) {
        if (isPaused) return 'critical';
        
        const totalBreaches = Number(breachStats.totalBreaches);
        const criticalBreaches = Number(breachStats.criticalBreaches);
        const severeBreaches = Number(breachStats.severeBreaches);
        
        if (criticalBreaches > 0) return 'critical';
        if (severeBreaches > 2) return 'warning';
        if (totalBreaches > 10) return 'warning';
        
        return 'healthy';
    }

    getSeverityName(severity) {
        const names = ['NONE', 'MINOR', 'MODERATE', 'SEVERE', 'CRITICAL'];
        return names[severity] || 'UNKNOWN';
    }

    getActionName(action) {
        const names = ['NONE', 'WARNING', 'SUSPENSION', 'PARTIAL_FALLBACK', 'FULL_FALLBACK', 'TERMINATION'];
        return names[action] || 'UNKNOWN';
    }

    async sendAlert(title, data) {
        if (!this.config.alertWebhookUrl) return;
        
        try {
            const payload = {
                title,
                data,
                timestamp: new Date().toISOString(),
                source: 'GVMS Dashboard Adapter'
            };
            
            // This would send to your webhook (Slack, Discord, etc.)
            console.log('📢 Alert sent:', payload);
            
        } catch (error) {
            console.error('❌ Failed to send alert:', error);
        }
    }

    notifyListeners(eventType, data) {
        const listeners = this.eventListeners.get(eventType) || [];
        listeners.forEach(callback => {
            try {
                callback(data);
            } catch (error) {
                console.error(`❌ Error in event listener for ${eventType}:`, error);
            }
        });
    }

    on(eventType, callback) {
        if (!this.eventListeners.has(eventType)) {
            this.eventListeners.set(eventType, []);
        }
        this.eventListeners.get(eventType).push(callback);
    }

    off(eventType, callback) {
        const listeners = this.eventListeners.get(eventType) || [];
        const index = listeners.indexOf(callback);
        if (index > -1) {
            listeners.splice(index, 1);
        }
    }

    /**
     * Cleanup
     */
    async cleanup() {
        if (this.contract) {
            this.contract.removeAllListeners();
        }
        this.isInitialized = false;
        console.log('🧹 GVMS Dashboard Adapter cleaned up');
    }
}

module.exports = GVMSDashboardAdapter; 