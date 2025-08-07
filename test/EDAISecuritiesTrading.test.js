const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("EDAI Securities Trading System", function () {
    let tradingEngine, liquidityPool, compliance, marketData, securitiesTrading;
    let owner, trader1, trader2, liquidityProvider, complianceOfficer;
    let edaiToken, stablecoin;
    
    const EDAI_ID = "EDAI-TEST-001";
    const INITIAL_PRICE = ethers.parseEther("100"); // $100 per EDAI
    const INITIAL_LIQUIDITY = ethers.parseEther("1000"); // 1000 EDAI
    const STABLECOIN_LIQUIDITY = ethers.parseEther("100000"); // $100,000 USDC
    
    beforeEach(async function () {
        [owner, trader1, trader2, liquidityProvider, complianceOfficer] = await ethers.getSigners();
        
        // Deploy mock tokens
        const MockToken = await ethers.getContractFactory("MockERC20");
        edaiToken = await MockToken.deploy("EDAI Token", "EDAI");
        stablecoin = await MockToken.deploy("USDC", "USDC");
        
        // Deploy trading components
        const EDAITradingEngine = await ethers.getContractFactory("EDAITradingEngine");
        tradingEngine = await EDAITradingEngine.deploy();
        
        const EDAILiquidityPool = await ethers.getContractFactory("EDAILiquidityPool");
        liquidityPool = await EDAILiquidityPool.deploy(await stablecoin.getAddress(), await edaiToken.getAddress());
        
        const EDAISecuritiesCompliance = await ethers.getContractFactory("EDAISecuritiesCompliance");
        compliance = await EDAISecuritiesCompliance.deploy();
        
        const EDAIMarketData = await ethers.getContractFactory("EDAIMarketData");
        marketData = await EDAIMarketData.deploy();
        
        // Deploy main trading contract
        const EDAISecuritiesTrading = await ethers.getContractFactory("EDAISecuritiesTrading");
        securitiesTrading = await EDAISecuritiesTrading.deploy(
            await tradingEngine.getAddress(),
            await liquidityPool.getAddress(),
            await compliance.getAddress(),
            await marketData.getAddress()
        );
        
        // Setup roles for the main contract
        await tradingEngine.grantRole(await tradingEngine.TRADER_ROLE(), await securitiesTrading.getAddress());
        await liquidityPool.grantRole(await liquidityPool.LIQUIDITY_PROVIDER_ROLE(), await securitiesTrading.getAddress());
        await compliance.grantRole(await compliance.TRADER_ROLE(), await securitiesTrading.getAddress());
        await marketData.grantRole(await marketData.PRICE_FEED_ROLE(), await securitiesTrading.getAddress());
        
        // Grant roles to test accounts
        await securitiesTrading.grantRole(await securitiesTrading.TRADER_ROLE(), trader1.address);
        await securitiesTrading.grantRole(await securitiesTrading.TRADER_ROLE(), trader2.address);
        await securitiesTrading.grantRole(await securitiesTrading.LIQUIDITY_PROVIDER_ROLE(), liquidityProvider.address);
        await securitiesTrading.grantRole(await securitiesTrading.COMPLIANCE_OFFICER_ROLE(), complianceOfficer.address);
        
        // Grant trading engine roles to traders
        await tradingEngine.grantRole(await tradingEngine.TRADER_ROLE(), trader1.address);
        await tradingEngine.grantRole(await tradingEngine.TRADER_ROLE(), trader2.address);
        
        // Grant trading engine roles to securitiesTrading contract
        await tradingEngine.grantRole(await tradingEngine.TRADER_ROLE(), await securitiesTrading.getAddress());
        
        // Grant compliance roles
        await compliance.grantRole(await compliance.COMPLIANCE_OFFICER_ROLE(), complianceOfficer.address);
        await compliance.grantRole(await compliance.KYC_PROVIDER_ROLE(), complianceOfficer.address);
        await compliance.grantRole(await compliance.AML_PROVIDER_ROLE(), complianceOfficer.address);
        await compliance.grantRole(await compliance.COMPLIANCE_OFFICER_ROLE(), await securitiesTrading.getAddress());
        
        // Grant market data roles
        await marketData.grantRole(await marketData.PRICE_FEED_ROLE(), complianceOfficer.address);
        
        // Grant liquidity pool roles
        await liquidityPool.grantRole(await liquidityPool.LIQUIDITY_PROVIDER_ROLE(), liquidityProvider.address);
    });
    
    describe("Trading Session Management", function () {
        it("Should start a trading session", async function () {
            await securitiesTrading.connect(complianceOfficer).startTradingSession(EDAI_ID, INITIAL_PRICE);
            
            const session = await securitiesTrading.tradingSessions(EDAI_ID);
            expect(session.isActive).to.be.true;
            expect(session.openPrice).to.equal(INITIAL_PRICE);
        });
        
        it("Should end a trading session", async function () {
            await securitiesTrading.connect(complianceOfficer).startTradingSession(EDAI_ID, INITIAL_PRICE);
            await securitiesTrading.connect(complianceOfficer).endTradingSession(EDAI_ID, INITIAL_PRICE);
            
            const session = await securitiesTrading.tradingSessions(EDAI_ID);
            expect(session.isActive).to.be.false;
            expect(session.closePrice).to.equal(INITIAL_PRICE);
        });
    });
    
    describe("Trading Pair Creation", function () {
        it("Should create a trading pair", async function () {
            const minOrderSize = ethers.parseEther("1");
            const maxOrderSize = ethers.parseEther("10000");
            const tickSize = ethers.parseEther("0.01");
            const lotSize = ethers.parseEther("1");
            
            await securitiesTrading.connect(complianceOfficer).createTradingPair(
                EDAI_ID,
                minOrderSize,
                maxOrderSize,
                tickSize,
                lotSize,
                false, // no margin
                0
            );
            
            const pair = await securitiesTrading.tradingPairs(EDAI_ID);
            expect(pair.isActive).to.be.true;
            expect(pair.minOrderSize).to.equal(minOrderSize);
            expect(pair.maxOrderSize).to.equal(maxOrderSize);
        });
    });
    
    describe("Investor Registration and Compliance", function () {
        it("Should register an investor", async function () {
            const allowedEdaiIds = [EDAI_ID];
            const maxInvestment = ethers.parseEther("100000"); // $100k
            
            await compliance.connect(complianceOfficer).registerInvestor(
                trader1.address,
                true, // accredited
                maxInvestment,
                allowedEdaiIds
            );
            
            const profile = await compliance.getInvestorProfile(trader1.address);
            expect(profile.isActive).to.be.true;
            expect(profile.isAccredited).to.be.true;
            expect(profile.maxInvestment).to.equal(maxInvestment);
        });
        
        it("Should verify KYC for an investor", async function () {
            const allowedEdaiIds = [EDAI_ID];
            await compliance.connect(complianceOfficer).registerInvestor(
                trader1.address,
                true,
                ethers.parseEther("100000"),
                allowedEdaiIds
            );
            
            await compliance.connect(complianceOfficer).verifyKYC(trader1.address, "KYC-Provider-1");
            
            const profile = await compliance.getInvestorProfile(trader1.address);
            expect(profile.kycVerified).to.be.true;
        });
        
        it("Should clear AML for an investor", async function () {
            const allowedEdaiIds = [EDAI_ID];
            await compliance.connect(complianceOfficer).registerInvestor(
                trader1.address,
                true,
                ethers.parseEther("100000"),
                allowedEdaiIds
            );
            
            await compliance.connect(complianceOfficer).clearAML(trader1.address, "AML-Provider-1");
            
            const profile = await compliance.getInvestorProfile(trader1.address);
            expect(profile.amlCleared).to.be.true;
        });
    });
    
    describe("Order Placement and Execution", function () {
        beforeEach(async function () {
            // Register and verify traders first
            const allowedEdaiIds = [EDAI_ID];
            
            // Register trader1
            await compliance.connect(complianceOfficer).registerInvestor(
                trader1.address,
                true,
                ethers.parseEther("100000"),
                allowedEdaiIds
            );
            await compliance.connect(complianceOfficer).verifyKYC(trader1.address, "KYC-Provider-1");
            await compliance.connect(complianceOfficer).clearAML(trader1.address, "AML-Provider-1");
            
            // Register trader2
            await compliance.connect(complianceOfficer).registerInvestor(
                trader2.address,
                true,
                ethers.parseEther("100000"),
                allowedEdaiIds
            );
            await compliance.connect(complianceOfficer).verifyKYC(trader2.address, "KYC-Provider-1");
            await compliance.connect(complianceOfficer).clearAML(trader2.address, "AML-Provider-1");
            
            // Start trading session and create trading pair
            await securitiesTrading.connect(complianceOfficer).startTradingSession(EDAI_ID, INITIAL_PRICE);
            await securitiesTrading.connect(complianceOfficer).createTradingPair(
                EDAI_ID,
                ethers.parseEther("1"),
                ethers.parseEther("10000"),
                ethers.parseEther("0.01"),
                ethers.parseEther("1"),
                false,
                0
            );
        });
        
        it("Should place a buy order", async function () {
            const quantity = ethers.parseEther("10");
            const price = ethers.parseEther("100");
            
            // Check trading session status
            const session = await securitiesTrading.tradingSessions(EDAI_ID);
            console.log("Trading session active:", session.isActive);
            
            // Check trading pair status
            const pair = await securitiesTrading.tradingPairs(EDAI_ID);
            console.log("Trading pair active:", pair.isActive);
            console.log("Min order size:", pair.minOrderSize.toString());
            console.log("Max order size:", pair.maxOrderSize.toString());
            console.log("Lot size:", pair.lotSize.toString());
            console.log("Tick size:", pair.tickSize.toString());
            
            // Check if trading is enabled
            const tradingEnabled = await securitiesTrading.edaiTradingEnabled(EDAI_ID);
            console.log("Trading enabled:", tradingEnabled);
            
            // Check investor eligibility
            const isEligible = await compliance.verifyInvestorEligibility(trader1.address, EDAI_ID, quantity);
            console.log("Investor eligible:", isEligible);
            
            // Check initial orders
            const initialOrders = await tradingEngine.getTraderOrders(trader1.address);
            console.log("Initial orders:", initialOrders.length);
            
            await securitiesTrading.connect(trader1).placeBuyOrder(EDAI_ID, quantity, price);
            
            // Check final orders
            const orders = await tradingEngine.getTraderOrders(trader1.address);
            console.log("Final orders:", orders.length);
            console.log("Order IDs:", orders);
            
            expect(orders.length).to.equal(1);
        });
        
        it("Should place a sell order", async function () {
            const quantity = ethers.parseEther("10");
            const price = ethers.parseEther("100");
            
            await securitiesTrading.connect(trader2).placeSellOrder(EDAI_ID, quantity, price);
            
            const orders = await tradingEngine.getTraderOrders(trader2.address);
            expect(orders.length).to.equal(1);
        });
        
        it("Should execute a trade between buy and sell orders", async function () {
            const quantity = ethers.parseEther("10");
            const price = ethers.parseEther("100");
            
            await securitiesTrading.connect(trader1).placeBuyOrder(EDAI_ID, quantity, price);
            await securitiesTrading.connect(trader2).placeSellOrder(EDAI_ID, quantity, price);
            
            const buyOrders = await tradingEngine.getTraderOrders(trader1.address);
            const sellOrders = await tradingEngine.getTraderOrders(trader2.address);
            
            await securitiesTrading.connect(trader1).executeTrade(buyOrders[0], sellOrders[0]);
            
            // Verify orders are filled
            const buyOrder = await tradingEngine.ordersById(buyOrders[0]);
            const sellOrder = await tradingEngine.ordersById(sellOrders[0]);
            expect(buyOrder.status).to.equal(2); // FILLED
            expect(sellOrder.status).to.equal(2); // FILLED
        });
    });
    
    describe("Liquidity Provision", function () {
        it("Should add liquidity to a pool", async function () {
            // First create the pool
            await liquidityPool.connect(liquidityProvider).createPool(
                EDAI_ID,
                INITIAL_LIQUIDITY,
                STABLECOIN_LIQUIDITY
            );
            
            // Then add more liquidity
            const additionalEdai = ethers.parseEther("500");
            const additionalStablecoin = ethers.parseEther("50000");
            
            await liquidityPool.connect(liquidityProvider).addLiquidity(
                EDAI_ID,
                additionalEdai,
                additionalStablecoin
            );
            
            const pool = await liquidityPool.pools(EDAI_ID);
            expect(pool.isActive).to.be.true;
            expect(pool.edaiBalance).to.equal(INITIAL_LIQUIDITY + additionalEdai);
            expect(pool.stablecoinBalance).to.equal(STABLECOIN_LIQUIDITY + additionalStablecoin);
        });
    });
    
    describe("Market Data and Analytics", function () {
        it("Should update price data", async function () {
            const price = ethers.parseEther("100");
            const volume = ethers.parseEther("10");
            
            await marketData.connect(complianceOfficer).updatePrice(EDAI_ID, price, volume);
            
            const priceData = await marketData.getPriceData(EDAI_ID);
            expect(priceData.lastPrice).to.equal(price);
            expect(priceData.volume24h).to.equal(volume);
        });
        
        it("Should add EDAI to watchlist", async function () {
            // Register trader first
            const allowedEdaiIds = [EDAI_ID];
            await compliance.connect(complianceOfficer).registerInvestor(
                trader1.address,
                true,
                ethers.parseEther("100000"),
                allowedEdaiIds
            );
            
            await securitiesTrading.connect(trader1).addToWatchlist(EDAI_ID);
            
            const watchlist = await securitiesTrading.getWatchlist(trader1.address);
            expect(watchlist).to.include(EDAI_ID);
        });
    });
    
    describe("Compliance and Restrictions", function () {
        it("Should add trading restrictions", async function () {
            const allowedEdaiIds = [EDAI_ID];
            await compliance.connect(complianceOfficer).registerInvestor(
                trader1.address,
                true,
                ethers.parseEther("100000"),
                allowedEdaiIds
            );
            
            await compliance.connect(complianceOfficer).addTradingRestriction(
                EDAI_ID,
                trader1.address,
                1, // VOLUME_LIMIT
                ethers.parseEther("1000"),
                Math.floor(Date.now() / 1000) + 86400, // 24 hours from now
                "Risk management"
            );
            
            const restrictions = await compliance.getInvestorRestrictions(trader1.address);
            expect(restrictions.length).to.be.greaterThan(0);
        });
        
        it("Should verify investor eligibility", async function () {
            const allowedEdaiIds = [EDAI_ID];
            await compliance.connect(complianceOfficer).registerInvestor(
                trader1.address,
                true,
                ethers.parseEther("100000"),
                allowedEdaiIds
            );
            await compliance.connect(complianceOfficer).verifyKYC(trader1.address, "KYC-Provider-1");
            await compliance.connect(complianceOfficer).clearAML(trader1.address, "AML-Provider-1");
            
            // Enable trading for this EDAI
            await compliance.connect(complianceOfficer).setEdaiTradingEnabled(EDAI_ID, true);
            
            const isEligible = await compliance.verifyInvestorEligibility(
                trader1.address,
                EDAI_ID,
                ethers.parseEther("1000")
            );
            
            expect(isEligible).to.be.true;
        });
    });
    
    describe("Integration Tests", function () {
        it("Should perform a complete trading workflow", async function () {
            // 1. Start trading session
            await securitiesTrading.connect(complianceOfficer).startTradingSession(EDAI_ID, INITIAL_PRICE);
            
            // 2. Create trading pair
            await securitiesTrading.connect(complianceOfficer).createTradingPair(
                EDAI_ID,
                ethers.parseEther("1"),
                ethers.parseEther("10000"),
                ethers.parseEther("0.01"),
                ethers.parseEther("1"),
                false,
                0
            );
            
            // 3. Register and verify investors
            const allowedEdaiIds = [EDAI_ID];
            await compliance.connect(complianceOfficer).registerInvestor(
                trader1.address,
                true,
                ethers.parseEther("100000"),
                allowedEdaiIds
            );
            await compliance.connect(complianceOfficer).registerInvestor(
                trader2.address,
                true,
                ethers.parseEther("100000"),
                allowedEdaiIds
            );
            await compliance.connect(complianceOfficer).verifyKYC(trader1.address, "KYC-Provider-1");
            await compliance.connect(complianceOfficer).verifyKYC(trader2.address, "KYC-Provider-1");
            await compliance.connect(complianceOfficer).clearAML(trader1.address, "AML-Provider-1");
            await compliance.connect(complianceOfficer).clearAML(trader2.address, "AML-Provider-1");
            
            // 4. Add liquidity
            await liquidityPool.connect(liquidityProvider).createPool(
                EDAI_ID,
                INITIAL_LIQUIDITY,
                STABLECOIN_LIQUIDITY
            );
            
            await securitiesTrading.connect(liquidityProvider).addLiquidity(
                EDAI_ID,
                INITIAL_LIQUIDITY,
                STABLECOIN_LIQUIDITY
            );
            
            // 5. Place orders and execute trade
            const quantity = ethers.parseEther("10");
            const price = ethers.parseEther("100");
            
            await securitiesTrading.connect(trader1).placeBuyOrder(EDAI_ID, quantity, price);
            await securitiesTrading.connect(trader2).placeSellOrder(EDAI_ID, quantity, price);
            
            const buyOrders = await tradingEngine.getTraderOrders(trader1.address);
            const sellOrders = await tradingEngine.getTraderOrders(trader2.address);
            
            await securitiesTrading.connect(trader1).executeTrade(buyOrders[0], sellOrders[0]);
            
            // 6. Verify results
            const tradingInfo = await securitiesTrading.getTradingInfo(EDAI_ID);
            expect(tradingInfo.tradingSession.totalTrades).to.equal(2); // 2 orders placed
            expect(tradingInfo.tradingSession.totalVolume).to.equal(quantity * 2n); // Both buy and sell
            
            const marketDataResult = await securitiesTrading.getMarketData(EDAI_ID);
            expect(marketDataResult.lastPrice).to.equal(price);
        });
    });
}); 