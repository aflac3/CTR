export type AlertSeverity = 'info' | 'warning' | 'critical';

export interface Alert {
  id: string;
  severity: AlertSeverity;
  message: string;
  timestamp: number;
  source: string;
  metadata?: Record<string, any>;
}

export interface AlertChannel {
  id: string;
  type: 'slack' | 'discord' | 'email' | 'webhook';
  config: Record<string, any>;
  enabled: boolean;
}

export interface AlertConfig {
  channels: AlertChannel[];
  rateLimit: {
    maxAlertsPerMinute: number;
    maxAlertsPerHour: number;
  };
  escalation: {
    enabled: boolean;
    escalationDelay: number; // minutes
    escalationLevels: AlertSeverity[];
  };
}

export class AlertSystem {
  private channels: Map<string, AlertChannel> = new Map();
  private alertHistory: Alert[] = [];
  private rateLimitCounts: Map<string, number> = new Map();
  private escalationTimers: Map<string, NodeJS.Timeout> = new Map();
  private config: AlertConfig;

  constructor(config: AlertConfig) {
    this.config = config;
    this.initializeChannels();
  }

  /**
   * Initialize alert channels
   */
  private initializeChannels(): void {
    for (const channel of this.config.channels) {
      this.channels.set(channel.id, channel);
    }
  }

  /**
   * Send alert to all configured channels
   */
  async sendAlert(severity: AlertSeverity, message: string, source: string = 'system', metadata?: Record<string, any>): Promise<void> {
    const alert: Alert = {
      id: this.generateAlertId(),
      severity,
      message,
      timestamp: Date.now(),
      source,
      metadata
    };

    // Check rate limiting
    if (this.isRateLimited(severity)) {
      console.warn(`Alert rate limited: ${message}`);
      return;
    }

    // Add to history
    this.alertHistory.push(alert);

    // Send to all enabled channels
    const promises = Array.from(this.channels.values())
      .filter(channel => channel.enabled)
      .map(channel => this.sendToChannel(channel, alert));

    try {
      await Promise.allSettled(promises);
      console.log(`Alert sent: ${severity.toUpperCase()} - ${message}`);
    } catch (error) {
      console.error('Failed to send alert:', error);
    }

    // Handle escalation if needed
    if (this.config.escalation.enabled && this.config.escalation.escalationLevels.includes(severity)) {
      this.scheduleEscalation(alert);
    }
  }

  /**
   * Send alert to specific channel
   */
  private async sendToChannel(channel: AlertChannel, alert: Alert): Promise<void> {
    try {
      switch (channel.type) {
        case 'slack':
          await this.sendToSlack(channel, alert);
          break;
        case 'discord':
          await this.sendToDiscord(channel, alert);
          break;
        case 'email':
          await this.sendToEmail(channel, alert);
          break;
        case 'webhook':
          await this.sendToWebhook(channel, alert);
          break;
        default:
          console.warn(`Unknown channel type: ${channel.type}`);
      }
    } catch (error) {
      console.error(`Failed to send alert to ${channel.type} channel:`, error);
    }
  }

