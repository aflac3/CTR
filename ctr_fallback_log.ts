// CTR/ctr_fallback_log.ts

import fs from "fs";
import path from "path";
import os from "os";
import crypto from "crypto";

const LOG_PATH = path.resolve("./fallback_log.json");
const BACKUP_PATH = path.resolve(`./fallback_log.bak.${Date.now()}`);

export interface FallbackLogEntry {
  edai_id: string;
  cert_id: string;
  resource_id: string;
  timestamp: string;
  issuer_id: string;
  hash?: string;
  prev_hash?: string;
}

/**
 * Compute a hash of a fallback log entry
 */
function hashEntry(entry: FallbackLogEntry): string {
  const copy = { ...entry };
  delete copy.hash; // exclude self-hash
  return crypto.createHash("sha256").update(JSON.stringify(copy)).digest("hex");
}

/**
 * Append a fallback log entry to fallback_log.json with tamper-evident chaining and backup
 */
export function appendFallbackLog(entry: FallbackLogEntry): void {
  const logExists = fs.existsSync(LOG_PATH);
  let log: FallbackLogEntry[] = [];

  if (logExists) {
    const raw = fs.readFileSync(LOG_PATH, "utf-8");
    try {
      log = JSON.parse(raw);
    } catch (err) {
      console.error("⚠️ Could not parse existing fallback_log.json, starting new log.");
    }
  }

  const prevEntry = log.length > 0 ? log[log.length - 1] : null;
  entry.prev_hash = prevEntry?.hash || null;
  entry.hash = hashEntry(entry);

  log.push(entry);

  try {
    // Backup current log first
    if (logExists) {
      fs.copyFileSync(LOG_PATH, BACKUP_PATH);
    }

    // Atomic write: write to tmp file then rename
    const tmpPath = `${LOG_PATH}.tmp`;
    fs.writeFileSync(tmpPath, JSON.stringify(log, null, 2));
    fs.renameSync(tmpPath, LOG_PATH);

    console.log(`📘 Fallback log appended: ${entry.edai_id}`);
  } catch (err) {
    console.error("❌ Failed to append fallback log:", err);
  }
}
