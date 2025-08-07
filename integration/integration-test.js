const { expect } = require('chai');
const { ethers } = require('hardhat');
const GVMSDashboardAdapter = require('./gvms-dashboard-adapter');

/**
 * Integration Test Suite for GVMS Dashboard Integration
 * 
 * This test suite verifies the complete integration between the GVMS dashboard
 * and the CivicTrustRegistry smart contract.
 */
describe('GVMS Dashboard Integration', function () {
    let CivicTrustRegistry;
    let registry;
    let owner;
    let dashboardOperator;
    let user1;
    let user2;
    let adapter;
    let dashboardOperatorPrivateKey;

    beforeEach(async function () {
        // Get signers
        [owner, dashboardOperator, user1, user2] = await ethers.getSigners();
        
        // Deploy contract
        CivicTrustRegistry = await ethers.getContractFactory("CivicTrustRegistry");
        registry = await CivicTrustRegistry.deploy(dashboardOperator.address);
        await registry.waitForDeployment();
        
        // Get dashboard operator private key for testing
        dashboardOperatorPrivateKey = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80'; // Hardhat default
        
        // Initialize adapter
        adapter = new GVMSDashboardAdapter({
            contractAddress: await registry.getAddress(),
            rpcUrl: 'http://127.0.0.1:8545',
            dashboardOperatorPrivateKey: dashboardOperatorPrivateKey,
            monitoringEnabled: false, // Disable monitoring for tests
            alertWebhookUrl: 'https://hooks.slack.com/services/test/webhook'
        });
        
        await adapter.initialize();
    });

    afterEach(async function () {
        if (adapter) {
            await adapter.cleanup();
        }
    });

    describe('Dashboard Adapter Initialization', function () {
        it('Should initialize adapter successfully', async function () {
            expect(adapter.isInitialized).to.be.true;
            expect(adapter.contract).to.not.be.null;
            expect(adapter.provider).to.not.be.null;
        });

        it('Should connect to the correct contract', async function () {
            const contractAddress = await registry.getAddress();
            expect(adapter.config.contractAddress).to.equal(contractAddress);
        });

        it('Should have correct dashboard operator permissions', async function () {
            const hasRole = await registry.hasRole(await registry.DASHBOARD_OPERATOR_ROLE(), dashboardOperator.address);
            expect(hasRole).to.be.true;
        });
    });

    describe('Dashboard Metrics Integration', function () {
        it('Should get real-time dashboard metrics', async function () {
            const metrics = await adapter.getDashboardMetrics();
            
            expect(metrics).to.have.property('realTime');
            expect(metrics).to.have.property('breachStatistics');
            expect(metrics).to.have.property('systemStatus');
            
            expect(metrics.realTime).to.have.property('totalBreaches');
            expect(metrics.realTime).to.have.property('systemHealth');
            expect(metrics.breachStatistics).to.have.property('totalBreaches');
            expect(metrics.systemStatus).to.have.property('isPaused');
        });

        it('Should calculate system health correctly', async function () {
            const metrics = await adapter.getDashboardMetrics();
            
            // Initially should be healthy
            expect(metrics.realTime.systemHealth).to.equal('healthy');
            
            // Register a CEDAI with breach
            await registry.connect(user1).registerCEDAI(
                'TEST-001',
                ethers.zeroPadValue('0x01', 32),
                true,
                4, // CRITICAL
                5, // TERMINATION
                'Critical breach for testing'
            );
            
            // Get updated metrics
            const updatedMetrics = await adapter.getDashboardMetrics();
            expect(updatedMetrics.realTime.systemHealth).to.equal('critical');
        });

        it('Should cache metrics for performance', async function () {
            const startTime = Date.now();
            const metrics1 = await adapter.getDashboardMetrics();
            const time1 = Date.now() - startTime;
            
            const startTime2 = Date.now();
            const metrics2 = await adapter.getDashboardMetrics();
            const time2 = Date.now() - startTime2;
            
            // Second call should be faster due to caching
            expect(time2).to.be.lessThan(time1);
            expect(metrics1).to.deep.equal(metrics2);
        });
    });

    describe('Breach Assessment Integration', function () {
        beforeEach(async function () {
            // Register a CEDAI for testing
            await registry.connect(user1).registerCEDAI(
                'ASSESSMENT-001',
                ethers.zeroPadValue('0x01', 32),
                false,
                0,
                0,
                ''
            );
        });

        it('Should submit breach assessment from dashboard', async function () {
            const assessment = {
                severity: 2, // MODERATE
                enforcementAction: 3, // PARTIAL_FALLBACK
                description: 'Dashboard assessment: Service level violation detected'
            };
            
            const result = await adapter.submitBreachAssessment('ASSESSMENT-001', assessment);
            
            expect(result.success).to.be.true;
            expect(result.txHash).to.be.a('string');
            expect(result.gasUsed).to.be.a('string');
            
            // Verify the assessment was applied
            const cedaiInfo = await adapter.getCEDAIInfo('ASSESSMENT-001');
            expect(cedaiInfo.breachSeverity).to.equal(2);
            expect(cedaiInfo.enforcementAction).to.equal(3);
            expect(cedaiInfo.breachFlag).to.be.true;
        });

        it('Should handle severity escalation', async function () {
            // First assessment: Minor
            await adapter.submitBreachAssessment('ASSESSMENT-001', {
                severity: 1,
                enforcementAction: 1,
                description: 'Minor violation'
            });
            
            // Escalate to severe
            const result = await adapter.submitBreachAssessment('ASSESSMENT-001', {
                severity: 3,
                enforcementAction: 4,
                description: 'Escalated to severe breach'
            });
            
            expect(result.success).to.be.true;
            
            const cedaiInfo = await adapter.getCEDAIInfo('ASSESSMENT-001');
            expect(cedaiInfo.breachSeverity).to.equal(3);
            expect(cedaiInfo.enforcementAction).to.equal(4);
        });

        it('Should validate assessment data', async function () {
            const invalidAssessment = {
                severity: 10, // Invalid severity
                enforcementAction: 1,
                description: 'Invalid assessment'
            };
            
            await expect(
                adapter.submitBreachAssessment('ASSESSMENT-001', invalidAssessment)
            ).to.be.reverted;
        });
    });

    describe('Enforcement Action Integration', function () {
        beforeEach(async function () {
            // Register a CEDAI with breach for testing
            await registry.connect(user1).registerCEDAI(
                'ENFORCE-001',
                ethers.zeroPadValue('0x01', 32),
                true,
                4, // CRITICAL
                5, // TERMINATION
                'Critical breach for enforcement testing'
            );
        });

        it('Should execute enforcement action from dashboard', async function () {
            const result = await adapter.executeEnforcementAction('ENFORCE-001');
            
            expect(result.success).to.be.true;
            expect(result.txHash).to.be.a('string');
            expect(result.gasUsed).to.be.a('string');
            
            // Verify enforcement was applied
            const cedaiInfo = await adapter.getCEDAIInfo('ENFORCE-001');
            expect(cedaiInfo.isActive).to.be.false; // Should be terminated
        });

        it('Should handle suspension and reactivation', async function () {
            // Update to suspension
            await adapter.submitBreachAssessment('ENFORCE-001', {
                severity: 2,
                enforcementAction: 2, // SUSPENSION
                description: 'Suspension test'
            });
            
            // Execute suspension
            await adapter.executeEnforcementAction('ENFORCE-001');
            
            let cedaiInfo = await adapter.getCEDAIInfo('ENFORCE-001');
            expect(cedaiInfo.isActive).to.be.false;
            
            // Reactivate
            const reactivateTx = await registry.connect(dashboardOperator).reactivateCEDAI('ENFORCE-001');
            await reactivateTx.wait();
            
            cedaiInfo = await adapter.getCEDAIInfo('ENFORCE-001');
            expect(cedaiInfo.isActive).to.be.true;
        });
    });

    describe('Emergency Controls Integration', function () {
        it('Should handle emergency pause from dashboard', async function () {
            const result = await adapter.emergencyPause(true);
            
            expect(result.success).to.be.true;
            expect(result.txHash).to.be.a('string');
            
            // Verify system is paused
            const metrics = await adapter.getDashboardMetrics();
            expect(metrics.systemStatus.isPaused).to.be.true;
            expect(metrics.realTime.systemHealth).to.equal('critical');
        });

        it('Should handle emergency resume from dashboard', async function () {
            // First pause
            await adapter.emergencyPause(true);
            
            // Then resume
            const result = await adapter.emergencyPause(false);
            
            expect(result.success).to.be.true;
            
            // Verify system is resumed
            const metrics = await adapter.getDashboardMetrics();
            expect(metrics.systemStatus.isPaused).to.be.false;
        });
    });

    describe('Event Monitoring Integration', function () {
        it('Should monitor CEDAI registration events', function (done) {
            adapter.on('cedaiRegistered', (event) => {
                expect(event.cedaiId).to.equal('EVENT-001');
                expect(event.breachFlag).to.be.true;
                expect(event.breachSeverity).to.equal(3);
                done();
            });
            
            // Trigger event
            registry.connect(user1).registerCEDAI(
                'EVENT-001',
                ethers.zeroPadValue('0x01', 32),
                true,
                3, // SEVERE
                4, // FULL_FALLBACK
                'Event monitoring test'
            );
        });

        it('Should monitor breach update events', function (done) {
            // First register a CEDAI
            registry.connect(user1).registerCEDAI(
                'EVENT-002',
                ethers.zeroPadValue('0x01', 32),
                false,
                0,
                0,
                ''
            ).then(() => {
                adapter.on('breachUpdated', (event) => {
                    expect(event.cedaiId).to.equal('EVENT-002');
                    expect(event.oldSeverity).to.equal(0);
                    expect(event.newSeverity).to.equal(2);
                    done();
                });
                
                // Trigger breach update
                adapter.submitBreachAssessment('EVENT-002', {
                    severity: 2,
                    enforcementAction: 3,
                    description: 'Breach update test'
                });
            });
        });

        it('Should monitor enforcement action events', function (done) {
            // First register a CEDAI with breach
            registry.connect(user1).registerCEDAI(
                'EVENT-003',
                ethers.zeroPadValue('0x01', 32),
                true,
                4, // CRITICAL
                5, // TERMINATION
                'Enforcement test'
            ).then(() => {
                adapter.on('enforcementActionExecuted', (event) => {
                    expect(event.cedaiId).to.equal('EVENT-003');
                    expect(event.action).to.equal(5);
                    done();
                });
                
                // Trigger enforcement
                adapter.executeEnforcementAction('EVENT-003');
            });
        });
    });

    describe('CEDAI Information Retrieval', function () {
        beforeEach(async function () {
            await registry.connect(user1).registerCEDAI(
                'INFO-001',
                ethers.zeroPadValue('0x01', 32),
                true,
                2, // MODERATE
                3, // PARTIAL_FALLBACK
                'Information retrieval test'
            );
        });

        it('Should get complete CEDAI information', async function () {
            const cedaiInfo = await adapter.getCEDAIInfo('INFO-001');
            
            expect(cedaiInfo.cedaiId).to.equal('INFO-001');
            expect(cedaiInfo.issuer).to.equal(user1.address);
            expect(cedaiInfo.breachFlag).to.be.true;
            expect(cedaiInfo.breachSeverity).to.equal(2);
            expect(cedaiInfo.enforcementAction).to.equal(3);
            expect(cedaiInfo.isActive).to.be.true;
            expect(cedaiInfo.severityName).to.equal('MODERATE');
            expect(cedaiInfo.actionName).to.equal('PARTIAL_FALLBACK');
        });

        it('Should handle non-existent CEDAI gracefully', async function () {
            const cedaiInfo = await adapter.getCEDAIInfo('NONEXISTENT');
            
            expect(cedaiInfo.cedaiId).to.equal('');
            expect(cedaiInfo.issuer).to.equal(ethers.ZeroAddress);
            expect(cedaiInfo.breachFlag).to.be.false;
            expect(cedaiInfo.isActive).to.be.false;
        });
    });

    describe('Error Handling and Validation', function () {
        it('Should handle network errors gracefully', async function () {
            // Create adapter with invalid RPC URL
            const invalidAdapter = new GVMSDashboardAdapter({
                contractAddress: await registry.getAddress(),
                rpcUrl: 'http://invalid-url:8545',
                dashboardOperatorPrivateKey: dashboardOperatorPrivateKey
            });
            
            await expect(invalidAdapter.initialize()).to.be.rejected;
        });

        it('Should handle invalid contract address', async function () {
            const invalidAdapter = new GVMSDashboardAdapter({
                contractAddress: '0x0000000000000000000000000000000000000000',
                rpcUrl: 'http://127.0.0.1:8545',
                dashboardOperatorPrivateKey: dashboardOperatorPrivateKey
            });
            
            await expect(invalidAdapter.initialize()).to.be.rejected;
        });

        it('Should handle unauthorized operations', async function () {
            // Try to submit assessment for non-existent CEDAI
            await expect(
                adapter.submitBreachAssessment('NONEXISTENT', {
                    severity: 1,
                    enforcementAction: 1,
                    description: 'Test'
                })
            ).to.be.rejected;
        });
    });

    describe('Performance and Scalability', function () {
        it('Should handle multiple concurrent operations', async function () {
            const operations = [];
            
            // Register multiple CEDAIs
            for (let i = 0; i < 5; i++) {
                operations.push(
                    registry.connect(user1).registerCEDAI(
                        `PERF-${i}`,
                        ethers.zeroPadValue(`0x0${i}`, 32),
                        i % 2 === 0, // Alternate breach flags
                        i % 4, // Different severities
                        i % 5, // Different actions
                        `Performance test ${i}`
                    )
                );
            }
            
            await Promise.all(operations);
            
            // Get metrics
            const metrics = await adapter.getDashboardMetrics();
            expect(metrics.breachStatistics.totalBreaches).to.be.greaterThan(0);
        });

        it('Should maintain performance under load', async function () {
            const startTime = Date.now();
            
            // Perform multiple operations
            for (let i = 0; i < 10; i++) {
                await adapter.getDashboardMetrics();
            }
            
            const endTime = Date.now();
            const totalTime = endTime - startTime;
            
            // Should complete within reasonable time (5 seconds)
            expect(totalTime).to.be.lessThan(5000);
        });
    });
}); 