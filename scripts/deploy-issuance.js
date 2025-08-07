const { ethers } = require("hardhat");

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("Deploying issuance contracts with the account:", deployer.address);
    console.log("Account balance:", (await ethers.provider.getBalance(deployer.address)).toString());

    // Deploy EDAI Token
    console.log("\n1. Deploying EDAI Token...");
    const EDAIToken = await ethers.getContractFactory("EDAIToken");
    const edaiToken = await EDAIToken.deploy("EDAI Token", "EDAI", 18);
    await edaiToken.waitForDeployment();
    console.log("EDAI Token deployed to:", await edaiToken.getAddress());

    // Deploy EDAI Issuance
    console.log("\n2. Deploying EDAI Issuance...");
    const EDAIIssuance = await ethers.getContractFactory("EDAIIssuance");
    const edaiIssuance = await EDAIIssuance.deploy();
    await edaiIssuance.waitForDeployment();
    console.log("EDAI Issuance deployed to:", await edaiIssuance.getAddress());

    // Setup roles and permissions
    console.log("\n3. Setting up roles and permissions...");
    
    // Grant roles to the issuance contract
    await edaiToken.grantRole(await edaiToken.MINTER_ROLE(), await edaiIssuance.getAddress());
    await edaiToken.grantRole(await edaiToken.BURNER_ROLE(), await edaiIssuance.getAddress());
    
    console.log("Roles granted to issuance contract");

    // Grant admin roles to deployer
    await edaiIssuance.grantRole(await edaiIssuance.ISSUER_ROLE(), deployer.address);
    await edaiIssuance.grantRole(await edaiIssuance.REGULATOR_ROLE(), deployer.address);
    await edaiIssuance.grantRole(await edaiIssuance.COMPLIANCE_OFFICER_ROLE(), deployer.address);
    await edaiIssuance.grantRole(await edaiIssuance.INVESTOR_ROLE(), deployer.address);
    
    console.log("Admin roles granted to deployer");

    // Initialize test data
    console.log("\n4. Initializing test data...");
    
    // Create a test issuance
    const EDAI_ID = "EDAI-ISSUANCE-001";
    const TOTAL_SUPPLY = ethers.parseEther("1000000"); // 1 million tokens
    const PRICE_PER_TOKEN = ethers.parseEther("100"); // $100 per token
    const ISSUANCE_TYPE = 0; // PRIVATE_PLACEMENT
    const DESCRIPTION = "Test EDAI issuance for energy dispatch assurance";
    const MATURITY_DATE = Math.floor(Date.now() / 1000) + (365 * 24 * 60 * 60); // 1 year from now
    
    await edaiIssuance.createIssuance(
        EDAI_ID,
        TOTAL_SUPPLY,
        PRICE_PER_TOKEN,
        ISSUANCE_TYPE,
        DESCRIPTION,
        MATURITY_DATE
    );
    console.log("Test issuance created:", EDAI_ID);
    
    // Approve the issuance
    await edaiIssuance.approveIssuance(EDAI_ID);
    console.log("Issuance approved");
    
    // Activate the issuance
    await edaiIssuance.activateIssuance(EDAI_ID);
    console.log("Issuance activated");

    // Register a test investor
    const testInvestor = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8"; // Hardhat test account
    const allocationAmount = ethers.parseEther("10000"); // 10k tokens
    
    await edaiIssuance.allocateTokens(EDAI_ID, testInvestor, allocationAmount);
    console.log("Test investor allocated:", testInvestor, "Amount:", ethers.formatEther(allocationAmount));

    // Grant investor role to test investor
    await edaiIssuance.grantRole(await edaiIssuance.INVESTOR_ROLE(), testInvestor);
    console.log("Investor role granted to test investor");

    console.log("\n=== ISSUANCE DEPLOYMENT COMPLETE ===");
    console.log("\nContract Addresses:");
    console.log("EDAI Token:", await edaiToken.getAddress());
    console.log("EDAI Issuance:", await edaiIssuance.getAddress());
    
    console.log("\nTest Configuration:");
    console.log("EDAI ID:", EDAI_ID);
    console.log("Total Supply:", ethers.formatEther(TOTAL_SUPPLY), "tokens");
    console.log("Price Per Token:", ethers.formatEther(PRICE_PER_TOKEN), "USDC");
    console.log("Test Investor:", testInvestor);
    console.log("Allocation Amount:", ethers.formatEther(allocationAmount), "tokens");
    
    console.log("\nNext Steps:");
    console.log("1. Purchase tokens using purchaseTokens()");
    console.log("2. Mint tokens using edaiToken.mint()");
    console.log("3. Test the complete issuance workflow");
    console.log("4. Integrate with trading system");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    }); 