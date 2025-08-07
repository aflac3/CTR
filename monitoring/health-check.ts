import { ethers } from 'ethers';
import { AlertSystem } from './alerting';

export interface HealthCheck {
  contractStatus: 'healthy' | 'warning' | 'critical';
  lastBlock: number;
  gasUsage: number;
  pendingTransactions: number;
  systemMetrics: SystemMetrics;
  timestamp: number;
}

export interface SystemMetrics {
  totalEDAIs: number;
  activeEDAIs: number;
  breachedEDAIs: number;
  totalBreaches: number;
  enforcementActions: number;
  systemUptime: number;
  responseTime: number;
}

export interface ContractHealth {
  contractAddress: string;
  contractName: string;
  status: 'healthy' | 'warning' | 'critical';
  lastInteraction: number;
  gasUsage: number;
  errorCount: number;
  responseTime: number;
}

export class HealthMonitoringService {
  private provider: ethers.Provider;
  private alertSystem: AlertSystem;
  private contracts: Map<string, ContractHealth> = new Map();
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private metrics: SystemMetrics = {
    totalEDAIs: 0,
    activeEDAIs: 0,
    breachedEDAIs: 0,
    totalBreaches: 0,
    enforcementActions: 0,
    systemUptime: 0,
    responseTime: 0
  };

  constructor(provider: ethers.Provider, alertSystem: AlertSystem) {
    this.provider = provider;
    this.alertSystem = alertSystem;
  }

  /**
   * Start health monitoring service
   */
  async startMonitoring(contractAddresses: string[], intervalMs: number = 30000): Promise<void> {
    console.log('Starting health monitoring service...');
    
    // Initialize contract health tracking
    for (const address of contractAddresses) {
      this.contracts.set(address, {
        contractAddress: address,
        contractName: this.getContractName(address),
        status: 'healthy',
        lastInteraction: Date.now(),
        gasUsage: 0,
        errorCount: 0,
        responseTime: 0
      });
    }

    // Start periodic health checks
    this.healthCheckInterval = setInterval(async () => {
      await this.performHealthCheck();
    }, intervalMs);

    // Initial health check
    await this.performHealthCheck();
  }

  /**
   * Stop health monitoring service
   */
  stopMonitoring(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
    console.log('Health monitoring service stopped');
  }

  /**
   * Perform comprehensive health check
   */
  private async performHealthCheck(): Promise<HealthCheck> {
    const startTime = Date.now();
    const healthCheck: HealthCheck = {
      contractStatus: 'healthy',
      lastBlock: 0,
      gasUsage: 0,
      pendingTransactions: 0,
      systemMetrics: { ...this.metrics },
      timestamp: startTime
    };

    try {
      // Check blockchain connectivity
      const blockNumber = await this.provider.getBlockNumber();
      healthCheck.lastBlock = blockNumber;

      // Check contract health
      await this.checkContractHealth();

      // Update system metrics
      await this.updateSystemMetrics();

      // Determine overall status
      healthCheck.contractStatus = this.determineOverallStatus();
      healthCheck.systemMetrics = { ...this.metrics };
      healthCheck.responseTime = Date.now() - startTime;

      // Send alerts if needed
      await this.checkAndSendAlerts(healthCheck);

      console.log(`Health check completed: ${healthCheck.contractStatus} (${healthCheck.responseTime}ms)`);
      return healthCheck;

    } catch (error) {
      console.error('Health check failed:', error);
      healthCheck.contractStatus = 'critical';
      await this.alertSystem.sendAlert('critical', `Health check failed: ${error}`);
      return healthCheck;
    }
  }

  /**
   * Check individual contract health
   */
  private async checkContractHealth(): Promise<void> {
    for (const [address, contract] of this.contracts) {
      try {
        const startTime = Date.now();
        
        // Check if contract is accessible
        const code = await this.provider.getCode(address);
        if (code === '0x') {
          contract.status = 'critical';
          contract.errorCount++;
          continue;
        }

        // Check contract state (basic checks)
        const balance = await this.provider.getBalance(address);
        const nonce = await this.provider.getTransactionCount(address);
        
        contract.responseTime = Date.now() - startTime;
        contract.lastInteraction = Date.now();
        
        // Determine contract status based on checks
        if (contract.errorCount > 5) {
          contract.status = 'critical';
        } else if (contract.errorCount > 2) {
          contract.status = 'warning';
        } else {
          contract.status = 'healthy';
        }

      } catch (error) {
        console.error(`Contract health check failed for ${address}:`, error);
        contract.status = 'critical';
        contract.errorCount++;
      }
    }
  }

  /**
   * Update system metrics
   */
  private async updateSystemMetrics(): Promise<void> {
    try {
      // This would typically query the actual contracts for metrics
      // For now, we'll simulate the metrics
      this.metrics = {
        totalEDAIs: Math.floor(Math.random() * 1000) + 100,
        activeEDAIs: Math.floor(Math.random() * 800) + 80,
        breachedEDAIs: Math.floor(Math.random() * 50) + 5,
        totalBreaches: Math.floor(Math.random() * 200) + 20,
        enforcementActions: Math.floor(Math.random() * 100) + 10,
        systemUptime: Date.now() - (Date.now() - 86400000), // 24 hours
        responseTime: Math.floor(Math.random() * 1000) + 100
      };
    } catch (error) {
      console.error('Failed to update system metrics:', error);
    }
  }

  /**
   * Determine overall system status
   */
  private determineOverallStatus(): 'healthy' | 'warning' | 'critical' {
    const criticalCount = Array.from(this.contracts.values()).filter(c => c.status === 'critical').length;
    const warningCount = Array.from(this.contracts.values()).filter(c => c.status === 'warning').length;

    if (criticalCount > 0) {
      return 'critical';
    } else if (warningCount > 0) {
      return 'warning';
    } else {
      return 'healthy';
    }
  }

  /**
   * Check and send alerts based on health status
   */
  private async checkAndSendAlerts(healthCheck: HealthCheck): Promise<void> {
    if (healthCheck.contractStatus === 'critical') {
      await this.alertSystem.sendAlert('critical', `System health is CRITICAL. Response time: ${healthCheck.responseTime}ms`);
    } else if (healthCheck.contractStatus === 'warning') {
      await this.alertSystem.sendAlert('warning', `System health is WARNING. Response time: ${healthCheck.responseTime}ms`);
    }
  }

  /**
   * Get contract name from address
   */
  private getContractName(address: string): string {
    // This would typically be a mapping of known contract addresses
    const contractNames: { [key: string]: string } = {
      // Add known contract addresses here
    };
    return contractNames[address] || 'Unknown Contract';
  }

  /**
   * Get current health status
   */
  getHealthStatus(): HealthCheck {
    return {
      contractStatus: this.determineOverallStatus(),
      lastBlock: 0,
      gasUsage: 0,
      pendingTransactions: 0,
      systemMetrics: { ...this.metrics },
      timestamp: Date.now()
    };
  }

  /**
   * Get contract health details
   */
  getContractHealth(): ContractHealth[] {
    return Array.from(this.contracts.values());
  }
}
