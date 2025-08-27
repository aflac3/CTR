// ctr/instruments/EDAI.ts

export interface EDAI {
    edai_id: string;                    // UUIDv4
    issued_at: string;                 // ISO8601 timestamp
    breach_event_id: string;          // V(t) ID, hash of telemetry or event
    survivability_cert_hash: string;  // hash(cert_json)
    resource_id: string;              // DER or substation ID
    fallback_rights: string;          // e.g., “Dispatch coverage of 100kWh at $350/MWh”
    liability_estimate_usd: number;   // estimated exposure
    usoa_code: string;                // e.g., "228.4"
    issuer_id: string;                // hash of issuing authority or sovereign key
    terms_hash: string;               // hash of instrument legal terms
    signature: string;                // detached or inline sig of full object
  }
  
  export function createEDAI(params: {
    breach_event_id: string;
    survivability_cert_hash: string;
    resource_id: string;
    fallback_rights: string;
    liability_estimate_usd: number;
    issuer_id: string;
    terms_hash: string;
    signature: string;
  }): EDAI {
    return {
      edai_id: crypto.randomUUID(),
      issued_at: new Date().toISOString(),
      breach_event_id: params.breach_event_id,
      survivability_cert_hash: params.survivability_cert_hash,
      resource_id: params.resource_id,
      fallback_rights: params.fallback_rights,
      liability_estimate_usd: params.liability_estimate_usd,
      usoa_code: "228.4",
      issuer_id: params.issuer_id,
      terms_hash: params.terms_hash,
      signature: params.signature,
    };
  }
  