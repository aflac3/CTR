import { ethers } from 'ethers';
import { HealthMonitoringService } from './health-check';
import { AlertSystem, AlertConfig, AlertChannel } from './alerting';

export interface MonitoringConfig {
  rpcUrl: string;
  contractAddresses: string[];
  healthCheckInterval: number;
  alertConfig: AlertConfig;
  environment: 'testnet' | 'mainnet' | 'development';
}

export class CTRMonitoringService {
  private provider: ethers.Provider;
  private healthMonitoring: HealthMonitoringService;
  private alertSystem: AlertSystem;
  private config: MonitoringConfig;
  private isRunning: boolean = false;

  constructor(config: MonitoringConfig) {
    this.config = config;
    this.provider = new ethers.JsonRpcProvider(config.rpcUrl);
    this.alertSystem = new AlertSystem(config.alertConfig);
    this.healthMonitoring = new HealthMonitoringService(this.provider, this.alertSystem);
  }

  /**
   * Start the monitoring service
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      console.log('Monitoring service is already running');
      return;
    }

    console.log('🚀 Starting CTR monitoring service...');
    console.log(`Environment: ${this.config.environment}`);
    console.log(`RPC URL: ${this.config.rpcUrl}`);
    console.log(`Contract addresses: ${this.config.contractAddresses.length}`);

    try {
      // Start health monitoring
      await this.healthMonitoring.startMonitoring(
        this.config.contractAddresses,
        this.config.healthCheckInterval
      );

      // Send startup alert
      await this.alertSystem.sendAlert(
        'info',
        `CTR monitoring service started on ${this.config.environment}`,
        'monitoring-service'
      );

      this.isRunning = true;
      console.log('✅ Monitoring service started successfully');

    } catch (error) {
      console.error('❌ Failed to start monitoring service:', error);
      await this.alertSystem.sendAlert(
        'critical',
        `Failed to start monitoring service: ${error}`,
        'monitoring-service'
      );
      throw error;
    }
  }

  /**
   * Stop the monitoring service
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      console.log('Monitoring service is not running');
      return;
    }

    console.log('🛑 Stopping CTR monitoring service...');

    try {
      // Stop health monitoring
      this.healthMonitoring.stopMonitoring();

      // Send shutdown alert
      await this.alertSystem.sendAlert(
        'info',
        `CTR monitoring service stopped on ${this.config.environment}`,
        'monitoring-service'
      );

      this.isRunning = false;
      console.log('✅ Monitoring service stopped successfully');

    } catch (error) {
      console.error('❌ Failed to stop monitoring service:', error);
      throw error;
    }
  }

  /**
   * Get current system status
   */
  async getSystemStatus() {
    const healthStatus = this.healthMonitoring.getHealthStatus();
    const contractHealth = this.healthMonitoring.getContractHealth();
    const alertHistory = this.alertSystem.getAlertHistory(50);

    return {
      timestamp: Date.now(),
      environment: this.config.environment,
      isRunning: this.isRunning,
      healthStatus,
      contractHealth,
      recentAlerts: alertHistory,
      uptime: this.isRunning ? Date.now() - (Date.now() - 86400000) : 0 // 24 hours
    };
  }

  /**
   * Get detailed health metrics
   */
  async getHealthMetrics() {
    return this.healthMonitoring.getHealthStatus();
  }

  /**
   * Get contract health details
   */
  async getContractHealth() {
    return this.healthMonitoring.getContractHealth();
  }

  /**
   * Get alert history
   */
  async getAlertHistory(limit: number = 100) {
    return this.alertSystem.getAlertHistory(limit);
  }

  /**
   * Send custom alert
   */
  async sendAlert(severity: 'info' | 'warning' | 'critical', message: string, source: string = 'manual') {
    return this.alertSystem.sendAlert(severity, message, source);
  }

  /**
   * Add new alert channel
   */
  async addAlertChannel(channel: AlertChannel) {
    this.alertSystem.addChannel(channel);
    console.log(`✅ Added alert channel: ${channel.id} (${channel.type})`);
  }

  /**
   * Remove alert channel
   */
  async removeAlertChannel(channelId: string) {
    this.alertSystem.removeChannel(channelId);
    console.log(`✅ Removed alert channel: ${channelId}`);
  }

