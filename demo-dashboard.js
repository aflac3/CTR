const { ethers } = require("hardhat");

async function demoDashboard() {
    console.log("🎯 GVMS Dashboard Integration Demo");
    console.log("==================================\n");

    // Get the contract factory and deployer
    const CivicTrustRegistry = await ethers.getContractFactory("CivicTrustRegistry");
    const [deployer, user1, user2, dashboardOperator] = await ethers.getSigners();
    
    console.log("📝 Deploying contract for demo...");
    const registry = await CivicTrustRegistry.deploy(dashboardOperator.address);
    await registry.waitForDeployment();
    const contractAddress = await registry.getAddress();
    
    console.log("✅ Contract deployed to:", contractAddress);
    console.log("🎛️ Dashboard operator:", dashboardOperator.address);
    console.log("👤 Demo user:", user1.address);
    console.log("");

    // Demo 1: Register an EDAI
    console.log("🔵 Demo 1: Registering an EDAI");
    console.log("--------------------------------");
    await registry.connect(user1).registerCEDAI(
        "DEMO-001",
        ethers.zeroPadValue("0x01", 32),
        false,
        0,
        0,
        "Demo EDAI for testing"
    );
    console.log("✅ EDAI DEMO-001 registered successfully");
    console.log("");

    // Demo 2: Dashboard detects a breach
    console.log("🔴 Demo 2: Dashboard detects a breach");
    console.log("--------------------------------------");
    await registry.connect(dashboardOperator).updateBreachAssessment(
        "DEMO-001",
        2, // MODERATE severity
        3, // PARTIAL_FALLBACK action
        "Dashboard detected service level violation"
    );
    console.log("✅ Breach assessment updated by dashboard");
    console.log("");

    // Demo 3: Get breach statistics
    console.log("📊 Demo 3: Dashboard retrieves breach statistics");
    console.log("-----------------------------------------------");
    const stats = await registry.getBreachStatistics();
    console.log("📈 Breach Statistics:");
    console.log("   - Total breaches:", stats.totalBreaches.toString());
    console.log("   - Last update:", new Date(Number(stats.lastMetricsUpdate) * 1000).toLocaleString());
    console.log("");

    // Demo 4: Get EDAI entry details
    console.log("📋 Demo 4: Dashboard retrieves EDAI details");
    console.log("--------------------------------------------");
    const entry = await registry.getCEDAIEntry("DEMO-001");
    console.log("📄 EDAI Entry Details:");
    console.log("   - ID:", entry[0]);
    console.log("   - Issuer:", entry[1]);
    console.log("   - Has breach:", entry[3]);
    console.log("   - Severity:", entry[4]);
    console.log("   - Action:", entry[5]);
    console.log("   - Notes:", entry[6]);
    console.log("");

    // Demo 5: Batch operations
    console.log("📦 Demo 5: Dashboard performs batch operations");
    console.log("---------------------------------------------");
    await registry.connect(user2).registerCEDAI(
        "DEMO-002",
        ethers.zeroPadValue("0x02", 32),
        true,
        1,
        1,
        "Second demo EDAI"
    );
    
    const batchEntries = await registry.getBatchCEDAIEntries(["DEMO-001", "DEMO-002"]);
    console.log("✅ Retrieved", batchEntries.length, "EDAI entries in batch");
    console.log("");

    // Demo 6: Emergency controls
    console.log("🚨 Demo 6: Dashboard uses emergency controls");
    console.log("-------------------------------------------");
    await registry.connect(dashboardOperator).pause();
    console.log("✅ Contract paused by dashboard operator");
    
    try {
        await registry.connect(user1).registerCEDAI("DEMO-003", ethers.zeroPadValue("0x03", 32), false, 0, 0, "");
        console.log("❌ This should have failed (contract is paused)");
    } catch (error) {
        console.log("✅ Correctly prevented operation while paused");
    }
    
    await registry.connect(dashboardOperator).unpause();
    console.log("✅ Contract unpaused by dashboard operator");
    console.log("");

    console.log("🎯 Dashboard Integration Summary:");
    console.log("   • Monitor EDAI registrations");
}

demoDashboard()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Demo failed:", error);
        process.exit(1);
    }); 