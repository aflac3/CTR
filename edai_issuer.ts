// edai_issuer.ts
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Issues cryptographically signed EDAI (Energy Dispatch Assurance Instrument)
 * Based on existing attestations in the registry
 */

interface EDAI {
    id: string;
    attestationIndex: number;
    issuer: string;
    timestamp: number;
    signature: string;
    hash: string;
    metadata: {
        type: string;
        version: string;
        description: string;
    };
}

const OUTPUT_DIR = path.join(__dirname, 'edais');

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

export function issueEDAI(attestationIndex: number): EDAI {
    const timestamp = Date.now();
    const id = `EDAI-${attestationIndex.toString().padStart(3, '0')}`;
    
    // Generate hash from attestation data
    const data = `${id}-${attestationIndex}-${timestamp}`;
    const hash = crypto.createHash('sha256').update(data).digest('hex');
    
    // Create signature (in production, this would use proper key management)
    const signature = crypto.createHmac('sha256', 'secret-key').update(hash).digest('hex');
    
    const edai: EDAI = {
        id,
        attestationIndex,
        issuer: '0x' + crypto.randomBytes(20).toString('hex'),
        timestamp,
        signature,
        hash,
        metadata: {
            type: 'energy-dispatch-assurance',
            version: '1.0.0',
            description: 'Energy Dispatch Assurance Instrument'
        }
    };
    
    const filename = path.join(OUTPUT_DIR, `${edai.id}.json`);
    fs.writeFileSync(filename, JSON.stringify(edai, null, 2));
    console.log(`✅ EDAI issued and saved: ${filename}`);
    return edai;
}
