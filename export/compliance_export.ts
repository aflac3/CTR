// CTR/export/compliance_export.ts

import fs from 'fs';
import path from 'path';
import { EDAI } from '../instruments/EDAI';

interface ComplianceReport {
  report_id: string;
  report_date: string;
  issuer_id: string;
  total_edais: number;
  active_edais: number;
  breached_edais: number;
  total_liability_usd: number;
  compliance_score: number;
  regulatory_status: 'COMPLIANT' | 'NON_COMPLIANT' | 'UNDER_REVIEW';
  audit_trail: ComplianceAuditEntry[];
}

interface ComplianceAuditEntry {
  timestamp: string;
  action: string;
  description: string;
  actor: string;
  edai_id?: string;
  severity?: string;
}

/**
 * Generate compliance report for regulatory authorities
 */
export function generateComplianceReport(
  edais: EDAI[],
  issuerId: string,
  reportDate?: string
): ComplianceReport {
  const date = reportDate || new Date().toISOString().split('T')[0];
  const activeEdais = edais.filter(edai => edai.isActive);
  const breachedEdais = edais.filter(edai => edai.breach_flag);
  const totalLiability = edais.reduce((sum, edai) => sum + edai.liability_estimate_usd, 0);
  
  const complianceScore = calculateComplianceScore(edais);
  const regulatoryStatus = determineRegulatoryStatus(complianceScore, breachedEdais.length);

  return {
    report_id: `COMPLIANCE_${issuerId}_${date}`,
    report_date: date,
    issuer_id: issuerId,
    total_edais: edais.length,
    active_edais: activeEdais.length,
    breached_edais: breachedEdais.length,
    total_liability_usd: totalLiability,
    compliance_score: complianceScore,
    regulatory_status: regulatoryStatus,
    audit_trail: generateAuditTrail(edais)
  };
}

/**
 * Calculate compliance score based on EDAI performance
 */
function calculateComplianceScore(edais: EDAI[]): number {
  if (edais.length === 0) return 100;
  
  const totalEdais = edais.length;
  const breachedEdais = edais.filter(edai => edai.breach_flag).length;
  const activeEdais = edais.filter(edai => edai.isActive).length;
  
  // Base score from breach ratio
  const breachPenalty = (breachedEdais / totalEdais) * 50;
  const activityBonus = (activeEdais / totalEdais) * 20;
  
  return Math.max(0, Math.min(100, 100 - breachPenalty + activityBonus));
}

/**
 * Determine regulatory status based on compliance score and breach count
 */
function determineRegulatoryStatus(
  complianceScore: number,
  breachCount: number
): 'COMPLIANT' | 'NON_COMPLIANT' | 'UNDER_REVIEW' {
  if (complianceScore >= 80 && breachCount === 0) return 'COMPLIANT';
  if (complianceScore < 50 || breachCount > 5) return 'NON_COMPLIANT';
  return 'UNDER_REVIEW';
}

/**
 * Generate audit trail from EDAI history
 */
function generateAuditTrail(edais: EDAI[]): ComplianceAuditEntry[] {
  const auditTrail: ComplianceAuditEntry[] = [];
  
  edais.forEach(edai => {
    // Add registration entry
    auditTrail.push({
      timestamp: edai.issued_at,
      action: 'EDAI_REGISTERED',
      description: `EDAI ${edai.edai_id} registered`,
      actor: edai.issuer,
      edai_id: edai.edai_id
    });
    
    // Add breach entry if applicable
    if (edai.breach_flag) {
      auditTrail.push({
        timestamp: edai.breach_timestamp || edai.issued_at,
        action: 'BREACH_DETECTED',
        description: `Breach detected for EDAI ${edai.edai_id}`,
        actor: 'SYSTEM',
        edai_id: edai.edai_id,
        severity: edai.breach_severity
      });
    }
  });
  
  return auditTrail.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
}

/**
 * Export compliance report to JSON
 */
export function exportComplianceReport(
  edais: EDAI[],
  issuerId: string,
  outPath?: string
): void {
  const report = generateComplianceReport(edais, issuerId);
  const output = outPath || `./compliance_report_${issuerId}_${report.report_date}.json`;
  
  fs.writeFileSync(path.resolve(output), JSON.stringify(report, null, 2));
  console.log(`✅ Exported compliance report to ${output}`);
}

/**
 * Export compliance report to CSV format
 */
export function exportComplianceReportCSV(
  edais: EDAI[],
  issuerId: string,
  outPath?: string
): void {
  const report = generateComplianceReport(edais, issuerId);
  const output = outPath || `./compliance_report_${issuerId}_${report.report_date}.csv`;
  
  const csvHeader = 'Report ID,Report Date,Issuer ID,Total EDAIs,Active EDAIs,Breached EDAIs,Total Liability USD,Compliance Score,Regulatory Status\n';
  const csvRow = `${report.report_id},${report.report_date},${report.issuer_id},${report.total_edais},${report.active_edais},${report.breached_edais},${report.total_liability_usd},${report.compliance_score},${report.regulatory_status}\n`;
  
  fs.writeFileSync(path.resolve(output), csvHeader + csvRow);
  console.log(`✅ Exported compliance report CSV to ${output}`);
} 