  /**
   * Send alert to Slack
   */
  private async sendToSlack(channel: AlertChannel, alert: Alert): Promise<void> {
    const { webhookUrl, channel: slackChannel } = channel.config;
    
    if (!webhookUrl) {
      throw new Error('Slack webhook URL not configured');
    }

    const payload = {
      channel: slackChannel || '#alerts',
      text: this.formatSlackMessage(alert),
      attachments: [{
        color: this.getSeverityColor(alert.severity),
        fields: [
          {
            title: 'Severity',
            value: alert.severity.toUpperCase(),
            short: true
          },
          {
            title: 'Source',
            value: alert.source,
            short: true
          },
          {
            title: 'Message',
            value: alert.message,
            short: false
          }
        ],
        footer: 'CTR Alert System',
        ts: Math.floor(alert.timestamp / 1000)
      }]
    };

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`Slack API error: ${response.status}`);
    }
  }

  /**
   * Send alert to Discord
   */
  private async sendToDiscord(channel: AlertChannel, alert: Alert): Promise<void> {
    const { webhookUrl } = channel.config;
    
    if (!webhookUrl) {
      throw new Error('Discord webhook URL not configured');
    }

    const payload = {
      embeds: [{
        title: `CTR Alert: ${alert.severity.toUpperCase()}`,
        description: alert.message,
        color: this.getSeverityColor(alert.severity),
        fields: [
          {
            name: 'Source',
            value: alert.source,
            inline: true
          },
          {
            name: 'Timestamp',
            value: new Date(alert.timestamp).toISOString(),
            inline: true
          }
        ],
        footer: {
          text: 'CTR Alert System'
        },
        timestamp: new Date(alert.timestamp).toISOString()
      }]
    };

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`Discord API error: ${response.status}`);
    }
  }

  /**
   * Send alert to Email
   */
  private async sendToEmail(channel: AlertChannel, alert: Alert): Promise<void> {
    const { smtpConfig, recipients } = channel.config;
    
    if (!smtpConfig || !recipients) {
      throw new Error('Email configuration incomplete');
    }

    // This would typically use a library like nodemailer
    // For now, we'll simulate email sending
    console.log(`Email alert would be sent to ${recipients.join(', ')}: ${alert.message}`);
  }

  /**
   * Send alert to Webhook
   */
  private async sendToWebhook(channel: AlertChannel, alert: Alert): Promise<void> {
    const { url, headers = {} } = channel.config;
    
    if (!url) {
      throw new Error('Webhook URL not configured');
    }

    const payload = {
      alert,
      timestamp: Date.now(),
      source: 'ctr-alert-system'
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`Webhook error: ${response.status}`);
    }
  }

  /**
   * Format Slack message
   */
  private formatSlackMessage(alert: Alert): string {
    const emoji = this.getSeverityEmoji(alert.severity);
    return `${emoji} *${alert.severity.toUpperCase()}* - ${alert.message}`;
  }

  /**
   * Get severity color for Slack/Discord
   */
  private getSeverityColor(severity: AlertSeverity): number {
    switch (severity) {
      case 'critical':
        return 0xFF0000; // Red
      case 'warning':
        return 0xFFA500; // Orange
      case 'info':
        return 0x0000FF; // Blue
      default:
        return 0x808080; // Gray
    }
  }

  /**
   * Get severity emoji
   */
  private getSeverityEmoji(severity: AlertSeverity): string {
    switch (severity) {
      case 'critical':
        return '🚨';
      case 'warning':
        return '⚠️';
      case 'info':
        return 'ℹ️';
      default:
        return '📢';
    }
  }

  /**
   * Check rate limiting
   */
  private isRateLimited(severity: AlertSeverity): boolean {
    const now = Date.now();
    const minuteKey = `minute_${Math.floor(now / 60000)}`;
    const hourKey = `hour_${Math.floor(now / 3600000)}`;

    const minuteCount = this.rateLimitCounts.get(minuteKey) || 0;
    const hourCount = this.rateLimitCounts.get(hourKey) || 0;

    if (minuteCount >= this.config.rateLimit.maxAlertsPerMinute ||
        hourCount >= this.config.rateLimit.maxAlertsPerHour) {
      return true;
    }

    this.rateLimitCounts.set(minuteKey, minuteCount + 1);
    this.rateLimitCounts.set(hourKey, hourCount + 1);

    return false;
  }

  /**
   * Schedule escalation for critical alerts
   */
  private scheduleEscalation(alert: Alert): void {
    const escalationKey = `escalation_${alert.id}`;
    
    if (this.escalationTimers.has(escalationKey)) {
      return; // Escalation already scheduled
    }

    const timer = setTimeout(async () => {
      await this.escalateAlert(alert);
      this.escalationTimers.delete(escalationKey);
    }, this.config.escalation.escalationDelay * 60 * 1000);

    this.escalationTimers.set(escalationKey, timer);
  }

  /**
   * Escalate alert
   */
  private async escalateAlert(alert: Alert): Promise<void> {
    const escalationMessage = `🚨 ESCALATED: ${alert.message} (Original alert: ${alert.id})`;
    await this.sendAlert('critical', escalationMessage, 'escalation-system');
  }

  /**
   * Generate unique alert ID
   */
  private generateAlertId(): string {
    return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get alert history
   */
  getAlertHistory(limit: number = 100): Alert[] {
    return this.alertHistory.slice(-limit);
  }

  /**
   * Clear alert history
   */
  clearAlertHistory(): void {
    this.alertHistory = [];
  }

  /**
   * Add new alert channel
   */
  addChannel(channel: AlertChannel): void {
    this.channels.set(channel.id, channel);
  }

  /**
   * Remove alert channel
   */
  removeChannel(channelId: string): void {
    this.channels.delete(channelId);
  }

  /**
   * Update channel configuration
   */
  updateChannel(channelId: string, config: Partial<AlertChannel>): void {
    const channel = this.channels.get(channelId);
    if (channel) {
      this.channels.set(channelId, { ...channel, ...config });
    }
  }

  /**
   * Get all channels
   */
  getChannels(): AlertChannel[] {
    return Array.from(this.channels.values());
  }
}
