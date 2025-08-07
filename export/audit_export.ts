// CTR/export/audit_export.ts

import fs from 'fs';
import path from 'path';
import { EDAI } from '../instruments/EDAI';

interface AuditEntry {
  timestamp: string;
  action: string;
  description: string;
  actor: string;
  edai_id?: string;
  severity?: string;
  resource_id?: string;
  liability_impact?: number;
  enforcement_action?: string;
}

interface AuditReport {
  report_id: string;
  report_date: string;
  audit_period: {
    start_date: string;
    end_date: string;
  };
  total_entries: number;
  summary: {
    total_actions: number;
    breach_events: number;
    enforcement_actions: number;
    total_liability_impact: number;
  };
  entries: AuditEntry[];
}

/**
 * Generate comprehensive audit report
 */
export function generateAuditReport(
  edais: EDAI[],
  startDate?: string,
  endDate?: string
): AuditReport {
  const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const end = endDate || new Date().toISOString();
  
  const auditEntries = generateAuditEntries(edais, start, end);
  const summary = calculateAuditSummary(auditEntries);
  
  return {
    report_id: `AUDIT_${new Date().toISOString().split('T')[0]}`,
    report_date: new Date().toISOString().split('T')[0],
    audit_period: {
      start_date: start.split('T')[0],
      end_date: end.split('T')[0]
    },
    total_entries: auditEntries.length,
    summary,
    entries: auditEntries
  };
}

/**
 * Generate audit entries from EDAI data
 */
function generateAuditEntries(edais: EDAI[], startDate: string, endDate: string): AuditEntry[] {
  const entries: AuditEntry[] = [];
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  edais.forEach(edai => {
    const issuedAt = new Date(edai.issued_at);
    
    // Add registration entry if within period
    if (issuedAt >= start && issuedAt <= end) {
      entries.push({
        timestamp: edai.issued_at,
        action: 'EDAI_REGISTERED',
        description: `EDAI ${edai.edai_id} registered by ${edai.issuer}`,
        actor: edai.issuer,
        edai_id: edai.edai_id,
        resource_id: edai.resource_id,
        liability_impact: edai.liability_estimate_usd
      });
    }
    
    // Add breach entry if applicable and within period
    if (edai.breach_flag && edai.breach_timestamp) {
      const breachAt = new Date(edai.breach_timestamp);
      if (breachAt >= start && breachAt <= end) {
        entries.push({
          timestamp: edai.breach_timestamp,
          action: 'BREACH_DETECTED',
          description: `Breach detected for EDAI ${edai.edai_id}: ${edai.breach_severity || 'UNKNOWN'} severity`,
          actor: 'SYSTEM',
          edai_id: edai.edai_id,
          severity: edai.breach_severity,
          resource_id: edai.resource_id,
          liability_impact: edai.liability_estimate_usd,
          enforcement_action: determineEnforcementAction(edai.breach_severity)
        });
      }
    }
    
    // Add status change entries
    if (edai.isActive !== true) {
      const lastUpdated = new Date(edai.last_updated || edai.issued_at);
      if (lastUpdated >= start && lastUpdated <= end) {
        entries.push({
          timestamp: edai.last_updated || edai.issued_at,
          action: 'EDAI_DEACTIVATED',
          description: `EDAI ${edai.edai_id} deactivated`,
          actor: 'SYSTEM',
          edai_id: edai.edai_id,
          resource_id: edai.resource_id
        });
      }
    }
  });
  
  return entries.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
}

/**
 * Calculate audit summary statistics
 */
function calculateAuditSummary(entries: AuditEntry[]) {
  const totalActions = entries.length;
  const breachEvents = entries.filter(entry => entry.action === 'BREACH_DETECTED').length;
  const enforcementActions = entries.filter(entry => entry.enforcement_action).length;
  const totalLiabilityImpact = entries.reduce((sum, entry) => sum + (entry.liability_impact || 0), 0);
  
  return {
    total_actions: totalActions,
    breach_events: breachEvents,
    enforcement_actions: enforcementActions,
    total_liability_impact: totalLiabilityImpact
  };
}

