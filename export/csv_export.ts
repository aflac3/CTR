// CTR/export/csv_export.ts

import fs from 'fs';
import path from 'path';
import { EDAI } from '../instruments/EDAI';

interface CSVExportOptions {
  includeHeaders?: boolean;
  delimiter?: string;
  dateFormat?: string;
}

/**
 * Convert EDAI array to CSV format
 */
export function edaisToCSV(
  edais: EDAI[],
  options: CSVExportOptions = {}
): string {
  const {
    includeHeaders = true,
    delimiter = ',',
    dateFormat = 'ISO'
  } = options;

  const headers = [
    'EDAI ID',
    'Issuer',
    'Resource ID',
    'USoA Code',
    'Liability Estimate USD',
    'Breach Flag',
    'Breach Severity',
    'Breach Event ID',
    'Issued At',
    'Is Active',
    'Breach Timestamp'
  ];

  const rows = edais.map(edai => [
    edai.edai_id,
    edai.issuer,
    edai.resource_id,
    edai.usoa_code,
    edai.liability_estimate_usd.toString(),
    edai.breach_flag.toString(),
    edai.breach_severity || '',
    edai.breach_event_id || '',
    formatDate(edai.issued_at, dateFormat),
    edai.isActive.toString(),
    edai.breach_timestamp ? formatDate(edai.breach_timestamp, dateFormat) : ''
  ]);

  let csv = '';
  
  if (includeHeaders) {
    csv += headers.join(delimiter) + '\n';
  }
  
  csv += rows.map(row => row.join(delimiter)).join('\n');
  
  return csv;
}

/**
 * Convert audit trail to CSV format
 */
export function auditTrailToCSV(
  auditEntries: Array<{
    timestamp: string;
    action: string;
    description: string;
    actor: string;
    edai_id?: string;
    severity?: string;
  }>,
  options: CSVExportOptions = {}
): string {
  const {
    includeHeaders = true,
    delimiter = ',',
    dateFormat = 'ISO'
  } = options;

  const headers = [
    'Timestamp',
    'Action',
    'Description',
    'Actor',
    'EDAI ID',
    'Severity'
  ];

  const rows = auditEntries.map(entry => [
    formatDate(entry.timestamp, dateFormat),
    entry.action,
    `"${entry.description.replace(/"/g, '""')}"`,
    entry.actor,
    entry.edai_id || '',
    entry.severity || ''
  ]);

  let csv = '';
  
  if (includeHeaders) {
    csv += headers.join(delimiter) + '\n';
  }
  
  csv += rows.map(row => row.join(delimiter)).join('\n');
  
  return csv;
}

/**
 * Export EDAIs to CSV file
 */
export function exportEDAIsToCSV(
  edais: EDAI[],
  outPath?: string,
  options: CSVExportOptions = {}
): void {
  const csv = edaisToCSV(edais, options);
  const output = outPath || `./edais_export_${new Date().toISOString().split('T')[0]}.csv`;
  
  fs.writeFileSync(path.resolve(output), csv);
  console.log(`✅ Exported ${edais.length} EDAIs to CSV: ${output}`);
}

/**
 * Export audit trail to CSV file
 */
export function exportAuditTrailToCSV(
  auditEntries: Array<{
    timestamp: string;
    action: string;
    description: string;
    actor: string;
    edai_id?: string;
    severity?: string;
  }>,
  outPath?: string,
  options: CSVExportOptions = {}
): void {
  const csv = auditTrailToCSV(auditEntries, options);
  const output = outPath || `./audit_trail_export_${new Date().toISOString().split('T')[0]}.csv`;
  
  fs.writeFileSync(path.resolve(output), csv);
  console.log(`✅ Exported ${auditEntries.length} audit entries to CSV: ${output}`);
}

/**
 * Export summary statistics to CSV
 */
export function exportSummaryToCSV(
  edais: EDAI[],
  outPath?: string,
  options: CSVExportOptions = {}
): void {
  const {
    includeHeaders = true,
    delimiter = ','
  } = options;

  const totalEdais = edais.length;
  const activeEdais = edais.filter(edai => edai.isActive).length;
  const breachedEdais = edais.filter(edai => edai.breach_flag).length;
  const totalLiability = edais.reduce((sum, edai) => sum + edai.liability_estimate_usd, 0);
  
  const severityCounts = edais.reduce((counts, edai) => {
    const severity = edai.breach_severity || 'NONE';
    counts[severity] = (counts[severity] || 0) + 1;
    return counts;
  }, {} as Record<string, number>);

  const headers = [
    'Metric',
    'Value'
  ];

  const rows = [
    ['Total EDAIs', totalEdais.toString()],
    ['Active EDAIs', activeEdais.toString()],
    ['Breached EDAIs', breachedEdais.toString()],
    ['Total Liability USD', totalLiability.toString()],
    ['Breach Rate', totalEdais > 0 ? ((breachedEdais / totalEdais) * 100).toFixed(2) + '%' : '0%'],
    ['Minor Breaches', (severityCounts['MINOR'] || 0).toString()],
    ['Moderate Breaches', (severityCounts['MODERATE'] || 0).toString()],
    ['Severe Breaches', (severityCounts['SEVERE'] || 0).toString()],
    ['Critical Breaches', (severityCounts['CRITICAL'] || 0).toString()]
  ];

  let csv = '';
  
  if (includeHeaders) {
    csv += headers.join(delimiter) + '\n';
  }
  
  csv += rows.map(row => row.join(delimiter)).join('\n');
  
  const output = outPath || `./summary_export_${new Date().toISOString().split('T')[0]}.csv`;
  fs.writeFileSync(path.resolve(output), csv);
  console.log(`✅ Exported summary statistics to CSV: ${output}`);
}

/**
 * Format date according to specified format
 */
function formatDate(dateString: string, format: string): string {
  const date = new Date(dateString);
  
  switch (format) {
    case 'ISO':
      return date.toISOString();
    case 'YYYY-MM-DD':
      return date.toISOString().split('T')[0];
    case 'MM/DD/YYYY':
      return date.toLocaleDateString('en-US');
    case 'DD/MM/YYYY':
      return date.toLocaleDateString('en-GB');
    default:
      return date.toISOString();
  }
} 