  /**
   * Update alert channel configuration
   */
  async updateAlertChannel(channelId: string, config: Partial<AlertChannel>) {
    this.alertSystem.updateChannel(channelId, config);
    console.log(`✅ Updated alert channel: ${channelId}`);
  }

  /**
   * Get all alert channels
   */
  async getAlertChannels() {
    return this.alertSystem.getChannels();
  }

  /**
   * Perform manual health check
   */
  async performManualHealthCheck() {
    console.log('🔍 Performing manual health check...');
    const healthCheck = await this.healthMonitoring.getHealthStatus();
    
    // Send alert if health check reveals issues
    if (healthCheck.contractStatus === 'critical') {
      await this.alertSystem.sendAlert(
        'critical',
        'Manual health check revealed CRITICAL system status',
        'manual-health-check'
      );
    } else if (healthCheck.contractStatus === 'warning') {
      await this.alertSystem.sendAlert(
        'warning',
        'Manual health check revealed WARNING system status',
        'manual-health-check'
      );
    }

    return healthCheck;
  }

  /**
   * Get monitoring configuration
   */
  getConfig(): MonitoringConfig {
    return { ...this.config };
  }

  /**
   * Update monitoring configuration
   */
  async updateConfig(newConfig: Partial<MonitoringConfig>) {
    const oldConfig = { ...this.config };
    this.config = { ...this.config, ...newConfig };

    // Restart monitoring if critical config changed
    if (this.isRunning && (
      newConfig.rpcUrl ||
      newConfig.contractAddresses ||
      newConfig.healthCheckInterval
    )) {
      console.log('🔄 Restarting monitoring service with new configuration...');
      await this.stop();
      await this.start();
    }

    console.log('✅ Monitoring configuration updated');
    return this.config;
  }
}

// Example usage and configuration
export function createMonitoringService(environment: 'testnet' | 'mainnet' | 'development'): CTRMonitoringService {
  const config: MonitoringConfig = {
    rpcUrl: process.env.RPC_URL || 'http://localhost:8545',
    contractAddresses: [
      process.env.REGISTRY_ADDRESS || '',
      process.env.INTEGRATION_HUB_ADDRESS || '',
      process.env.ORACLE_ADDRESS || '',
      process.env.ZK_VERIFIER_ADDRESS || '',
      process.env.FALLBACK_ENGINE_ADDRESS || '',
      process.env.TRADING_ADDRESS || '',
      process.env.ISSUANCE_ADDRESS || '',
      process.env.TOKEN_ADDRESS || ''
    ].filter(Boolean),
    healthCheckInterval: parseInt(process.env.HEALTH_CHECK_INTERVAL || '30000'),
    environment,
    alertConfig: {
      channels: [
        {
          id: 'slack',
          type: 'slack',
          config: {
            webhookUrl: process.env.SLACK_WEBHOOK_URL || '',
            channel: process.env.SLACK_CHANNEL || '#alerts'
          },
          enabled: !!process.env.SLACK_WEBHOOK_URL
        },
        {
          id: 'discord',
          type: 'discord',
          config: {
            webhookUrl: process.env.DISCORD_WEBHOOK_URL || ''
          },
          enabled: !!process.env.DISCORD_WEBHOOK_URL
        },
        {
          id: 'email',
          type: 'email',
          config: {
            smtpConfig: {
              host: process.env.SMTP_HOST || '',
              port: parseInt(process.env.SMTP_PORT || '587'),
              secure: process.env.SMTP_SECURE === 'true',
              auth: {
                user: process.env.SMTP_USER || '',
                pass: process.env.SMTP_PASS || ''
              }
            },
            recipients: process.env.EMAIL_RECIPIENTS?.split(',') || []
          },
          enabled: !!process.env.SMTP_HOST
        }
      ],
      rateLimit: {
        maxAlertsPerMinute: 10,
        maxAlertsPerHour: 100
      },
      escalation: {
        enabled: true,
        escalationDelay: 5, // 5 minutes
        escalationLevels: ['critical']
      }
    }
  };

  return new CTRMonitoringService(config);
}