/**
 * Determine enforcement action based on breach severity
 */
function determineEnforcementAction(severity?: string): string {
  switch (severity) {
    case 'MINOR':
      return 'WARNING';
    case 'MODERATE':
      return 'PARTIAL_FALLBACK';
    case 'SEVERE':
      return 'FULL_FALLBACK';
    case 'CRITICAL':
      return 'TERMINATION';
    default:
      return 'NONE';
  }
}

/**
 * Export audit report to JSON
 */
export function exportAuditReport(
  edais: EDAI[],
  outPath?: string,
  startDate?: string,
  endDate?: string
): void {
  const report = generateAuditReport(edais, startDate, endDate);
  const output = outPath || `./audit_report_${report.report_date}.json`;
  
  fs.writeFileSync(path.resolve(output), JSON.stringify(report, null, 2));
  console.log(`✅ Exported audit report to ${output}`);
}

/**
 * Export audit report to CSV format
 */
export function exportAuditReportCSV(
  edais: EDAI[],
  outPath?: string,
  startDate?: string,
  endDate?: string
): void {
  const report = generateAuditReport(edais, startDate, endDate);
  const output = outPath || `./audit_report_${report.report_date}.csv`;
  
  const headers = [
    'Timestamp',
    'Action',
    'Description',
    'Actor',
    'EDAI ID',
    'Resource ID',
    'Severity',
    'Liability Impact',
    'Enforcement Action'
  ];
  
  const rows = report.entries.map(entry => [
    entry.timestamp,
    entry.action,
    `"${entry.description.replace(/"/g, '""')}"`,
    entry.actor,
    entry.edai_id || '',
    entry.resource_id || '',
    entry.severity || '',
    entry.liability_impact?.toString() || '',
    entry.enforcement_action || ''
  ]);
  
  const csv = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
  fs.writeFileSync(path.resolve(output), csv);
  console.log(`✅ Exported audit report CSV to ${output}`);
}

/**
 * Export audit entries for specific EDAI
 */
export function exportEDAIAuditTrail(
  edai: EDAI,
  outPath?: string
): void {
  const entries: AuditEntry[] = [];
  
  // Registration entry
  entries.push({
    timestamp: edai.issued_at,
    action: 'EDAI_REGISTERED',
    description: `EDAI ${edai.edai_id} registered by ${edai.issuer}`,
    actor: edai.issuer,
    edai_id: edai.edai_id,
    resource_id: edai.resource_id,
    liability_impact: edai.liability_estimate_usd
  });
  
  // Breach entry if applicable
  if (edai.breach_flag && edai.breach_timestamp) {
    entries.push({
      timestamp: edai.breach_timestamp,
      action: 'BREACH_DETECTED',
      description: `Breach detected for EDAI ${edai.edai_id}: ${edai.breach_severity || 'UNKNOWN'} severity`,
      actor: 'SYSTEM',
      edai_id: edai.edai_id,
      severity: edai.breach_severity,
      resource_id: edai.resource_id,
      liability_impact: edai.liability_estimate_usd,
      enforcement_action: determineEnforcementAction(edai.breach_severity)
    });
  }
  
  // Status change entry if deactivated
  if (edai.isActive !== true) {
    entries.push({
      timestamp: edai.last_updated || edai.issued_at,
      action: 'EDAI_DEACTIVATED',
      description: `EDAI ${edai.edai_id} deactivated`,
      actor: 'SYSTEM',
      edai_id: edai.edai_id,
      resource_id: edai.resource_id
    });
  }
  
  const output = outPath || `./audit_trail_${edai.edai_id}_${new Date().toISOString().split('T')[0]}.json`;
  fs.writeFileSync(path.resolve(output), JSON.stringify(entries, null, 2));
  console.log(`✅ Exported audit trail for EDAI ${edai.edai_id} to ${output}`);
} 