const { ethers } = require("hardhat");

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("Deploying complete EDAI system with account:", deployer.address);
    console.log("Account balance:", (await ethers.provider.getBalance(deployer.address)).toString());

    // Deploy core contracts
    console.log("\n1. Deploying core contracts...");

    // Deploy CivicTrustRegistry
    console.log("   - Deploying CivicTrustRegistry...");
    const CivicTrustRegistry = await ethers.getContractFactory("CivicTrustRegistry");
    const registry = await CivicTrustRegistry.deploy();
    await registry.waitForDeployment();
    console.log("     CivicTrustRegistry deployed to:", await registry.getAddress());

    // Deploy EDAI Oracle
    console.log("   - Deploying EDAI Oracle...");
    const EDAIOracle = await ethers.getContractFactory("EDAIOracle");
    const oracle = await EDAIOracle.deploy();
    await oracle.waitForDeployment();
    console.log("     EDAI Oracle deployed to:", await oracle.getAddress());

    // Deploy EDAI ZK Verifier
    console.log("   - Deploying EDAI ZK Verifier...");
    const EDAIZKVerifier = await ethers.getContractFactory("EDAIZKVerifier");
    const zkVerifier = await EDAIZKVerifier.deploy();
    await zkVerifier.waitForDeployment();
    console.log("     EDAI ZK Verifier deployed to:", await zkVerifier.getAddress());

    // Deploy EDAI Fallback Engine
    console.log("   - Deploying EDAI Fallback Engine...");
    const EDAIFallbackEngine = await ethers.getContractFactory("EDAIFallbackEngine");
    const fallbackEngine = await EDAIFallbackEngine.deploy();
    await fallbackEngine.waitForDeployment();
    console.log("     EDAI Fallback Engine deployed to:", await fallbackEngine.getAddress());

    // Deploy EDAI Token
    console.log("   - Deploying EDAI Token...");
    const EDAIToken = await ethers.getContractFactory("EDAIToken");
    const edaiToken = await EDAIToken.deploy("EDAI Token", "EDAI", 18);
    await edaiToken.waitForDeployment();
    console.log("     EDAI Token deployed to:", await edaiToken.getAddress());

    // Deploy EDAI Issuance
    console.log("   - Deploying EDAI Issuance...");
    const EDAIIssuance = await ethers.getContractFactory("EDAIIssuance");
    const issuance = await EDAIIssuance.deploy(await edaiToken.getAddress());
    await issuance.waitForDeployment();
    console.log("     EDAI Issuance deployed to:", await issuance.getAddress());

    // Deploy EDAI Securities Trading
    console.log("   - Deploying EDAI Securities Trading...");
    const EDAISecuritiesTrading = await ethers.getContractFactory("EDAISecuritiesTrading");
    const trading = await EDAISecuritiesTrading.deploy(await edaiToken.getAddress());
    await trading.waitForDeployment();
    console.log("     EDAI Securities Trading deployed to:", await trading.getAddress());

    // Deploy EDAI Integration Hub
    console.log("   - Deploying EDAI Integration Hub...");
    const EDAIIntegrationHub = await ethers.getContractFactory("EDAIIntegrationHub");
    const integrationHub = await EDAIIntegrationHub.deploy(
        await registry.getAddress(),
        await oracle.getAddress(),
        await zkVerifier.getAddress(),
        await fallbackEngine.getAddress(),
        await trading.getAddress(),
        await issuance.getAddress()
    );
    await integrationHub.waitForDeployment();
    console.log("     EDAI Integration Hub deployed to:", await integrationHub.getAddress());

    // Configure contracts
    console.log("\n2. Configuring contracts...");

    // Grant roles to integration hub
    console.log("   - Granting roles to Integration Hub...");
    
    // Registry roles
    await registry.grantRole(await registry.DASHBOARD_OPERATOR_ROLE(), await integrationHub.getAddress());
    await registry.grantRole(await registry.EMERGENCY_OPERATOR_ROLE(), await integrationHub.getAddress());
    await registry.grantRole(await registry.BATCH_OPERATOR_ROLE(), await integrationHub.getAddress());

    // Oracle roles
    await oracle.grantRole(await oracle.ORACLE_PROVIDER_ROLE(), await integrationHub.getAddress());
    await oracle.grantRole(await oracle.VALIDATOR_ROLE(), await integrationHub.getAddress());
    await oracle.grantRole(await oracle.OPERATOR_ROLE(), await integrationHub.getAddress());

    // ZK Verifier roles
    await zkVerifier.grantRole(await zkVerifier.VERIFIER_ROLE(), await integrationHub.getAddress());
    await zkVerifier.grantRole(await zkVerifier.PROVER_ROLE(), await integrationHub.getAddress());
    await zkVerifier.grantRole(await zkVerifier.OPERATOR_ROLE(), await integrationHub.getAddress());

    // Fallback Engine roles
    await fallbackEngine.grantRole(await fallbackEngine.EXECUTOR_ROLE(), await integrationHub.getAddress());
    await fallbackEngine.grantRole(await fallbackEngine.EMERGENCY_ROLE(), await integrationHub.getAddress());
    await fallbackEngine.grantRole(await fallbackEngine.OPERATOR_ROLE(), await integrationHub.getAddress());

    // Issuance roles
    await issuance.grantRole(await issuance.ISSUER_ROLE(), await integrationHub.getAddress());
    await issuance.grantRole(await issuance.REGULATOR_ROLE(), await integrationHub.getAddress());
    await issuance.grantRole(await issuance.COMPLIANCE_ROLE(), await integrationHub.getAddress());

    // Trading roles
    await trading.grantRole(await trading.TRADER_ROLE(), await integrationHub.getAddress());
    await trading.grantRole(await trading.LIQUIDITY_PROVIDER_ROLE(), await integrationHub.getAddress());
    await trading.grantRole(await trading.OPERATOR_ROLE(), await integrationHub.getAddress());

    // Token roles
    await edaiToken.grantRole(await edaiToken.MINTER_ROLE(), await issuance.getAddress());
    await edaiToken.grantRole(await edaiToken.BURNER_ROLE(), await fallbackEngine.getAddress());

    console.log("   - Roles granted successfully");

    // Initialize configurations
    console.log("   - Initializing configurations...");

    // Set up fallback configurations
    const fallbackConfig = {
        partialFallbackThreshold: ethers.parseEther("1000"),
        fullFallbackThreshold: ethers.parseEther("5000"),
        emergencyThreshold: ethers.parseEther("10000"),
        executionDelay: 300, // 5 minutes
        autoExecution: true
    };

    await fallbackEngine.updateFallbackConfig(
        "DEFAULT",
        fallbackConfig.partialFallbackThreshold,
        fallbackConfig.fullFallbackThreshold,
        fallbackConfig.emergencyThreshold,
        fallbackConfig.executionDelay,
        fallbackConfig.autoExecution
    );

    // Set up oracle configurations
    await oracle.authorizeProvider(await integrationHub.getAddress(), true);

    // Set up ZK verifier configurations
    await zkVerifier.authorizeVerifier(await integrationHub.getAddress(), true);

    console.log("   - Configurations initialized successfully");

    // Verify contracts on Etherscan (if not on localhost)
    const network = await ethers.provider.getNetwork();
    if (network.chainId !== 31337) { // Not localhost
        console.log("\n3. Verifying contracts on Etherscan...");
        
        try {
            // Verify CivicTrustRegistry
            await hre.run("verify:verify", {
                address: await registry.getAddress(),
                constructorArguments: [],
            });
            console.log("   - CivicTrustRegistry verified");

            // Verify EDAI Oracle
            await hre.run("verify:verify", {
                address: await oracle.getAddress(),
                constructorArguments: [],
            });
            console.log("   - EDAI Oracle verified");

            // Verify EDAI ZK Verifier
            await hre.run("verify:verify", {
                address: await zkVerifier.getAddress(),
                constructorArguments: [],
            });
            console.log("   - EDAI ZK Verifier verified");

            // Verify EDAI Fallback Engine
            await hre.run("verify:verify", {
                address: await fallbackEngine.getAddress(),
                constructorArguments: [],
            });
            console.log("   - EDAI Fallback Engine verified");

            // Verify EDAI Token
            await hre.run("verify:verify", {
                address: await edaiToken.getAddress(),
                constructorArguments: ["EDAI Token", "EDAI", 18],
            });
            console.log("   - EDAI Token verified");

            // Verify EDAI Issuance
            await hre.run("verify:verify", {
                address: await issuance.getAddress(),
                constructorArguments: [await edaiToken.getAddress()],
            });
            console.log("   - EDAI Issuance verified");

            // Verify EDAI Securities Trading
            await hre.run("verify:verify", {
                address: await trading.getAddress(),
                constructorArguments: [await edaiToken.getAddress()],
            });
            console.log("   - EDAI Securities Trading verified");

            // Verify EDAI Integration Hub
            await hre.run("verify:verify", {
                address: await integrationHub.getAddress(),
                constructorArguments: [
                    await registry.getAddress(),
                    await oracle.getAddress(),
                    await zkVerifier.getAddress(),
                    await fallbackEngine.getAddress(),
                    await trading.getAddress(),
                    await issuance.getAddress()
                ],
            });
            console.log("   - EDAI Integration Hub verified");

        } catch (error) {
            console.log("   - Verification failed:", error.message);
        }
    }

    // Output deployment summary
    console.log("\n4. Deployment Summary:");
    console.log("   ====================");
    console.log(`   CivicTrustRegistry: ${await registry.getAddress()}`);
    console.log(`   EDAI Oracle: ${await oracle.getAddress()}`);
    console.log(`   EDAI ZK Verifier: ${await zkVerifier.getAddress()}`);
    console.log(`   EDAI Fallback Engine: ${await fallbackEngine.getAddress()}`);
    console.log(`   EDAI Token: ${await edaiToken.getAddress()}`);
    console.log(`   EDAI Issuance: ${await issuance.getAddress()}`);
    console.log(`   EDAI Securities Trading: ${await trading.getAddress()}`);
    console.log(`   EDAI Integration Hub: ${await integrationHub.getAddress()}`);

    console.log("\n5. Next Steps:");
    console.log("   - Configure environment variables with contract addresses");
    console.log("   - Set up oracle data feeds");
    console.log("   - Configure ZK proof verification parameters");
    console.log("   - Set up fallback execution parameters");
    console.log("   - Test integration with GVMS dashboard");
    console.log("   - Deploy to mainnet when ready");

    // Save deployment addresses to file
    const deploymentInfo = {
        network: network.name,
        chainId: network.chainId,
        deployer: deployer.address,
        contracts: {
            civicTrustRegistry: await registry.getAddress(),
            edaiOracle: await oracle.getAddress(),
            edaiZKVerifier: await zkVerifier.getAddress(),
            edaiFallbackEngine: await fallbackEngine.getAddress(),
            edaiToken: await edaiToken.getAddress(),
            edaiIssuance: await issuance.getAddress(),
            edaiSecuritiesTrading: await trading.getAddress(),
            edaiIntegrationHub: await integrationHub.getAddress()
        },
        timestamp: new Date().toISOString()
    };

    const fs = require("fs");
    fs.writeFileSync(
        "deployment-info.json",
        JSON.stringify(deploymentInfo, null, 2)
    );
    console.log("\n   - Deployment info saved to deployment-info.json");

    console.log("\n✅ Complete EDAI system deployed successfully!");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    }); 