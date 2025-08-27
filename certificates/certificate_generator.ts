// CTR/certificates/certificate_generator.ts

import fs from "fs";
import path from "path";
import crypto from "crypto";

interface MetricSnapshot {
  Φ: number;
  Ψ: number;
  Ω: number;
  χ: number;
  SRC: number;
}

interface BreachEvent {
  event_id: string;
  resource_id: string;
  telemetry_hash: string;
  metric_snapshot: MetricSnapshot;
  violation: boolean;
  issuer_id?: string;
}

interface SurvivabilityCertificate {
  cert_id: string;
  issued_at: string;
  event_id: string;
  telemetry_hash: string;
  metric_snapshot: MetricSnapshot;
  violation_flag: boolean;
  signature: string;
  public_key: string;
  issuer_id?: string;
}

function loadKeyPair(): { privateKey: Buffer; publicKey: string } {
  const privPath = path.resolve("./private_key.pem");
  const pubPath = path.resolve("./public_key.pem");
  const privateKey = fs.readFileSync(privPath);
  const publicKey = fs.readFileSync(pubPath, "utf-8");
  return { privateKey, publicKey };
}

function signCertificateBody(body: object, privateKey: Buffer): string {
  const sign = crypto.createSign("SHA256");
  sign.update(JSON.stringify(body));
  sign.end();
  return sign.sign(privateKey, "hex");
}

export function generateCertificate(breachPath: string, outputPath?: string): SurvivabilityCertificate {
  const breach: BreachEvent = JSON.parse(fs.readFileSync(path.resolve(breachPath), "utf-8"));
  const { privateKey, publicKey } = loadKeyPair();

  const certBody = {
    issued_at: new Date().toISOString(),
    event_id: breach.event_id,
    telemetry_hash: breach.telemetry_hash,
    metric_snapshot: breach.metric_snapshot,
    violation_flag: breach.violation,
    issuer_id: breach.issuer_id || "unspecified"
  };

  const cert_id = crypto.createHash("sha256")
    .update(JSON.stringify(certBody))
    .digest("hex");

  const signature = signCertificateBody(certBody, privateKey);

  const cert: SurvivabilityCertificate = {
    ...certBody,
    cert_id,
    signature,
    public_key: publicKey
  };

  const targetPath = outputPath || `./signed_cert_${breach.event_id}.json`;
  fs.writeFileSync(targetPath, JSON.stringify(cert, null, 2));
  console.log(`✅ Certificate issued: ${targetPath}`);

  return cert;
}
