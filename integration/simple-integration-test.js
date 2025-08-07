const { expect } = require('chai');
const { ethers } = require('hardhat');

/**
 * Simple Integration Test for GVMS Dashboard Integration
 * 
 * This test verifies the basic integration functionality without requiring
 * a separate Hardhat node.
 */
describe('Simple GVMS Dashboard Integration', function () {
    let CivicTrustRegistry;
    let registry;
    let owner;
    let dashboardOperator;
    let user1;
    let user2;

    beforeEach(async function () {
        // Get signers
        [owner, dashboardOperator, user1, user2] = await ethers.getSigners();
        
        // Deploy contract
        CivicTrustRegistry = await ethers.getContractFactory("CivicTrustRegistry");
        registry = await CivicTrustRegistry.deploy(dashboardOperator.address);
        await registry.waitForDeployment();
    });

    describe('Contract Integration', function () {
        it('Should allow dashboard operator to update breach assessments', async function () {
            // Register a CEDAI
            await registry.connect(user1).registerCEDAI(
                'TEST-001',
                ethers.zeroPadValue('0x01', 32),
                false,
                0,
                0,
                ''
            );

            // Dashboard operator updates breach assessment
            await registry.connect(dashboardOperator).updateBreachAssessment(
                'TEST-001',
                2, // MODERATE
                3, // PARTIAL_FALLBACK
                'Dashboard assessment: Service level violation'
            );

            // Verify the assessment was applied
            const entry = await registry.getCEDAIEntry('TEST-001');
            expect(entry[4]).to.equal(2); // breachSeverity
            expect(entry[5]).to.equal(3); // enforcementAction
            expect(entry[3]).to.be.true; // breachFlag
        });

        it('Should allow dashboard operator to execute enforcement actions', async function () {
            // Register a CEDAI with breach
            await registry.connect(user1).registerCEDAI(
                'TEST-002',
                ethers.zeroPadValue('0x02', 32),
                true,
                4, // CRITICAL
                5, // TERMINATION
                'Critical breach for testing'
            );

            // Dashboard operator executes enforcement
            await registry.connect(dashboardOperator).executeEnforcementAction('TEST-002');

            // Verify enforcement was applied
            const entry = await registry.getCEDAIEntry('TEST-002');
            expect(entry[10]).to.be.false; // isActive should be false after termination
        });

        it('Should provide breach statistics for dashboard', async function () {
            // Register multiple CEDAIs with different severities
            await registry.connect(user1).registerCEDAI(
                'TEST-003',
                ethers.zeroPadValue('0x03', 32),
                true,
                1, // MINOR
                1, // WARNING
                'Minor breach'
            );

            await registry.connect(user1).registerCEDAI(
                'TEST-004',
                ethers.zeroPadValue('0x04', 32),
                true,
                3, // SEVERE
                4, // FULL_FALLBACK
                'Severe breach'
            );

            // Get breach statistics
            const stats = await registry.getBreachStatistics();
            
            expect(Number(stats.totalBreaches)).to.equal(2);
            expect(Number(stats.minorBreaches)).to.equal(1);
            expect(Number(stats.severeBreaches)).to.equal(1);
            expect(Number(stats.criticalBreaches)).to.equal(0);
        });

        it('Should allow emergency pause from dashboard operator', async function () {
            // Dashboard operator pauses system
            await registry.connect(dashboardOperator).setEmergencyPause(true);
            
            // Verify system is paused
            expect(await registry.paused()).to.be.true;

            // Dashboard operator resumes system
            await registry.connect(dashboardOperator).setEmergencyPause(false);
            
            // Verify system is resumed
            expect(await registry.paused()).to.be.false;
        });

        it('Should handle CEDAI reactivation', async function () {
            // Register and suspend a CEDAI
            await registry.connect(user1).registerCEDAI(
                'TEST-005',
                ethers.zeroPadValue('0x05', 32),
                true,
                2, // MODERATE
                2, // SUSPENSION
                'Suspended CEDAI'
            );

            // Execute suspension
            await registry.connect(dashboardOperator).executeEnforcementAction('TEST-005');
            
            let entry = await registry.getCEDAIEntry('TEST-005');
            expect(entry[10]).to.be.false; // Should be inactive

            // Reactivate
            await registry.connect(dashboardOperator).reactivateCEDAI('TEST-005');
            
            entry = await registry.getCEDAIEntry('TEST-005');
            expect(entry[10]).to.be.true; // Should be active again
        });

        it('Should provide batch operations for dashboard efficiency', async function () {
            // Dashboard operator registers multiple CEDAIs in batch
            const batchData = {
                cedaiIds: ['BATCH-001', 'BATCH-002', 'BATCH-003'],
                zkProofCommitments: [
                    ethers.zeroPadValue('0x01', 32),
                    ethers.zeroPadValue('0x02', 32),
                    ethers.zeroPadValue('0x03', 32)
                ],
                breachFlags: [false, true, false],
                breachSeverities: [0, 2, 0],
                enforcementActions: [0, 3, 0],
                breachDescriptions: ['', 'Batch breach', '']
            };

            await registry.connect(dashboardOperator).batchRegisterCEDAIs(batchData);

            // Verify all CEDAIs were registered
            const entry1 = await registry.getCEDAIEntry('BATCH-001');
            const entry2 = await registry.getCEDAIEntry('BATCH-002');
            const entry3 = await registry.getCEDAIEntry('BATCH-003');

            expect(entry1[0]).to.equal('BATCH-001');
            expect(entry2[0]).to.equal('BATCH-002');
            expect(entry3[0]).to.equal('BATCH-003');
            expect(entry2[3]).to.be.true; // breachFlag
            expect(entry2[4]).to.equal(2); // MODERATE severity
        });

        it('Should retrieve batch CEDAI entries for dashboard display', async function () {
            // Register some CEDAIs first
            await registry.connect(user1).registerCEDAI(
                'BATCH-004',
                ethers.zeroPadValue('0x04', 32),
                false,
                0,
                0,
                ''
            );

            await registry.connect(user1).registerCEDAI(
                'BATCH-005',
                ethers.zeroPadValue('0x05', 32),
                true,
                1,
                1,
                'Test breach'
            );

            // Get batch entries
            const entries = await registry.getBatchCEDAIEntries(['BATCH-004', 'BATCH-005']);
            
            expect(entries.length).to.equal(2);
            expect(entries[0].cedaiId).to.equal('BATCH-004');
            expect(entries[1].cedaiId).to.equal('BATCH-005');
            expect(entries[1].breachFlag).to.be.true;
        });

        it('Should provide issuer-specific CEDAI lists', async function () {
            // Register CEDAIs from different issuers
            await registry.connect(user1).registerCEDAI(
                'USER1-001',
                ethers.zeroPadValue('0x01', 32),
                false,
                0,
                0,
                ''
            );

            await registry.connect(user1).registerCEDAI(
                'USER1-002',
                ethers.zeroPadValue('0x02', 32),
                false,
                0,
                0,
                ''
            );

            await registry.connect(user2).registerCEDAI(
                'USER2-001',
                ethers.zeroPadValue('0x03', 32),
                false,
                0,
                0,
                ''
            );

            // Get CEDAIs for each issuer
            const user1CEDAIs = await registry.getIssuerCEDAIs(user1.address);
            const user2CEDAIs = await registry.getIssuerCEDAIs(user2.address);

            expect(user1CEDAIs.length).to.equal(2);
            expect(user2CEDAIs.length).to.equal(1);
            expect(user1CEDAIs).to.include('USER1-001');
            expect(user1CEDAIs).to.include('USER1-002');
            expect(user2CEDAIs).to.include('USER2-001');
        });

        it('Should calculate entry hashes for verification', async function () {
            // Register a CEDAI
            await registry.connect(user1).registerCEDAI(
                'HASH-001',
                ethers.zeroPadValue('0x01', 32),
                false,
                0,
                0,
                ''
            );

            // Get the entry hash
            const hash = await registry.getCEDAIHash('HASH-001');
            
            expect(hash).to.not.equal(ethers.ZeroHash);
            expect(hash.length).to.equal(66); // 0x + 64 hex characters
        });

        it('Should enforce access control for dashboard operations', async function () {
            // Try to update breach assessment without dashboard operator role
            await expect(
                registry.connect(user1).updateBreachAssessment(
                    'TEST-001',
                    1,
                    1,
                    'Unauthorized update'
                )
            ).to.be.revertedWith('Only dashboard operator');

            // Try to execute enforcement action without dashboard operator role
            await expect(
                registry.connect(user1).executeEnforcementAction('TEST-001')
            ).to.be.revertedWith('Only dashboard operator');

            // Try to pause system without emergency operator role
            await expect(
                registry.connect(user1).setEmergencyPause(true)
            ).to.be.revertedWith('Only emergency operator');
        });

        it('Should handle severity escalation correctly', async function () {
            // Register a CEDAI
            await registry.connect(user1).registerCEDAI(
                'ESCALATE-001',
                ethers.zeroPadValue('0x01', 32),
                false,
                0,
                0,
                ''
            );

            // First assessment: Minor
            await registry.connect(dashboardOperator).updateBreachAssessment(
                'ESCALATE-001',
                1, // MINOR
                1, // WARNING
                'Minor violation'
            );

            let stats = await registry.getBreachStatistics();
            expect(Number(stats.minorBreaches)).to.equal(1);
            expect(Number(stats.totalBreaches)).to.equal(1);

            // Escalate to severe
            await registry.connect(dashboardOperator).updateBreachAssessment(
                'ESCALATE-001',
                3, // SEVERE
                4, // FULL_FALLBACK
                'Escalated to severe breach'
            );

            stats = await registry.getBreachStatistics();
            expect(Number(stats.minorBreaches)).to.equal(0);
            expect(Number(stats.severeBreaches)).to.equal(1);
            expect(Number(stats.totalBreaches)).to.equal(1);
        });
    });

    describe('Dashboard Metrics Integration', function () {
        it('Should provide comprehensive breach statistics', async function () {
            // Register CEDAIs with different severities
            await registry.connect(user1).registerCEDAI(
                'METRIC-001',
                ethers.zeroPadValue('0x01', 32),
                true,
                1, // MINOR
                1, // WARNING
                'Minor breach'
            );

            await registry.connect(user1).registerCEDAI(
                'METRIC-002',
                ethers.zeroPadValue('0x02', 32),
                true,
                2, // MODERATE
                3, // PARTIAL_FALLBACK
                'Moderate breach'
            );

            await registry.connect(user1).registerCEDAI(
                'METRIC-003',
                ethers.zeroPadValue('0x03', 32),
                true,
                4, // CRITICAL
                5, // TERMINATION
                'Critical breach'
            );

            // Execute enforcement actions
            await registry.connect(dashboardOperator).executeEnforcementAction('METRIC-003');

            // Get comprehensive statistics
            const stats = await registry.getBreachStatistics();
            
            expect(Number(stats.totalBreaches)).to.equal(3);
            expect(Number(stats.minorBreaches)).to.equal(1);
            expect(Number(stats.moderateBreaches)).to.equal(1);
            expect(Number(stats.criticalBreaches)).to.equal(1);
            expect(Number(stats.totalEnforcementActions)).to.equal(1);
            expect(Number(stats.lastMetricsUpdate)).to.be.gt(0);
        });

        it('Should track enforcement actions correctly', async function () {
            // Register a CEDAI with breach
            await registry.connect(user1).registerCEDAI(
                'ENFORCE-001',
                ethers.zeroPadValue('0x01', 32),
                true,
                2, // MODERATE
                2, // SUSPENSION
                'Suspension test'
            );

            // Execute enforcement
            await registry.connect(dashboardOperator).executeEnforcementAction('ENFORCE-001');

            // Check enforcement count
            const stats = await registry.getBreachStatistics();
            expect(Number(stats.totalEnforcementActions)).to.equal(1);
        });
    });

    describe('Error Handling and Validation', function () {
        it('Should validate breach assessment data', async function () {
            // Register a CEDAI
            await registry.connect(user1).registerCEDAI(
                'VALIDATE-001',
                ethers.zeroPadValue('0x01', 32),
                false,
                0,
                0,
                ''
            );

            // Try invalid severity
            await expect(
                registry.connect(dashboardOperator).updateBreachAssessment(
                    'VALIDATE-001',
                    10, // Invalid severity
                    1,
                    'Invalid assessment'
                )
            ).to.be.reverted;

            // Try invalid CEDAI ID
            await expect(
                registry.connect(dashboardOperator).updateBreachAssessment(
                    'NONEXISTENT',
                    1,
                    1,
                    'Test'
                )
            ).to.be.revertedWith('CEDAI not found');
        });

        it('Should handle non-existent CEDAI gracefully', async function () {
            const entry = await registry.getCEDAIEntry('NONEXISTENT');
            
            expect(entry[0]).to.equal(''); // cedaiId
            expect(entry[1]).to.equal(ethers.ZeroAddress); // issuer
            expect(entry[3]).to.be.false; // breachFlag
            expect(entry[10]).to.be.false; // isActive
        });
    });
}); 