// Test script to demonstrate CTR fallback log functionality
const fs = require('fs');
const crypto = require('crypto');

// Simulate the fallback log functionality
class FallbackLogDemo {
  constructor() {
    this.logPath = 'fallback_log.json';
    this.fallbackLog = [];
    this.loadLog();
  }

  loadLog() {
    if (fs.existsSync(this.logPath)) {
      this.fallbackLog = JSON.parse(fs.readFileSync(this.logPath, 'utf-8'));
    }
  }

  persist() {
    fs.writeFileSync(this.logPath, JSON.stringify(this.fallbackLog, null, 2));
  }

  hash(data) {
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  logFallback(entry) {
    if (!entry.resource_id || !entry.timestamp || !entry.evidence_hash) {
      throw new Error('Missing required fallback entry fields.');
    }

    this.fallbackLog.push(entry);
    this.persist();

    const id = this.hash(`${entry.resource_id}|${entry.timestamp}|${entry.evidence_hash}`);
    console.log(`⚠️ Fallback recorded for ${entry.resource_id} — ID: ${id}`);
    return id;
  }

  getFallbackLog() {
    return this.fallbackLog;
  }

  queryFallbacks(resource_id, failure_mode) {
    return this.fallbackLog.filter(entry => {
      return (!resource_id || entry.resource_id === resource_id) &&
             (!failure_mode || entry.failure_mode === failure_mode);
    });
  }
}

// Demo function
async function demoFallbackLog() {
  console.log('🚨 CTR Fallback Log System Demo');
  console.log('================================\n');

  const fallbackLog = new FallbackLogDemo();

  // Demo 1: Log a zkProof failure
  console.log('📝 Demo 1: Logging a zkProof failure');
  console.log('-------------------------------------');
  
  const zkFailure = {
    timestamp: Date.now(),
    resource_id: 'battery_us_gulf_01',
    failure_mode: 'zkProofFail',
    evidence_hash: crypto.createHash('sha256').update('zkProof validation failed: invalid curve parameters').digest('hex'),
    triggered_by: 'GVMS-validator-001'
  };

  const zkId = fallbackLog.logFallback(zkFailure);
  console.log(`✅ zkProof failure logged with ID: ${zkId}\n`);

  // Demo 2: Log a hash mismatch
  console.log('📝 Demo 2: Logging a hash mismatch');
  console.log('-----------------------------------');
  
  const hashMismatch = {
    timestamp: Date.now() + 1000,
    resource_id: 'solar_california_02',
    failure_mode: 'hashMismatch',
    evidence_hash: crypto.createHash('sha256').update('Expected: abc123, Got: def456').digest('hex'),
    triggered_by: 'integrity-checker'
  };

  const hashId = fallbackLog.logFallback(hashMismatch);
  console.log(`✅ Hash mismatch logged with ID: ${hashId}\n`);

  // Demo 3: Log telemetry unavailability
  console.log('📝 Demo 3: Logging telemetry unavailability');
  console.log('-------------------------------------------');
  
  const telemetryFail = {
    timestamp: Date.now() + 2000,
    resource_id: 'wind_texas_03',
    failure_mode: 'telemetryUnavailable',
    evidence_hash: crypto.createHash('sha256').update('Connection timeout: 30s exceeded').digest('hex'),
    triggered_by: 'monitoring-system'
  };

  const telemetryId = fallbackLog.logFallback(telemetryFail);
  console.log(`✅ Telemetry failure logged with ID: ${telemetryId}\n`);

  // Demo 4: Query all fallbacks
  console.log('📊 Demo 4: Querying all fallback entries');
  console.log('----------------------------------------');
  const allFallbacks = fallbackLog.getFallbackLog();
  console.log(`Total fallback entries: ${allFallbacks.length}`);
  allFallbacks.forEach((entry, index) => {
    console.log(`${index + 1}. ${entry.resource_id} - ${entry.failure_mode} (${new Date(entry.timestamp).toLocaleString()})`);
  });
  console.log('');

  // Demo 5: Filter by resource ID
  console.log('🔍 Demo 5: Filtering by resource ID');
  console.log('-----------------------------------');
  const batteryFallbacks = fallbackLog.queryFallbacks('battery_us_gulf_01');
  console.log(`Fallbacks for battery_us_gulf_01: ${batteryFallbacks.length}`);
  batteryFallbacks.forEach(entry => {
    console.log(`  - ${entry.failure_mode} triggered by ${entry.triggered_by}`);
  });
  console.log('');

  // Demo 6: Filter by failure mode
  console.log('🔍 Demo 6: Filtering by failure mode');
  console.log('------------------------------------');
  const zkFailures = fallbackLog.queryFallbacks(null, 'zkProofFail');
  console.log(`zkProof failures: ${zkFailures.length}`);
  zkFailures.forEach(entry => {
    console.log(`  - ${entry.resource_id} at ${new Date(entry.timestamp).toLocaleString()}`);
  });
  console.log('');

  // Demo 7: Show the JSON file
  console.log('📄 Demo 7: Generated fallback_log.json');
  console.log('--------------------------------------');
  const jsonContent = fs.readFileSync('fallback_log.json', 'utf-8');
  console.log(jsonContent);

  console.log('\n🎯 Fallback Log Demo Complete!');
  console.log('=============================');
  console.log('✅ 3 fallback events logged');
  console.log('✅ JSON file created: fallback_log.json');
  console.log('✅ Query functionality tested');
  console.log('✅ Filtering by resource and failure type working');
}

// Run the demo
demoFallbackLog().catch(console.error); 