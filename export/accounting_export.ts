// CTR/export/accounting_export.ts

import fs from "fs";
import path from "path";
import { EDAI } from "../instruments/EDAI";

interface AccountingView {
  edai_id: string;
  usoa_code: string;
  probable: boolean;
  estimated_liability: number;
  disclosure_required: boolean;
  breach_event_id: string;
  issued_at: string;
  resource_id: string;
}

/**
 * Map full EDAI object to GAAP/USoA export format
 */
export function toAccountingView(edai: EDAI): AccountingView {
  return {
    edai_id: edai.edai_id,
    usoa_code: edai.usoa_code,
    probable: true, // assume breach is confirmed via cert
    estimated_liability: edai.liability_estimate_usd,
    disclosure_required: edai.liability_estimate_usd > 0,
    breach_event_id: edai.breach_event_id,
    issued_at: edai.issued_at,
    resource_id: edai.resource_id
  };
}

/**
 * Export the accounting view of an EDAI to JSON
 */
export function exportAccountingView(edai: EDAI, outPath?: string): void {
  const accountingView = toAccountingView(edai);
  const output = outPath || `./accounting_view_${edai.edai_id}.json`;
  fs.writeFileSync(path.resolve(output), JSON.stringify(accountingView, null, 2));
  console.log(`✅ Exported USoA accounting view to ${output}`);
}
