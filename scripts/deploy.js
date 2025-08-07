const { ethers } = require("hardhat");

async function main() {
    console.log("🚀 Deploying CivicTrustRegistry...");

    // Get the contract factory
    const CivicTrustRegistry = await ethers.getContractFactory("CivicTrustRegistry");
    
    // Get the deployer account
    const [deployer] = await ethers.getSigners();
    console.log("📝 Deploying from account:", deployer.address);
    console.log("💰 Account balance:", (await ethers.provider.getBalance(deployer.address)).toString());

    // Get dashboard operator from environment or use deployer
    const dashboardOperator = process.env.DASHBOARD_OPERATOR || deployer.address;
    console.log("🎛️ Dashboard operator:", dashboardOperator);

    // Deploy the contract
    console.log("⏳ Deploying contract...");
    const registry = await CivicTrustRegistry.deploy(dashboardOperator);
    await registry.waitForDeployment();

    const contractAddress = await registry.getAddress();
    console.log("✅ CivicTrustRegistry deployed to:", contractAddress);

    // Verify deployment
    console.log("🔍 Verifying deployment...");
    
    // Check if dashboard operator role is set correctly
    const dashboardOperatorRole = await registry.DASHBOARD_OPERATOR_ROLE();
    const hasRole = await registry.hasRole(dashboardOperatorRole, dashboardOperator);
    console.log("✅ Dashboard operator role assigned:", hasRole);

    // Check if deployer is admin
    const defaultAdminRole = await registry.DEFAULT_ADMIN_ROLE();
    const deployerIsAdmin = await registry.hasRole(defaultAdminRole, deployer.address);
    console.log("✅ Deployer is admin:", deployerIsAdmin);

    // Check initial metrics
    const metrics = await registry.getBreachStatistics();
    console.log("📊 Initial metrics:", {
        totalBreaches: metrics.totalBreaches.toString(),
        lastMetricsUpdate: new Date(Number(metrics.lastMetricsUpdate) * 1000).toISOString()
    });

    console.log("✅ Deployment confirmed!");

    // Save deployment info
    const deploymentInfo = {
        network: hre.network.name,
        contract: "CivicTrustRegistry",
        address: contractAddress,
        deployer: deployer.address,
        dashboardOperator: dashboardOperator,
        deploymentTime: new Date().toISOString(),
        blockNumber: await ethers.provider.getBlockNumber(),
        gasUsed: "estimated"
    };

    console.log("📋 Deployment Summary:");
    console.log(JSON.stringify(deploymentInfo, null, 2));

    // Verify contract on Etherscan if not on local network
    if (hre.network.name !== "hardhat" && hre.network.name !== "localhost") {
        console.log("🔍 Verifying contract on Etherscan...");
        try {
            await hre.run("verify:verify", {
                address: contractAddress,
                constructorArguments: [dashboardOperator],
            });
            console.log("✅ Contract verified on Etherscan!");
        } catch (error) {
            console.log("⚠️ Verification failed:", error.message);
        }
    }

    console.log("🎉 Deployment completed successfully!");
    console.log("📖 Next steps:");
    console.log("   1. Update your .env file with the contract address");
    console.log("   2. Configure your dashboard integration");
    console.log("   3. Run tests to verify functionality");
    console.log("   4. Monitor events for dashboard integration");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Deployment failed:", error);
        process.exit(1);
    }); 