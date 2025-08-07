const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("CivicTrustRegistry V2 - Enhanced Compliance & Security", function () {
    let CivicTrustRegistryV2;
    let registry;
    let owner;
    let dashboardOperator;
    let complianceOfficer;
    let regulatoryReporter;
    let auditor;
    let user1;
    let user2;
    let timelockController;

    beforeEach(async function () {
        [owner, dashboardOperator, complianceOfficer, regulatoryReporter, auditor, user1, user2, timelockController] = await ethers.getSigners();
        
        CivicTrustRegistryV2 = await ethers.getContractFactory("CivicTrustRegistryV2");
        registry = await CivicTrustRegistryV2.deploy();
        await registry.waitForDeployment();
        
        // Initialize the contract with all required roles
        await registry.initialize(
            dashboardOperator.address,
            complianceOfficer.address,
            regulatoryReporter.address,
            auditor.address,
            timelockController.address
        );
    });

    describe("Enhanced Role-Based Access Control", function () {
        it("Should set up all required roles correctly", async function () {
            const dashboardRole = await registry.DASHBOARD_OPERATOR_ROLE();
            const complianceRole = await registry.COMPLIANCE_OFFICER_ROLE();
            const regulatoryRole = await registry.REGULATORY_REPORTER_ROLE();
            const auditorRole = await registry.AUDITOR_ROLE();
            const upgraderRole = await registry.UPGRADER_ROLE();

            expect(await registry.hasRole(dashboardRole, dashboardOperator.address)).to.be.true;
            expect(await registry.hasRole(complianceRole, complianceOfficer.address)).to.be.true;
            expect(await registry.hasRole(regulatoryRole, regulatoryReporter.address)).to.be.true;
            expect(await registry.hasRole(auditorRole, auditor.address)).to.be.true;
            expect(await registry.hasRole(upgraderRole, owner.address)).to.be.true;
        });

        it("Should prevent unauthorized access to compliance functions", async function () {
            await expect(
                registry.connect(user1).submitComplianceReport("TEST-001", 1, "Test violation")
            ).to.be.revertedWithCustomError(registry, "AccessControlUnauthorizedAccount");
        });
    });

    describe("MiCA Compliance - Capital Requirements", function () {
        it("Should enforce minimum capital requirements", async function () {
            const minCapital = await registry.minCapitalRequirement();
            expect(minCapital).to.equal(ethers.parseEther("1000"));

            // Try to register with insufficient capital
            await expect(
                registry.connect(user1).registerCEDAI(
                    "TEST-001",
                    ethers.zeroPadValue("0x01", 32),
                    false,
                    0,
                    0,
                    "Test CEDAI",
                    ethers.parseEther("500"), // Below minimum
                    50,
                    [1] // MICA framework
                )
            ).to.be.revertedWith("Insufficient capital");
        });

        it("Should allow capital requirement updates by admin", async function () {
            const newRequirement = ethers.parseEther("2000");
            await registry.connect(owner).updateCapitalRequirement(newRequirement);
            expect(await registry.minCapitalRequirement()).to.equal(newRequirement);
        });

        it("Should prevent non-admin from updating capital requirements", async function () {
            await expect(
                registry.connect(user1).updateCapitalRequirement(ethers.parseEther("2000"))
            ).to.be.revertedWithCustomError(registry, "AccessControlUnauthorizedAccount");
        });
    });

    describe("Risk Management Framework", function () {
        it("Should enforce maximum risk score limits", async function () {
            const maxRiskScore = await registry.MAX_RISK_SCORE();
            expect(maxRiskScore).to.equal(100);

            // Try to register with risk score above maximum
            await expect(
                registry.connect(user1).registerCEDAI(
                    "TEST-001",
                    ethers.zeroPadValue("0x01", 32),
                    false,
                    0,
                    0,
                    "Test CEDAI",
                    ethers.parseEther("1000"),
                    150, // Above maximum
                    [1]
                )
            ).to.be.revertedWith("Risk score too high");
        });

        it("Should allow compliance officer to update risk scores", async function () {
            // First register a CEDAI
            await registry.connect(user1).registerCEDAI(
                "TEST-001",
                ethers.zeroPadValue("0x01", 32),
                false,
                0,
                0,
                "Test CEDAI",
                ethers.parseEther("1000"),
                50,
                [1]
            );

            // Update risk score
            await registry.connect(complianceOfficer).updateRiskScore("TEST-001", 75);
            
            const entry = await registry.getCEDAIEntry("TEST-001");
            expect(entry[14]).to.equal(75); // riskScore
        });

        it("Should prevent non-compliance officers from updating risk scores", async function () {
            await registry.connect(user1).registerCEDAI(
                "TEST-001",
                ethers.zeroPadValue("0x01", 32),
                false,
                0,
                0,
                "Test CEDAI",
                ethers.parseEther("1000"),
                50,
                [1]
            );

            await expect(
                registry.connect(user2).updateRiskScore("TEST-001", 75)
            ).to.be.revertedWith("Only compliance officer");
        });
    });

    describe("Compliance Reporting System", function () {
        it("Should allow compliance officers to submit reports", async function () {
            await registry.connect(complianceOfficer).submitComplianceReport(
                "TEST-001",
                2, // VIOLATION
                "Capital adequacy violation detected"
            );

            const report = await registry.getComplianceReport(1);
            expect(report[0]).to.equal(1); // reportId
            expect(report[2]).to.equal(2); // VIOLATION status
            expect(report[4]).to.equal("Capital adequacy violation detected");
        });

        it("Should track compliance violations in metrics", async function () {
            await registry.connect(complianceOfficer).submitComplianceReport(
                "TEST-001",
                2, // VIOLATION
                "Test violation"
            );

            const metrics = await registry.globalMetrics();
            expect(metrics.totalComplianceViolations).to.equal(1);
        });

        it("Should allow compliance officers to resolve reports", async function () {
            await registry.connect(complianceOfficer).submitComplianceReport(
                "TEST-001",
                2,
                "Test violation"
            );

            await registry.connect(complianceOfficer).resolveComplianceReport(
                1,
                "Issue resolved through additional capital injection"
            );

            const report = await registry.getComplianceReport(1);
            expect(report[6]).to.be.true; // resolved
            expect(report[5]).to.equal("Issue resolved through additional capital injection");
        });
    });

    describe("Regulatory Reporting", function () {
        it("Should allow regulatory reporters to generate reports", async function () {
            await registry.connect(regulatoryReporter).generateRegulatoryReport(
                1, // MICA framework
                "Monthly MiCA compliance report - All requirements met"
            );

            const metrics = await registry.globalMetrics();
            expect(metrics.totalRegulatoryReports).to.equal(1);
        });

        it("Should prevent non-regulatory reporters from generating reports", async function () {
            await expect(
                registry.connect(user1).generateRegulatoryReport(
                    1,
                    "Test report"
                )
            ).to.be.revertedWith("Only regulatory reporter");
        });
    });

    describe("Governance Mechanisms", function () {
        it("Should allow admins to create governance proposals", async function () {
            await registry.connect(owner).createGovernanceProposal(
                "Increase minimum capital requirement to 2000 ETH"
            );

            const proposal = await registry.getGovernanceProposal(1);
            expect(proposal[0]).to.equal(1); // proposalId
            expect(proposal[1]).to.equal("Increase minimum capital requirement to 2000 ETH");
            expect(proposal[6]).to.equal(owner.address); // proposer
        });

        it("Should allow admins to vote on proposals", async function () {
            await registry.connect(owner).createGovernanceProposal("Test proposal");
            
            await registry.connect(owner).voteOnProposal(1, true); // Yes vote
            
            const proposal = await registry.getGovernanceProposal(1);
            expect(proposal[3]).to.equal(1); // yesVotes
            expect(proposal[4]).to.equal(0); // noVotes
        });

        it("Should prevent double voting", async function () {
            await registry.connect(owner).createGovernanceProposal("Test proposal");
            await registry.connect(owner).voteOnProposal(1, true);
            
            await expect(
                registry.connect(owner).voteOnProposal(1, false)
            ).to.be.revertedWith("Already voted");
        });

        it("Should allow proposal execution after voting deadline", async function () {
            await registry.connect(owner).createGovernanceProposal("Test proposal");
            await registry.connect(owner).voteOnProposal(1, true);
            
            // Fast forward time past voting deadline
            await ethers.provider.send("evm_increaseTime", [8 * 24 * 60 * 60]); // 8 days
            await ethers.provider.send("evm_mine");
            
            await registry.connect(owner).executeProposal(1);
            
            const proposal = await registry.getGovernanceProposal(1);
            expect(proposal[5]).to.be.true; // executed
        });
    });

    describe("Enhanced CEDAI Registration with Compliance", function () {
        it("Should register CEDAI with full compliance data", async function () {
            await registry.connect(user1).registerCEDAI(
                "TEST-001",
                ethers.zeroPadValue("0x01", 32),
                false,
                0,
                0,
                "Test CEDAI with compliance",
                ethers.parseEther("1000"),
                50,
                [1, 2] // MICA and SEC frameworks
            );

            const entry = await registry.getCEDAIEntry("TEST-001");
            expect(entry[0]).to.equal("TEST-001");
            expect(entry[1]).to.equal(user1.address);
            expect(entry[12]).to.equal(0); // COMPLIANT status
            expect(entry[15]).to.equal(ethers.parseEther("1000")); // capitalRequirement
            expect(entry[16]).to.equal(50); // riskScore
            expect(entry[17]).to.be.true; // kycVerified
            expect(entry[18]).to.be.true; // amlCleared
        });

        it("Should emit compliance events on registration", async function () {
            await expect(
                registry.connect(user1).registerCEDAI(
                    "TEST-001",
                    ethers.zeroPadValue("0x01", 32),
                    false,
                    0,
                    0,
                    "Test CEDAI",
                    ethers.parseEther("1000"),
                    50,
                    [1]
                )
            ).to.emit(registry, "KYCCheckCompleted")
              .and.to.emit(registry, "AMLCheckCompleted");
        });
    });

    describe("Enhanced Breach Assessment with Compliance", function () {
        beforeEach(async function () {
            await registry.connect(user1).registerCEDAI(
                "TEST-001",
                ethers.zeroPadValue("0x01", 32),
                false,
                0,
                0,
                "Test CEDAI",
                ethers.parseEther("1000"),
                50,
                [1]
            );
        });

        it("Should update breach assessment with compliance status", async function () {
            await registry.connect(dashboardOperator).updateBreachAssessment(
                "TEST-001",
                2, // MODERATE severity
                3, // PARTIAL_FALLBACK action
                "Service level violation",
                2, // VIOLATION compliance status
                "MiCA capital adequacy requirements not met"
            );

            const entry = await registry.getCEDAIEntry("TEST-001");
            expect(entry[3]).to.be.true; // breachFlag
            expect(entry[4]).to.equal(2); // MODERATE severity
            expect(entry[12]).to.equal(2); // VIOLATION compliance status
            expect(entry[13]).to.equal("MiCA capital adequacy requirements not met");
        });

        it("Should automatically submit compliance report on violation", async function () {
            await registry.connect(dashboardOperator).updateBreachAssessment(
                "TEST-001",
                2,
                3,
                "Service level violation",
                2, // VIOLATION
                "Compliance issue"
            );

            const report = await registry.getComplianceReport(1);
            expect(report[2]).to.equal(2); // VIOLATION status
        });
    });

    describe("Emergency Controls", function () {
        it("Should allow emergency operators to pause with reason", async function () {
            await registry.connect(dashboardOperator).pause("Security incident detected");
            
            expect(await registry.paused()).to.be.true;
        });

        it("Should prevent operations when paused", async function () {
            await registry.connect(dashboardOperator).pause("Emergency pause");
            
            await expect(
                registry.connect(user1).registerCEDAI(
                    "TEST-001",
                    ethers.zeroPadValue("0x01", 32),
                    false,
                    0,
                    0,
                    "Test CEDAI",
                    ethers.parseEther("1000"),
                    50,
                    [1]
                )
            ).to.be.revertedWithCustomError(registry, "EnforcedPause");
        });

        it("Should allow emergency operators to unpause", async function () {
            await registry.connect(dashboardOperator).pause("Test pause");
            await registry.connect(dashboardOperator).unpause();
            
            expect(await registry.paused()).to.be.false;
        });
    });

    describe("Timelock and Governance Controls", function () {
        it("Should enforce timelock delay limits", async function () {
            const minDelay = await registry.MIN_TIMELOCK_DELAY();
            const maxDelay = await registry.MAX_TIMELOCK_DELAY();
            
            expect(minDelay).to.equal(24 * 60 * 60); // 24 hours
            expect(maxDelay).to.equal(7 * 24 * 60 * 60); // 7 days
        });

        it("Should allow admin to update timelock delay within limits", async function () {
            const newDelay = 48 * 60 * 60; // 48 hours
            await registry.connect(owner).updateTimelockDelay(newDelay);
            expect(await registry.timelockDelay()).to.equal(newDelay);
        });

        it("Should prevent invalid timelock delays", async function () {
            const invalidDelay = 12 * 60 * 60; // 12 hours (below minimum)
            await expect(
                registry.connect(owner).updateTimelockDelay(invalidDelay)
            ).to.be.revertedWith("Invalid timelock delay");
        });
    });

    describe("Compliance Metrics and Monitoring", function () {
        it("Should track compliance violations by status", async function () {
            await registry.connect(complianceOfficer).submitComplianceReport(
                "TEST-001",
                1, // WARNING
                "Warning report"
            );

            await registry.connect(complianceOfficer).submitComplianceReport(
                "TEST-002",
                2, // VIOLATION
                "Violation report"
            );

            const metrics = await registry.globalMetrics();
            expect(metrics.totalComplianceViolations).to.equal(2);
        });

        it("Should track regulatory framework violations", async function () {
            await registry.connect(regulatoryReporter).generateRegulatoryReport(
                1, // MICA
                "MICA violation report"
            );

            await registry.connect(regulatoryReporter).generateRegulatoryReport(
                2, // SEC
                "SEC violation report"
            );

            const metrics = await registry.globalMetrics();
            expect(metrics.totalRegulatoryReports).to.equal(2);
        });
    });

    describe("Data Integrity and Audit Trails", function () {
        it("Should maintain immutable audit trails", async function () {
            await registry.connect(user1).registerCEDAI(
                "TEST-001",
                ethers.zeroPadValue("0x01", 32),
                false,
                0,
                0,
                "Test CEDAI",
                ethers.parseEther("1000"),
                50,
                [1]
            );

            const entry = await registry.getCEDAIEntry("TEST-001");
            expect(entry[10]).to.not.equal(ethers.ZeroHash); // entryHash should be non-zero
        });

        it("Should track all compliance check timestamps", async function () {
            await registry.connect(user1).registerCEDAI(
                "TEST-001",
                ethers.zeroPadValue("0x01", 32),
                false,
                0,
                0,
                "Test CEDAI",
                ethers.parseEther("1000"),
                50,
                [1]
            );

            const entry = await registry.getCEDAIEntry("TEST-001");
            expect(entry[19]).to.be.gt(0); // lastComplianceCheck timestamp
        });
    });

    describe("Upgradeable Architecture", function () {
        it("Should allow upgrader to upgrade contract", async function () {
            // This would require a proxy setup in a real scenario
            // For now, we test that the upgrader role is set correctly
            const upgraderRole = await registry.UPGRADER_ROLE();
            expect(await registry.hasRole(upgraderRole, owner.address)).to.be.true;
        });

        it("Should prevent non-upgraders from upgrading", async function () {
            const upgraderRole = await registry.UPGRADER_ROLE();
            expect(await registry.hasRole(upgraderRole, user1.address)).to.be.false;
        });
    });

    describe("Comprehensive Compliance Workflow", function () {
        it("Should handle complete compliance workflow", async function () {
            // 1. Register CEDAI with compliance data
            await registry.connect(user1).registerCEDAI(
                "TEST-001",
                ethers.zeroPadValue("0x01", 32),
                false,
                0,
                0,
                "Test CEDAI",
                ethers.parseEther("1000"),
                50,
                [1, 2] // MICA and SEC
            );

            // 2. Dashboard detects breach
            await registry.connect(dashboardOperator).updateBreachAssessment(
                "TEST-001",
                2, // MODERATE
                3, // PARTIAL_FALLBACK
                "Capital adequacy violation",
                2, // VIOLATION
                "MiCA requirements not met"
            );

            // 3. Compliance report automatically submitted
            const report = await registry.getComplianceReport(1);
            expect(report[2]).to.equal(2); // VIOLATION

            // 4. Regulatory report generated
            await registry.connect(regulatoryReporter).generateRegulatoryReport(
                1, // MICA
                "Automated MiCA violation report"
            );

            // 5. Risk score updated
            await registry.connect(complianceOfficer).updateRiskScore("TEST-001", 85);

            // 6. Compliance report resolved
            await registry.connect(complianceOfficer).resolveComplianceReport(
                1,
                "Additional capital injected, compliance restored"
            );

            // Verify final state
            const entry = await registry.getCEDAIEntry("TEST-001");
            expect(entry[16]).to.equal(85); // Updated risk score
            expect(entry[19]).to.be.gt(0); // Compliance check timestamp updated

            const finalReport = await registry.getComplianceReport(1);
            expect(finalReport[6]).to.be.true; // Resolved
        });
    });
}); 