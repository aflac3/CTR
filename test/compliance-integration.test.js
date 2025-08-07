const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Compliance Integration Test - Enhanced Dashboard Integration", function () {
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
        
        await registry.initialize(
            dashboardOperator.address,
            complianceOfficer.address,
            regulatoryReporter.address,
            auditor.address,
            timelockController.address
        );
    });

    describe("Dashboard Compliance Monitoring Integration", function () {
        it("Should provide comprehensive compliance metrics for dashboard", async function () {
            // Register multiple CEDAIs with different compliance statuses
            await registry.connect(user1).registerCEDAI(
                "COMPLIANT-001",
                ethers.zeroPadValue("0x01", 32),
                false,
                0,
                0,
                "Compliant CEDAI",
                ethers.parseEther("2000"),
                30,
                [1, 2] // MICA and SEC
            );

            await registry.connect(user2).registerCEDAI(
                "VIOLATION-001",
                ethers.zeroPadValue("0x02", 32),
                true,
                2,
                3,
                "Violation CEDAI",
                ethers.parseEther("1000"),
                85,
                [1]
            );

            // Submit compliance reports
            await registry.connect(complianceOfficer).submitComplianceReport(
                "VIOLATION-001",
                2, // VIOLATION
                "Capital adequacy violation"
            );

            // Generate regulatory reports
            await registry.connect(regulatoryReporter).generateRegulatoryReport(
                1, // MICA
                "Monthly MiCA compliance report"
            );

            // Dashboard can now query comprehensive metrics
            const metrics = await registry.globalMetrics();
            expect(metrics.totalComplianceViolations).to.equal(1);
            expect(metrics.totalRegulatoryReports).to.equal(1);
        });

        it("Should provide real-time compliance status updates", async function () {
            // Register CEDAI
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

            // Dashboard detects compliance issue
            await registry.connect(dashboardOperator).updateBreachAssessment(
                "TEST-001",
                2, // MODERATE
                3, // PARTIAL_FALLBACK
                "Compliance violation detected",
                2, // VIOLATION
                "MiCA requirements not met"
            );

            // Dashboard can immediately query updated status
            const entry = await registry.getCEDAIEntry("TEST-001");
            expect(entry[12]).to.equal(2); // VIOLATION status
            expect(entry[13]).to.equal("MiCA requirements not met");
        });

        it("Should provide compliance report tracking for dashboard", async function () {
            // Submit multiple compliance reports
            await registry.connect(complianceOfficer).submitComplianceReport(
                "CEDAI-001",
                1, // WARNING
                "Minor compliance warning"
            );

            await registry.connect(complianceOfficer).submitComplianceReport(
                "CEDAI-002",
                2, // VIOLATION
                "Serious compliance violation"
            );

            // Dashboard can query all reports
            const report1 = await registry.getComplianceReport(1);
            const report2 = await registry.getComplianceReport(2);

            expect(report1[2]).to.equal(1); // WARNING
            expect(report2[2]).to.equal(2); // VIOLATION
            expect(report1[6]).to.be.false; // Not resolved
            expect(report2[6]).to.be.false; // Not resolved

            // Resolve one report
            await registry.connect(complianceOfficer).resolveComplianceReport(
                1,
                "Warning addressed"
            );

            const resolvedReport = await registry.getComplianceReport(1);
            expect(resolvedReport[6]).to.be.true; // Resolved
        });
    });

    describe("Regulatory Framework Integration", function () {
        it("Should track multiple regulatory frameworks", async function () {
            // Register CEDAI with multiple frameworks
            await registry.connect(user1).registerCEDAI(
                "MULTI-001",
                ethers.zeroPadValue("0x01", 32),
                false,
                0,
                0,
                "Multi-framework CEDAI",
                ethers.parseEther("1000"),
                50,
                [1, 2, 3] // MICA, SEC, GDPR
            );

            // Generate reports for different frameworks
            await registry.connect(regulatoryReporter).generateRegulatoryReport(
                1, // MICA
                "MiCA compliance report"
            );

            await registry.connect(regulatoryReporter).generateRegulatoryReport(
                2, // SEC
                "SEC compliance report"
            );

            await registry.connect(regulatoryReporter).generateRegulatoryReport(
                3, // GDPR
                "GDPR compliance report"
            );

            const metrics = await registry.globalMetrics();
            expect(metrics.totalRegulatoryReports).to.equal(3);
        });

        it("Should provide framework-specific violation tracking", async function () {
            // Submit compliance reports for different frameworks
            await registry.connect(complianceOfficer).submitComplianceReport(
                "MICA-VIOLATION",
                2, // VIOLATION
                "MiCA capital adequacy violation"
            );

            await registry.connect(complianceOfficer).submitComplianceReport(
                "SEC-VIOLATION",
                2, // VIOLATION
                "SEC disclosure violation"
            );

            const metrics = await registry.globalMetrics();
            expect(metrics.totalComplianceViolations).to.equal(2);
        });
    });

    describe("Risk Management Dashboard Integration", function () {
        it("Should provide risk score monitoring for dashboard", async function () {
            // Register CEDAI with initial risk score
            await registry.connect(user1).registerCEDAI(
                "RISK-001",
                ethers.zeroPadValue("0x01", 32),
                false,
                0,
                0,
                "Risk monitored CEDAI",
                ethers.parseEther("1000"),
                40,
                [1]
            );

            // Dashboard can monitor risk score changes
            let entry = await registry.getCEDAIEntry("RISK-001");
            expect(entry[16]).to.equal(40); // Initial risk score

            // Compliance officer updates risk score
            await registry.connect(complianceOfficer).updateRiskScore("RISK-001", 75);

            entry = await registry.getCEDAIEntry("RISK-001");
            expect(entry[16]).to.equal(75); // Updated risk score
            expect(entry[19]).to.be.gt(0); // Compliance check timestamp updated
        });

        it("Should enforce risk score limits", async function () {
            // Try to register with risk score above maximum
            await expect(
                registry.connect(user1).registerCEDAI(
                    "HIGH-RISK-001",
                    ethers.zeroPadValue("0x01", 32),
                    false,
                    0,
                    0,
                    "High risk CEDAI",
                    ethers.parseEther("1000"),
                    150, // Above maximum
                    [1]
                )
            ).to.be.revertedWith("Risk score too high");
        });
    });

    describe("Capital Requirements Dashboard Integration", function () {
        it("Should provide capital requirement monitoring", async function () {
            const initialRequirement = await registry.minCapitalRequirement();
            expect(initialRequirement).to.equal(ethers.parseEther("1000"));

            // Dashboard can monitor capital requirement changes
            await registry.connect(owner).updateCapitalRequirement(ethers.parseEther("2000"));

            const newRequirement = await registry.minCapitalRequirement();
            expect(newRequirement).to.equal(ethers.parseEther("2000"));
        });

        it("Should enforce capital requirements on registration", async function () {
            // Try to register with insufficient capital
            await expect(
                registry.connect(user1).registerCEDAI(
                    "LOW-CAPITAL-001",
                    ethers.zeroPadValue("0x01", 32),
                    false,
                    0,
                    0,
                    "Low capital CEDAI",
                    ethers.parseEther("500"), // Below minimum
                    50,
                    [1]
                )
            ).to.be.revertedWith("Insufficient capital");
        });
    });

    describe("Governance Dashboard Integration", function () {
        it("Should provide governance proposal tracking", async function () {
            // Create governance proposal
            await registry.connect(owner).createGovernanceProposal(
                "Increase capital requirements"
            );

            // Dashboard can query proposal details
            const proposal = await registry.getGovernanceProposal(1);
            expect(proposal[1]).to.equal("Increase capital requirements");
            expect(proposal[6]).to.equal(owner.address); // Proposer
            expect(proposal[5]).to.be.false; // Not executed

            // Vote on proposal
            await registry.connect(owner).voteOnProposal(1, true);

            const updatedProposal = await registry.getGovernanceProposal(1);
            expect(updatedProposal[3]).to.equal(1); // Yes votes
            expect(updatedProposal[4]).to.equal(0); // No votes
        });

        it("Should provide governance timeline tracking", async function () {
            await registry.connect(owner).createGovernanceProposal("Test proposal");

            const proposal = await registry.getGovernanceProposal(1);
            const votingDeadline = proposal[2];
            const currentTime = Math.floor(Date.now() / 1000);

            expect(votingDeadline).to.be.gt(currentTime);
            expect(votingDeadline - currentTime).to.be.closeTo(7 * 24 * 60 * 60, 60); // 7 days ± 1 minute
        });
    });

    describe("Emergency Controls Dashboard Integration", function () {
        it("Should provide emergency pause monitoring", async function () {
            // Dashboard can monitor pause status
            expect(await registry.paused()).to.be.false;

            // Emergency pause
            await registry.connect(dashboardOperator).pause("Security incident");

            expect(await registry.paused()).to.be.true;

            // Unpause
            await registry.connect(dashboardOperator).unpause();

            expect(await registry.paused()).to.be.false;
        });

        it("Should prevent operations during emergency pause", async function () {
            await registry.connect(dashboardOperator).pause("Emergency");

            // Try to register during pause
            await expect(
                registry.connect(user1).registerCEDAI(
                    "PAUSED-001",
                    ethers.zeroPadValue("0x01", 32),
                    false,
                    0,
                    0,
                    "Paused CEDAI",
                    ethers.parseEther("1000"),
                    50,
                    [1]
                )
            ).to.be.revertedWithCustomError(registry, "EnforcedPause");
        });
    });

    describe("Comprehensive Dashboard Metrics", function () {
        it("Should provide all metrics needed for dashboard", async function () {
            // Set up comprehensive test scenario
            await registry.connect(user1).registerCEDAI(
                "COMPLIANT-001",
                ethers.zeroPadValue("0x01", 32),
                false,
                0,
                0,
                "Compliant CEDAI",
                ethers.parseEther("2000"),
                30,
                [1, 2]
            );

            await registry.connect(user2).registerCEDAI(
                "VIOLATION-001",
                ethers.zeroPadValue("0x02", 32),
                true,
                2,
                3,
                "Violation CEDAI",
                ethers.parseEther("1000"),
                85,
                [1]
            );

            // Submit compliance reports
            await registry.connect(complianceOfficer).submitComplianceReport(
                "VIOLATION-001",
                2,
                "Capital adequacy violation"
            );

            // Generate regulatory reports
            await registry.connect(regulatoryReporter).generateRegulatoryReport(
                1,
                "MiCA compliance report"
            );

            // Create governance proposal
            await registry.connect(owner).createGovernanceProposal(
                "Test governance proposal"
            );

            // Dashboard can now query comprehensive metrics
            const metrics = await registry.globalMetrics();
            
            // Verify all metrics are available
            expect(metrics.totalComplianceViolations).to.equal(1);
            expect(metrics.totalRegulatoryReports).to.equal(1);
            expect(metrics.lastMetricsUpdate).to.be.gt(0);

            // Verify governance state
            const proposal = await registry.getGovernanceProposal(1);
            expect(proposal[0]).to.equal(1); // Proposal exists

            // Verify compliance state
            const compliantEntry = await registry.getCEDAIEntry("COMPLIANT-001");
            const violationEntry = await registry.getCEDAIEntry("VIOLATION-001");
            
            expect(compliantEntry[12]).to.equal(0); // COMPLIANT
            expect(violationEntry[12]).to.equal(2); // VIOLATION
        });
    });

    describe("Real-time Event Monitoring", function () {
        it("Should emit all necessary events for dashboard monitoring", async function () {
            // Test CEDAI registration events
            await expect(
                registry.connect(user1).registerCEDAI(
                    "EVENT-001",
                    ethers.zeroPadValue("0x01", 32),
                    false,
                    0,
                    0,
                    "Event test CEDAI",
                    ethers.parseEther("1000"),
                    50,
                    [1]
                )
            ).to.emit(registry, "KYCCheckCompleted")
              .and.to.emit(registry, "AMLCheckCompleted");

            // Test compliance report events
            await expect(
                registry.connect(complianceOfficer).submitComplianceReport(
                    "EVENT-001",
                    2,
                    "Test violation"
                )
            ).to.emit(registry, "ComplianceReportSubmitted");

            // Test regulatory report events
            await expect(
                registry.connect(regulatoryReporter).generateRegulatoryReport(
                    1,
                    "Test regulatory report"
                )
            ).to.emit(registry, "RegulatoryReportGenerated");

            // Test governance events
            await expect(
                registry.connect(owner).createGovernanceProposal(
                    "Test governance proposal"
                )
            ).to.emit(registry, "GovernanceProposalCreated");

            // Test emergency events
            await expect(
                registry.connect(dashboardOperator).pause("Test emergency")
            ).to.emit(registry, "EmergencyPaused");
        });
    });
}); 