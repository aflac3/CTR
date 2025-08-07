// ctr_registry.ts

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

interface Attestation {
  timestamp: number;                     // Unix epoch
  resource_id: string;                   // Unique resource identifier
  breach_type: string;                   // E.g. "Φ-drop", "Ψ-surge", "zk-failure"
  hash_commitment: string;              // SHA256 of serialized evidence/proof
  reporter: string;                      // CLI or system issuing the breach
  proof_reference?: string;             // Optional zkProof file or hash reference
  fallback_merkle_root?: string;        // Optional fallback if zkProof fails
}

const REGISTRY_PATH = path.join(__dirname, 'registry_log.json');

// Load registry
let registry: Attestation[] = [];
if (fs.existsSync(REGISTRY_PATH)) {
  registry = JSON.parse(fs.readFileSync(REGISTRY_PATH, 'utf-8'));
}

// Save registry
function persist() {
  fs.writeFileSync(REGISTRY_PATH, JSON.stringify(registry, null, 2));
}

// Hash utility
function sha256(data: string): string {
  return crypto.createHash('sha256').update(data).digest('hex');
}

// Add new attestation
export function addAttestation(attestation: Attestation): string {
  // Validate required fields
  if (!attestation.resource_id || !attestation.timestamp || !attestation.hash_commitment) {
    throw new Error('Missing required attestation fields.');
  }

  // Generate unique ID
  const id = sha256(`${attestation.timestamp}-${attestation.resource_id}-${attestation.hash_commitment}`);

  // Add to registry
  registry.push({ ...attestation });
  persist();
  console.log(`✅ Attestation recorded: ${id}`);
  return id;
}

// Fetch all
export function getAllAttestations(): Attestation[] {
  return registry;
}

// Get by resource ID
export function getByResourceId(resource_id: string): Attestation[] {
  return registry.filter(a => a.resource_id === resource_id);
}

// Revoke advisory (placeholder only)
export function revoke(resource_id: string, timestamp: number): boolean {
  const i = registry.findIndex(
    a => a.resource_id === resource_id && a.timestamp === timestamp
  );
  if (i >= 0) {
    registry.splice(i, 1);
    persist();
    console.log(`🛑 Advisory revocation completed for ${resource_id} @ ${timestamp}`);
    return true;
  }
  return false;
}
