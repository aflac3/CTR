const { ethers } = require("hardhat");

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("Deploying contracts with the account:", deployer.address);
    console.log("Account balance:", (await ethers.provider.getBalance(deployer.address)).toString());

    // Deploy mock tokens for testing (replace with actual token addresses in production)
    console.log("\n1. Deploying mock tokens...");
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const edaiToken = await MockERC20.deploy("EDAI Token", "EDAI");
    await edaiToken.waitForDeployment();
    console.log("EDAI Token deployed to:", await edaiToken.getAddress());

    const stablecoin = await MockERC20.deploy("USDC", "USDC");
    await stablecoin.waitForDeployment();
    console.log("USDC deployed to:", await stablecoin.getAddress());

    // Deploy trading engine
    console.log("\n2. Deploying EDAI Trading Engine...");
    const EDAITradingEngine = await ethers.getContractFactory("EDAITradingEngine");
    const tradingEngine = await EDAITradingEngine.deploy();
    await tradingEngine.waitForDeployment();
    console.log("Trading Engine deployed to:", await tradingEngine.getAddress());

    // Deploy liquidity pool
    console.log("\n3. Deploying EDAI Liquidity Pool...");
    const EDAILiquidityPool = await ethers.getContractFactory("EDAILiquidityPool");
    const liquidityPool = await EDAILiquidityPool.deploy(
        await stablecoin.getAddress(),
        await edaiToken.getAddress()
    );
    await liquidityPool.waitForDeployment();
    console.log("Liquidity Pool deployed to:", await liquidityPool.getAddress());

    // Deploy securities compliance
    console.log("\n4. Deploying EDAI Securities Compliance...");
    const EDAISecuritiesCompliance = await ethers.getContractFactory("EDAISecuritiesCompliance");
    const compliance = await EDAISecuritiesCompliance.deploy();
    await compliance.waitForDeployment();
    console.log("Securities Compliance deployed to:", await compliance.getAddress());

    // Deploy market data
    console.log("\n5. Deploying EDAI Market Data...");
    const EDAIMarketData = await ethers.getContractFactory("EDAIMarketData");
    const marketData = await EDAIMarketData.deploy();
    await marketData.waitForDeployment();
    console.log("Market Data deployed to:", await marketData.getAddress());

    // Deploy main securities trading contract
    console.log("\n6. Deploying EDAI Securities Trading...");
    const EDAISecuritiesTrading = await ethers.getContractFactory("EDAISecuritiesTrading");
    const securitiesTrading = await EDAISecuritiesTrading.deploy(
        await tradingEngine.getAddress(),
        await liquidityPool.getAddress(),
        await compliance.getAddress(),
        await marketData.getAddress()
    );
    await securitiesTrading.waitForDeployment();
    console.log("Securities Trading deployed to:", await securitiesTrading.getAddress());

    // Setup roles and permissions
    console.log("\n7. Setting up roles and permissions...");
    
    // Grant roles to the main trading contract
    await tradingEngine.grantRole(await tradingEngine.TRADER_ROLE(), await securitiesTrading.getAddress());
    await liquidityPool.grantRole(await liquidityPool.LIQUIDITY_PROVIDER_ROLE(), await securitiesTrading.getAddress());
    await compliance.grantRole(await compliance.TRADER_ROLE(), await securitiesTrading.getAddress());
    await marketData.grantRole(await marketData.PRICE_FEED_ROLE(), await securitiesTrading.getAddress());
    
    console.log("Roles granted to main trading contract");

    // Grant admin roles to deployer
    await securitiesTrading.grantRole(await securitiesTrading.COMPLIANCE_OFFICER_ROLE(), deployer.address);
    await securitiesTrading.grantRole(await securitiesTrading.LIQUIDITY_PROVIDER_ROLE(), deployer.address);
    await securitiesTrading.grantRole(await securitiesTrading.TRADER_ROLE(), deployer.address);
    
    console.log("Admin roles granted to deployer");

    // Initialize some test data
    console.log("\n8. Initializing test data...");
    
    // Create a test EDAI trading pair
    const EDAI_ID = "EDAI-TEST-001";
    const INITIAL_PRICE = ethers.parseEther("100"); // $100 per EDAI
    
    await securitiesTrading.startTradingSession(EDAI_ID, INITIAL_PRICE);
    console.log("Trading session started for:", EDAI_ID);
    
    await securitiesTrading.createTradingPair(
        EDAI_ID,
        ethers.parseEther("1"),    // min order size
        ethers.parseEther("10000"), // max order size
        ethers.parseEther("0.01"),  // tick size
        ethers.parseEther("1"),     // lot size
        false,                      // no margin
        0                           // margin requirement
    );
    console.log("Trading pair created for:", EDAI_ID);

    // Register a test investor
    const testInvestor = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8"; // Hardhat test account
    const allowedEdaiIds = [EDAI_ID];
    const maxInvestment = ethers.parseEther("100000"); // $100k
    
    await compliance.registerInvestor(
        testInvestor,
        true, // accredited
        maxInvestment,
        allowedEdaiIds
    );
    console.log("Test investor registered:", testInvestor);
    
    await compliance.verifyKYC(testInvestor, "Test-KYC-Provider");
    await compliance.clearAML(testInvestor, "Test-AML-Provider");
    console.log("Test investor KYC/AML verified");

    // Grant trader role to test investor
    await securitiesTrading.grantRole(await securitiesTrading.TRADER_ROLE(), testInvestor);
    console.log("Trader role granted to test investor");

    console.log("\n=== DEPLOYMENT COMPLETE ===");
    console.log("\nContract Addresses:");
    console.log("EDAI Token:", await edaiToken.getAddress());
    console.log("USDC:", await stablecoin.getAddress());
    console.log("Trading Engine:", await tradingEngine.getAddress());
    console.log("Liquidity Pool:", await liquidityPool.getAddress());
    console.log("Securities Compliance:", await compliance.getAddress());
    console.log("Market Data:", await marketData.getAddress());
    console.log("Securities Trading:", await securitiesTrading.getAddress());
    
    console.log("\nTest Configuration:");
    console.log("EDAI ID:", EDAI_ID);
    console.log("Initial Price:", ethers.formatEther(INITIAL_PRICE), "USDC");
    console.log("Test Investor:", testInvestor);
    console.log("Max Investment:", ethers.formatEther(maxInvestment), "USDC");
    
    console.log("\nNext Steps:");
    console.log("1. Add liquidity to the pool using addLiquidity()");
    console.log("2. Start trading by placing buy/sell orders");
    console.log("3. Monitor market data and compliance");
    console.log("4. Test the complete trading workflow");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    }); 