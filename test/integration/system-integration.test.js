const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("CTR System Integration", function () {
    let CivicTrustRegistry;
    let EDAIIntegrationHub;
    let EDAIOracle;
    let EDAIZKVerifier;
    let EDAIFallbackEngine;
    let EDAISecuritiesTrading;
    let EDAIIssuance;
    let EDAIToken;
    
    let registry;
    let integrationHub;
    let oracle;
    let zkVerifier;
    let fallbackEngine;
    let trading;
    let issuance;
    let token;
    
    let owner;
    let dashboardOperator;
    let emergencyOperator;
    let user1;
    let user2;
    let user3;

    beforeEach(async function () {
        [owner, dashboardOperator, emergencyOperator, user1, user2, user3] = await ethers.getSigners();
        
        // Deploy all contracts
        CivicTrustRegistry = await ethers.getContractFactory("CivicTrustRegistry");
        EDAIIntegrationHub = await ethers.getContractFactory("EDAIIntegrationHub");
        EDAIOracle = await ethers.getContractFactory("EDAIOracle");
        EDAIZKVerifier = await ethers.getContractFactory("EDAIZKVerifier");
        EDAIFallbackEngine = await ethers.getContractFactory("EDAIFallbackEngine");
        EDAISecuritiesTrading = await ethers.getContractFactory("EDAISecuritiesTrading");
        EDAIIssuance = await ethers.getContractFactory("EDAIIssuance");
        EDAIToken = await ethers.getContractFactory("EDAIToken");

        // Deploy contracts
        registry = await CivicTrustRegistry.deploy(dashboardOperator.address);
        oracle = await EDAIOracle.deploy();
        zkVerifier = await EDAIZKVerifier.deploy();
        fallbackEngine = await EDAIFallbackEngine.deploy();
        trading = await EDAISecuritiesTrading.deploy();
        issuance = await EDAIIssuance.deploy();
        token = await EDAIToken.deploy("EDAI Token", "EDAI");

        // Deploy integration hub
        integrationHub = await EDAIIntegrationHub.deploy(
            registry.address,
            oracle.address,
            zkVerifier.address,
            fallbackEngine.address,
            trading.address,
            issuance.address
        );

        // Grant necessary roles
        await registry.grantRole(await registry.DASHBOARD_OPERATOR_ROLE(), integrationHub.address);
        await oracle.grantRole(await oracle.ORACLE_PROVIDER_ROLE(), integrationHub.address);
        await zkVerifier.grantRole(await zkVerifier.VERIFIER_ROLE(), integrationHub.address);
        await fallbackEngine.grantRole(await fallbackEngine.EXECUTOR_ROLE(), integrationHub.address);
        await trading.grantRole(await trading.TRADER_ROLE(), integrationHub.address);
        await issuance.grantRole(await issuance.ISSUER_ROLE(), integrationHub.address);
    });

    describe("Complete EDAI Lifecycle", function () {
        it("Should handle complete EDAI lifecycle: registration -> trading -> breach -> enforcement", async function () {
            const edaiId = "EDAI-INTEGRATION-001";
            const zkProofCommitment = ethers.zeroPadValue("0x01", 32);
            
            // Step 1: Register EDAI
            await registry.connect(user1).registerCEDAI(
                edaiId,
                zkProofCommitment,
                false,
                0, // NONE
                0, // NONE
                "Initial registration"
            );

            // Verify registration
            const entry = await registry.getCEDAIEntry(edaiId);
            expect(entry[0]).to.equal(edaiId);
            expect(entry[1]).to.equal(user1.address);
            expect(entry[10]).to.be.true; // isActive

            // Step 2: Enable trading for EDAI
            await trading.connect(dashboardOperator).enableTrading(edaiId);
            expect(await trading.edaiTradingEnabled(edaiId)).to.be.true;

            // Step 3: Place trading orders
            await trading.connect(user2).placeBuyOrder(edaiId, ethers.parseEther("100"), ethers.parseEther("1"));
            await trading.connect(user3).placeSellOrder(edaiId, ethers.parseEther("50"), ethers.parseEther("1.1"));

            // Step 4: Simulate breach detection
            await registry.connect(dashboardOperator).updateBreachAssessment(
                edaiId,
                true, // breachFlag
                2, // MODERATE
                3, // PARTIAL_FALLBACK
                "Service level violation detected"
            );

            // Verify breach registration
            const breachEntry = await registry.getCEDAIEntry(edaiId);
            expect(breachEntry[3]).to.be.true; // breachFlag
            expect(breachEntry[4]).to.equal(2); // MODERATE severity

            // Step 5: Execute enforcement action
            await registry.connect(dashboardOperator).executeEnforcementAction(edaiId);

            // Verify enforcement execution
            const enforcementEntry = await registry.getCEDAIEntry(edaiId);
            expect(enforcementEntry[5]).to.equal(3); // PARTIAL_FALLBACK

            // Step 6: Check system metrics
            const metrics = await registry.getBreachStatistics();
            expect(metrics.totalBreaches).to.be.gt(0);
            expect(metrics.moderateBreaches).to.be.gt(0);
        });

        it("Should handle high-volume trading operations", async function () {
            const edaiId = "EDAI-HIGH-VOLUME-001";
            const zkProofCommitment = ethers.zeroPadValue("0x02", 32);
            
            // Register EDAI
            await registry.connect(user1).registerCEDAI(
                edaiId,
                zkProofCommitment,
                false,
                0,
                0,
                "High volume trading test"
            );

            // Enable trading
            await trading.connect(dashboardOperator).enableTrading(edaiId);

            // Place multiple orders rapidly
            const orderPromises = [];
            for (let i = 0; i < 10; i++) {
                orderPromises.push(
                    trading.connect(user2).placeBuyOrder(
                        edaiId,
                        ethers.parseEther("10"),
                        ethers.parseEther("1")
                    )
                );
                orderPromises.push(
                    trading.connect(user3).placeSellOrder(
                        edaiId,
                        ethers.parseEther("10"),
                        ethers.parseEther("1.1")
                    )
                );
            }

            // Execute all orders
            await Promise.all(orderPromises);

            // Verify system handled high volume
            const tradingSession = await trading.tradingSessions(edaiId);
            expect(tradingSession.totalTrades).to.be.gte(20);
        });

        it("Should handle multiple concurrent breaches", async function () {
            const edaiIds = ["EDAI-BREACH-001", "EDAI-BREACH-002", "EDAI-BREACH-003"];
            
            // Register multiple EDAIs
            for (const edaiId of edaiIds) {
                await registry.connect(user1).registerCEDAI(
                    edaiId,
                    ethers.zeroPadValue("0x03", 32),
                    false,
                    0,
                    0,
                    "Concurrent breach test"
                );
            }

            // Simulate concurrent breaches
            const breachPromises = edaiIds.map((edaiId, index) =>
                registry.connect(dashboardOperator).updateBreachAssessment(
                    edaiId,
                    true,
                    index + 1, // Different severities
                    index + 1,
                    `Breach ${index + 1} detected`
                )
            );

            await Promise.all(breachPromises);

            // Verify all breaches were registered
            for (let i = 0; i < edaiIds.length; i++) {
                const entry = await registry.getCEDAIEntry(edaiIds[i]);
                expect(entry[3]).to.be.true; // breachFlag
                expect(entry[4]).to.equal(i + 1); // severity
            }

            // Check global metrics
            const metrics = await registry.getBreachStatistics();
            expect(metrics.totalBreaches).to.equal(edaiIds.length);
        });
    });

    describe("System Health and Monitoring", function () {
        it("Should maintain system health under load", async function () {
            // Register multiple EDAIs
            const edaiCount = 50;
            const registrationPromises = [];

            for (let i = 0; i < edaiCount; i++) {
                registrationPromises.push(
                    registry.connect(user1).registerCEDAI(
                        `EDAI-HEALTH-${i.toString().padStart(3, '0')}`,
                        ethers.zeroPadValue(`0x${i.toString(16)}`, 32),
                        false,
                        0,
                        0,
                        `Health test EDAI ${i}`
                    )
                );
            }

            await Promise.all(registrationPromises);

            // Verify all EDAIs were registered
            for (let i = 0; i < edaiCount; i++) {
                const entry = await registry.getCEDAIEntry(`EDAI-HEALTH-${i.toString().padStart(3, '0')}`);
                expect(entry[0]).to.equal(`EDAI-HEALTH-${i.toString().padStart(3, '0')}`);
                expect(entry[10]).to.be.true; // isActive
            }
        });

        it("Should handle system failures gracefully", async function () {
            const edaiId = "EDAI-FAILURE-001";
            
            // Register EDAI
            await registry.connect(user1).registerCEDAI(
                edaiId,
                ethers.zeroPadValue("0x04", 32),
                false,
                0,
                0,
                "Failure test"
            );

            // Simulate system pause
            await registry.connect(emergencyOperator).setEmergencyPause(true);

            // Verify system is paused
            expect(await registry.paused()).to.be.true;

            // Attempt operations while paused (should fail)
            await expect(
                registry.connect(user1).registerCEDAI(
                    "EDAI-FAILURE-002",
                    ethers.zeroPadValue("0x05", 32),
                    false,
                    0,
                    0,
                    "Should fail"
                )
            ).to.be.revertedWithCustomError(registry, 'EnforcedPause');

            // Resume system
            await registry.connect(emergencyOperator).setEmergencyPause(false);
            expect(await registry.paused()).to.be.false;
        });
    });

    describe("Integration Hub Coordination", function () {
        it("Should coordinate between all system components", async function () {
            const edaiId = "EDAI-INTEGRATION-HUB-001";
            
            // Register EDAI through integration hub
            await integrationHub.connect(user1).registerEDAI(
                edaiId,
                ethers.zeroPadValue("0x06", 32),
                true, // oracleEnabled
                true, // zkEnabled
                true  // fallbackEnabled
            );

            // Verify EDAI is integrated
            expect(await integrationHub.isEDAIIntegrated(edaiId)).to.be.true;

            // Check system status
            const systemStatus = await integrationHub.getSystemStatus();
            expect(systemStatus.registryActive).to.be.true;
            expect(systemStatus.oracleActive).to.be.true;
            expect(systemStatus.zkVerifierActive).to.be.true;
            expect(systemStatus.fallbackActive).to.be.true;
            expect(systemStatus.tradingActive).to.be.true;
            expect(systemStatus.issuanceActive).to.be.true;
        });

        it("Should handle cross-component communication", async function () {
            const edaiId = "EDAI-CROSS-COMPONENT-001";
            
            // Register EDAI
            await registry.connect(user1).registerCEDAI(
                edaiId,
                ethers.zeroPadValue("0x07", 32),
                false,
                0,
                0,
                "Cross-component test"
            );

            // Update oracle data
            await oracle.connect(dashboardOperator).updatePriceFeed(
                `${edaiId}-price`,
                ethers.parseEther("1.5"),
                Math.floor(Date.now() / 1000)
            );

            // Submit ZK proof
            await zkVerifier.connect(user1).submitProof(
                `${edaiId}-proof`,
                edaiId,
                ethers.zeroPadValue("0x07", 32),
                ethers.zeroPadValue("0x08", 32),
                "0x1234567890abcdef"
            );

            // Verify cross-component integration
            const priceFeed = await oracle.priceFeeds(`${edaiId}-price`);
            expect(priceFeed.price).to.equal(ethers.parseEther("1.5"));

            const proof = await zkVerifier.proofs(`${edaiId}-proof`);
            expect(proof.edaiId).to.equal(edaiId);
        });
    });

    describe("Error Handling and Recovery", function () {
        it("Should handle invalid operations gracefully", async function () {
            // Attempt to register duplicate EDAI
            const edaiId = "EDAI-DUPLICATE-001";
            
            await registry.connect(user1).registerCEDAI(
                edaiId,
                ethers.zeroPadValue("0x09", 32),
                false,
                0,
                0,
                "First registration"
            );

            await expect(
                registry.connect(user1).registerCEDAI(
                    edaiId,
                    ethers.zeroPadValue("0x0A", 32),
                    false,
                    0,
                    0,
                    "Duplicate registration"
                )
            ).to.be.revertedWith("Already exists");
        });

        it("Should handle unauthorized access attempts", async function () {
            const edaiId = "EDAI-UNAUTHORIZED-001";
            
            // Register EDAI
            await registry.connect(user1).registerCEDAI(
                edaiId,
                ethers.zeroPadValue("0x0B", 32),
                false,
                0,
                0,
                "Unauthorized test"
            );

            // Attempt unauthorized breach update
            await expect(
                registry.connect(user2).updateBreachAssessment(
                    edaiId,
                    true,
                    1,
                    1,
                    "Unauthorized breach"
                )
            ).to.be.revertedWithCustomError(registry, 'AccessControlUnauthorizedAccount');
        });

        it("Should handle invalid parameters", async function () {
            // Attempt to register with invalid parameters
            await expect(
                registry.connect(user1).registerCEDAI(
                    "", // Empty EDAI ID
                    ethers.zeroPadValue("0x0C", 32),
                    false,
                    0,
                    0,
                    "Invalid parameters"
                )
            ).to.be.revertedWith("Invalid EDAI ID");
        });
    });

    describe("Performance and Scalability", function () {
        it("Should handle batch operations efficiently", async function () {
            const batchSize = 10;
            const edaiIds = [];
            const zkProofCommitments = [];
            const breachFlags = [];
            const breachSeverities = [];
            const enforcementActions = [];
            const breachDescriptions = [];

            for (let i = 0; i < batchSize; i++) {
                edaiIds.push(`EDAI-BATCH-${i.toString().padStart(3, '0')}`);
                zkProofCommitments.push(ethers.zeroPadValue(`0x${i.toString(16)}`, 32));
                breachFlags.push(false);
                breachSeverities.push(0);
                enforcementActions.push(0);
                breachDescriptions.push(`Batch EDAI ${i}`);
            }

            // Execute batch registration
            await registry.connect(dashboardOperator).batchRegisterCEDAI(
                edaiIds,
                zkProofCommitments,
                breachFlags,
                breachSeverities,
                enforcementActions,
                breachDescriptions
            );

            // Verify all EDAIs were registered
            for (const edaiId of edaiIds) {
                const entry = await registry.getCEDAIEntry(edaiId);
                expect(entry[0]).to.equal(edaiId);
                expect(entry[10]).to.be.true; // isActive
            }
        });

        it("Should maintain performance under stress", async function () {
            const stressTestCount = 100;
            const startTime = Date.now();

            // Perform stress test operations
            for (let i = 0; i < stressTestCount; i++) {
                await registry.connect(user1).registerCEDAI(
                    `EDAI-STRESS-${i.toString().padStart(3, '0')}`,
                    ethers.zeroPadValue(`0x${i.toString(16)}`, 32),
                    false,
                    0,
                    0,
                    `Stress test ${i}`
                );
            }

            const endTime = Date.now();
            const duration = endTime - startTime;
            const avgTimePerOperation = duration / stressTestCount;

            // Verify performance requirements (adjust thresholds as needed)
            expect(avgTimePerOperation).to.be.lt(1000); // Less than 1 second per operation
            expect(duration).to.be.lt(120000); // Less than 2 minutes total
        });
    });
});
