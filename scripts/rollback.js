const { ethers } = require("hardhat");

async function main() {
    console.log("🚨 Starting emergency rollback...");

    // Get the signer
    const [deployer] = await ethers.getSigners();
    console.log("Rollback deployer:", deployer.address);

    // Load previous deployment addresses from backup
    const backupFile = `./backup/deployment-${process.env.PREVIOUS_VERSION || 'latest'}.json`;
    let previousDeployment;
    
    try {
        previousDeployment = require(backupFile);
        console.log(`📁 Loaded backup from: ${backupFile}`);
    } catch (error) {
        console.error("❌ Failed to load backup file:", error.message);
        console.log("Attempting to load from environment variables...");
        
        // Fallback to environment variables
        previousDeployment = {
            registry: process.env.PREVIOUS_REGISTRY_ADDRESS,
            integrationHub: process.env.PREVIOUS_INTEGRATION_HUB_ADDRESS,
            oracle: process.env.PREVIOUS_ORACLE_ADDRESS,
            zkVerifier: process.env.PREVIOUS_ZK_VERIFIER_ADDRESS,
            fallbackEngine: process.env.PREVIOUS_FALLBACK_ENGINE_ADDRESS,
            trading: process.env.PREVIOUS_TRADING_ADDRESS,
            issuance: process.env.PREVIOUS_ISSUANCE_ADDRESS,
            token: process.env.PREVIOUS_TOKEN_ADDRESS
        };
    }

    if (!previousDeployment) {
        throw new Error("No previous deployment found for rollback");
    }

    console.log("📋 Previous deployment addresses:");
    console.log("- Registry:", previousDeployment.registry);
    console.log("- Integration Hub:", previousDeployment.integrationHub);
    console.log("- Oracle:", previousDeployment.oracle);
    console.log("- ZK Verifier:", previousDeployment.zkVerifier);
    console.log("- Fallback Engine:", previousDeployment.fallbackEngine);
    console.log("- Trading:", previousDeployment.trading);
    console.log("- Issuance:", previousDeployment.issuance);
    console.log("- Token:", previousDeployment.token);

    // Verify previous contracts are still deployed
    console.log("\n🔍 Verifying previous contracts...");
    const contractsToVerify = [
        { name: "Registry", address: previousDeployment.registry },
        { name: "Integration Hub", address: previousDeployment.integrationHub },
        { name: "Oracle", address: previousDeployment.oracle },
        { name: "ZK Verifier", address: previousDeployment.zkVerifier },
        { name: "Fallback Engine", address: previousDeployment.fallbackEngine },
        { name: "Trading", address: previousDeployment.trading },
        { name: "Issuance", address: previousDeployment.issuance },
        { name: "Token", address: previousDeployment.token }
    ];

    for (const contract of contractsToVerify) {
        if (contract.address) {
            const code = await ethers.provider.getCode(contract.address);
            if (code === "0x") {
                console.error(`❌ Contract ${contract.name} not found at ${contract.address}`);
            } else {
                console.log(`✅ Contract ${contract.name} verified at ${contract.address}`);
            }
        }
    }

    // Update integration hub to point to previous contracts
    if (previousDeployment.integrationHub) {
        console.log("\n🔄 Updating integration hub...");
        try {
            const IntegrationHub = await ethers.getContractFactory("EDAIIntegrationHub");
            const integrationHub = IntegrationHub.attach(previousDeployment.integrationHub);

            // Update contract references
            const updateTx = await integrationHub.updateContractReferences(
                previousDeployment.registry,
                previousDeployment.oracle,
                previousDeployment.zkVerifier,
                previousDeployment.fallbackEngine,
                previousDeployment.trading,
                previousDeployment.issuance
            );

            await updateTx.wait();
            console.log("✅ Integration hub updated successfully");
        } catch (error) {
            console.error("❌ Failed to update integration hub:", error.message);
        }
    }

    // Pause current system if needed
    console.log("\n⏸️ Pausing current system...");
    try {
        if (previousDeployment.registry) {
            const Registry = await ethers.getContractFactory("CivicTrustRegistry");
            const registry = Registry.attach(previousDeployment.registry);
            
            const pauseTx = await registry.setEmergencyPause(true);
            await pauseTx.wait();
            console.log("✅ System paused successfully");
        }
    } catch (error) {
        console.error("❌ Failed to pause system:", error.message);
    }

    // Verify rollback
    console.log("\n🔍 Verifying rollback...");
    try {
        if (previousDeployment.integrationHub) {
            const IntegrationHub = await ethers.getContractFactory("EDAIIntegrationHub");
            const integrationHub = IntegrationHub.attach(previousDeployment.integrationHub);

            const systemStatus = await integrationHub.getSystemStatus();
            console.log("System status after rollback:");
            console.log("- Registry active:", systemStatus.registryActive);
            console.log("- Oracle active:", systemStatus.oracleActive);
            console.log("- ZK Verifier active:", systemStatus.zkVerifierActive);
            console.log("- Fallback active:", systemStatus.fallbackActive);
            console.log("- Trading active:", systemStatus.tradingActive);
            console.log("- Issuance active:", systemStatus.issuanceActive);
        }
    } catch (error) {
        console.error("❌ Failed to verify rollback:", error.message);
    }

    // Create rollback report
    const rollbackReport = {
        timestamp: new Date().toISOString(),
        rollbackVersion: process.env.PREVIOUS_VERSION || 'latest',
        previousDeployment,
        rollbackDeployer: deployer.address,
        network: process.env.HARDHAT_NETWORK || 'unknown',
        status: 'completed'
    };

    // Save rollback report
    const fs = require('fs');
    const reportPath = `./backup/rollback-${Date.now()}.json`;
    fs.writeFileSync(reportPath, JSON.stringify(rollbackReport, null, 2));
    console.log(`📄 Rollback report saved to: ${reportPath}`);

    console.log("\n🎉 Rollback completed successfully!");
    console.log("⚠️ Please verify system functionality and notify stakeholders.");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Rollback failed:", error);
        process.exit(1);
    });
