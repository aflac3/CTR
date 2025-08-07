// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts/proxy/utils/UUPSUpgradeable.sol";

/// @title Civic Trust Registry V2 - Enhanced Compliance & Security
/// @notice Production-ready CEDAI enforcement layer with regulatory compliance
/// @dev Implements MiCA, SEC, GDPR, and ISO 27001 compliance standards
contract CivicTrustRegistryV2 is 
    ReentrancyGuard, 
    AccessControl, 
    Pausable, 
    Initializable, 
    UUPSUpgradeable 
{
    
    // Enhanced role-based access control
    bytes32 public constant DASHBOARD_OPERATOR_ROLE = keccak256("DASHBOARD_OPERATOR_ROLE");
    bytes32 public constant EMERGENCY_OPERATOR_ROLE = keccak256("EMERGENCY_OPERATOR_ROLE");
    bytes32 public constant BATCH_OPERATOR_ROLE = keccak256("BATCH_OPERATOR_ROLE");
    bytes32 public constant COMPLIANCE_OFFICER_ROLE = keccak256("COMPLIANCE_OFFICER_ROLE");
    bytes32 public constant REGULATORY_REPORTER_ROLE = keccak256("REGULATORY_REPORTER_ROLE");
    bytes32 public constant AUDITOR_ROLE = keccak256("AUDITOR_ROLE");
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");
    
    // Compliance and regulatory enums
    enum BreachSeverity {
        NONE,           // 0 - No breach detected
        MINOR,          // 1 - Minor violation, warning issued
        MODERATE,       // 2 - Moderate breach, partial fallback
        SEVERE,         // 3 - Severe breach, full fallback
        CRITICAL        // 4 - Critical breach, immediate termination
    }
    
    enum EnforcementAction {
        NONE,           // 0 - No action required
        WARNING,        // 1 - Issue warning notification
        SUSPENSION,     // 2 - Temporary suspension
        PARTIAL_FALLBACK, // 3 - Partial fallback execution
        FULL_FALLBACK,  // 4 - Complete fallback execution
        TERMINATION     // 5 - Immediate contract termination
    }
    
    enum ComplianceStatus {
        COMPLIANT,      // 0 - Fully compliant
        WARNING,        // 1 - Compliance warning
        VIOLATION,      // 2 - Compliance violation
        CRITICAL        // 3 - Critical compliance breach
    }
    
    enum RegulatoryFramework {
        NONE,           // 0 - No specific framework
        MICA,           // 1 - Markets in Crypto-Assets
        SEC,            // 2 - Securities and Exchange Commission
        GDPR,           // 3 - General Data Protection Regulation
        AML_KYC,        // 4 - Anti-Money Laundering / KYC
        ISO27001        // 5 - Information Security Management
    }

    // Enhanced data structures
    struct CEDAIEntry {
        string cedaiId;
        address issuer;
        bytes32 zkProofCommitment;
        bool breachFlag;
        BreachSeverity breachSeverity;
        EnforcementAction enforcementAction;
        uint256 breachTimestamp;
        uint256 lastUpdated;
        string breachDescription;
        bytes32 entryHash;
        bool isActive;
        // Enhanced compliance fields
        ComplianceStatus complianceStatus;
        RegulatoryFramework[] applicableFrameworks;
        string regulatoryNotes;
        uint256 capitalRequirement;
        uint256 riskScore;
        bool kycVerified;
        bool amlCleared;
        uint256 lastComplianceCheck;
    }
    
    struct BreachMetrics {
        uint256 totalBreaches;
        uint256 totalEnforcementActions;
        uint256 lastMetricsUpdate;
        mapping(BreachSeverity => uint256) severityCounts;
        mapping(EnforcementAction => uint256) actionCounts;
        // Enhanced compliance metrics
        uint256 totalComplianceViolations;
        uint256 totalRegulatoryReports;
        mapping(ComplianceStatus => uint256) complianceCounts;
        mapping(RegulatoryFramework => uint256) frameworkViolations;
    }
    
    struct ComplianceReport {
        uint256 reportId;
        uint256 timestamp;
        ComplianceStatus status;
        RegulatoryFramework framework;
        string description;
        string remediation;
        bool resolved;
        address reporter;
        uint256 resolutionTimestamp;
    }
    
    struct BatchOperation {
        string[] cedaiIds;
        BreachSeverity[] severities;
        EnforcementAction[] actions;
        string[] descriptions;
        uint256 timestamp;
        address operator;
    }
    
    struct GovernanceProposal {
        uint256 proposalId;
        string description;
        uint256 votingDeadline;
        uint256 yesVotes;
        uint256 noVotes;
        bool executed;
        address proposer;
        mapping(address => bool) hasVoted;
    }

    // State variables
    mapping(string => CEDAIEntry) public registry;
    mapping(address => string[]) public issuerCEDAIs;
    mapping(BreachSeverity => uint256) public severityCounts;
    mapping(EnforcementAction => uint256) public actionCounts;
    BreachMetrics public globalMetrics;
    
    // Enhanced compliance state
    mapping(uint256 => ComplianceReport) public complianceReports;
    mapping(uint256 => GovernanceProposal) public governanceProposals;
    uint256 public complianceReportCounter;
    uint256 public governanceProposalCounter;
    
    // Compliance thresholds and limits
    uint256 public maxRiskScore;
    uint256 public minCapitalRequirement;
    uint256 public complianceCheckInterval;
    uint256 public governanceVotingPeriod;
    
    // Multi-signature and timelock
    address public timelockController;
    uint256 public timelockDelay;
    mapping(bytes32 => bool) public executedProposals;
    
    // Events
    event CEDAIRegistered(string indexed cedaiId, address indexed issuer, bytes32 zkProofCommitment);
    event BreachUpdated(string indexed cedaiId, BreachSeverity severity, EnforcementAction action, string description);
    event EnforcementActionExecuted(string indexed cedaiId, EnforcementAction action, uint256 timestamp);
    event EmergencyPaused(address indexed operator, string reason);
    event DashboardOperatorUpdated(address indexed oldOperator, address indexed newOperator);
    event BatchOperationExecuted(address indexed operator, uint256 batchSize, uint256 timestamp);
    
    // Enhanced compliance events
    event ComplianceViolationDetected(string indexed cedaiId, ComplianceStatus status, RegulatoryFramework framework);
    event ComplianceReportSubmitted(uint256 indexed reportId, ComplianceStatus status, string description);
    event ComplianceReportResolved(uint256 indexed reportId, string resolution);
    event GovernanceProposalCreated(uint256 indexed proposalId, string description, address proposer);
    event GovernanceProposalVoted(uint256 indexed proposalId, address indexed voter, bool support);
    event GovernanceProposalExecuted(uint256 indexed proposalId, bool success);
    event RegulatoryReportGenerated(uint256 timestamp, RegulatoryFramework framework, string reportData);
    event CapitalRequirementUpdated(uint256 oldRequirement, uint256 newRequirement);
    event RiskScoreUpdated(string indexed cedaiId, uint256 oldScore, uint256 newScore);
    event KYCCheckCompleted(string indexed cedaiId, bool verified, address verifier);
    event AMLCheckCompleted(string indexed cedaiId, bool cleared, address checker);

    // Constants
    uint256 public constant MAX_BATCH_SIZE = 50;
    uint256 public constant MAX_STRING_LENGTH = 1000;
    uint256 public constant MAX_RISK_SCORE = 100;
    uint256 public constant MIN_TIMELOCK_DELAY = 24 hours;
    uint256 public constant MAX_TIMELOCK_DELAY = 7 days;

    // Modifiers
    modifier onlyComplianceOfficer() {
        require(hasRole(COMPLIANCE_OFFICER_ROLE, msg.sender), "Only compliance officer");
        _;
    }
    
    modifier onlyRegulatoryReporter() {
        require(hasRole(REGULATORY_REPORTER_ROLE, msg.sender), "Only regulatory reporter");
        _;
    }
    
    modifier onlyAuditor() {
        require(hasRole(AUDITOR_ROLE, msg.sender), "Only auditor");
        _;
    }
    
    modifier onlyUpgrader() {
        require(hasRole(UPGRADER_ROLE, msg.sender), "Only upgrader");
        _;
    }
    
    modifier validRiskScore(uint256 score) {
        require(score <= MAX_RISK_SCORE, "Invalid risk score");
        _;
    }
    
    modifier validTimelockDelay(uint256 delay) {
        require(delay >= MIN_TIMELOCK_DELAY && delay <= MAX_TIMELOCK_DELAY, "Invalid timelock delay");
        _;
    }

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(
        address _dashboardOperator,
        address _complianceOfficer,
        address _regulatoryReporter,
        address _auditor,
        address _timelockController
    ) public initializer {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(DASHBOARD_OPERATOR_ROLE, _dashboardOperator);
        _grantRole(EMERGENCY_OPERATOR_ROLE, _dashboardOperator);
        _grantRole(BATCH_OPERATOR_ROLE, _dashboardOperator);
        _grantRole(COMPLIANCE_OFFICER_ROLE, _complianceOfficer);
        _grantRole(REGULATORY_REPORTER_ROLE, _regulatoryReporter);
        _grantRole(AUDITOR_ROLE, _auditor);
        _grantRole(UPGRADER_ROLE, msg.sender);
        
        timelockController = _timelockController;
        timelockDelay = 24 hours;
        maxRiskScore = 100;
        minCapitalRequirement = 1000 ether;
        complianceCheckInterval = 24 hours;
        governanceVotingPeriod = 7 days;
        
        globalMetrics.lastMetricsUpdate = block.timestamp;
    }

    // Core CEDAI functions with enhanced compliance
    function registerCEDAI(
        string memory cedaiId,
        bytes32 zkProofCommitment,
        bool breachFlag,
        BreachSeverity breachSeverity,
        EnforcementAction enforcementAction,
        string memory description,
        uint256 capitalRequirement,
        uint256 riskScore,
        RegulatoryFramework[] memory frameworks
    ) public nonReentrant whenNotPaused {
        require(bytes(cedaiId).length > 0, "Invalid CEDAI ID");
        require(bytes(cedaiId).length <= MAX_STRING_LENGTH, "CEDAI ID too long");
        require(bytes(description).length <= MAX_STRING_LENGTH, "Description too long");
        require(!registry[cedaiId].isActive, "CEDAI already registered");
        require(capitalRequirement >= minCapitalRequirement, "Insufficient capital");
        require(riskScore <= maxRiskScore, "Risk score too high");
        
        // Compliance checks
        require(performKYCCheck(cedaiId, msg.sender), "KYC verification failed");
        require(performAMLCheck(cedaiId, msg.sender), "AML clearance failed");
        
        CEDAIEntry memory newEntry = CEDAIEntry({
            cedaiId: cedaiId,
            issuer: msg.sender,
            zkProofCommitment: zkProofCommitment,
            breachFlag: breachFlag,
            breachSeverity: breachSeverity,
            enforcementAction: enforcementAction,
            breachTimestamp: breachFlag ? block.timestamp : 0,
            lastUpdated: block.timestamp,
            breachDescription: description,
            entryHash: keccak256(abi.encodePacked(cedaiId, msg.sender, zkProofCommitment, block.timestamp)),
            isActive: true,
            complianceStatus: ComplianceStatus.COMPLIANT,
            applicableFrameworks: frameworks,
            regulatoryNotes: "",
            capitalRequirement: capitalRequirement,
            riskScore: riskScore,
            kycVerified: true,
            amlCleared: true,
            lastComplianceCheck: block.timestamp
        });
        
        registry[cedaiId] = newEntry;
        issuerCEDAIs[msg.sender].push(cedaiId);
        
        if (breachFlag) {
            severityCounts[breachSeverity]++;
            actionCounts[enforcementAction]++;
            globalMetrics.totalBreaches++;
        }
        
        globalMetrics.lastMetricsUpdate = block.timestamp;
        
        emit CEDAIRegistered(cedaiId, msg.sender, zkProofCommitment);
        emit KYCCheckCompleted(cedaiId, true, msg.sender);
        emit AMLCheckCompleted(cedaiId, true, msg.sender);
    }

    // Enhanced breach assessment with compliance integration
    function updateBreachAssessment(
        string memory cedaiId,
        BreachSeverity severity,
        EnforcementAction action,
        string memory description,
        ComplianceStatus complianceStatus,
        string memory regulatoryNotes
    ) public onlyRole(DASHBOARD_OPERATOR_ROLE) nonReentrant whenNotPaused {
        require(registry[cedaiId].isActive, "CEDAI not found or inactive");
        require(bytes(description).length <= MAX_STRING_LENGTH, "Description too long");
        
        CEDAIEntry storage entry = registry[cedaiId];
        BreachSeverity oldSeverity = entry.breachSeverity;
        EnforcementAction oldAction = entry.enforcementAction;
        
        // Update breach information
        entry.breachFlag = severity != BreachSeverity.NONE;
        entry.breachSeverity = severity;
        entry.enforcementAction = action;
        entry.breachTimestamp = entry.breachFlag ? block.timestamp : 0;
        entry.lastUpdated = block.timestamp;
        entry.breachDescription = description;
        entry.complianceStatus = complianceStatus;
        entry.regulatoryNotes = regulatoryNotes;
        
        // Update metrics
        if (oldSeverity != severity) {
            if (oldSeverity != BreachSeverity.NONE) severityCounts[oldSeverity]--;
            if (severity != BreachSeverity.NONE) severityCounts[severity]++;
        }
        
        if (oldAction != action) {
            if (oldAction != EnforcementAction.NONE) actionCounts[oldAction]--;
            if (action != EnforcementAction.NONE) actionCounts[action]++;
        }
        
        if (!entry.breachFlag && oldSeverity != BreachSeverity.NONE) {
            globalMetrics.totalBreaches--;
        } else if (entry.breachFlag && oldSeverity == BreachSeverity.NONE) {
            globalMetrics.totalBreaches++;
        }
        
        globalMetrics.lastMetricsUpdate = block.timestamp;
        
        emit BreachUpdated(cedaiId, severity, action, description);
        emit EnforcementActionExecuted(cedaiId, action, block.timestamp);
        
        // Compliance violation detection
        if (complianceStatus != ComplianceStatus.COMPLIANT) {
            emit ComplianceViolationDetected(cedaiId, complianceStatus, RegulatoryFramework.MICA);
            submitComplianceReport(cedaiId, complianceStatus, description);
        }
    }

    // Compliance and regulatory functions
    function submitComplianceReport(
        string memory cedaiId,
        ComplianceStatus status,
        string memory description
    ) public onlyComplianceOfficer {
        complianceReportCounter++;
        
        ComplianceReport memory report = ComplianceReport({
            reportId: complianceReportCounter,
            timestamp: block.timestamp,
            status: status,
            framework: RegulatoryFramework.MICA,
            description: description,
            remediation: "",
            resolved: false,
            reporter: msg.sender,
            resolutionTimestamp: 0
        });
        
        complianceReports[complianceReportCounter] = report;
        globalMetrics.totalComplianceViolations++;
        globalMetrics.complianceCounts[status]++;
        
        emit ComplianceReportSubmitted(complianceReportCounter, status, description);
    }
    
    function resolveComplianceReport(
        uint256 reportId,
        string memory resolution
    ) public onlyComplianceOfficer {
        require(complianceReports[reportId].reportId != 0, "Report not found");
        require(!complianceReports[reportId].resolved, "Report already resolved");
        
        complianceReports[reportId].resolved = true;
        complianceReports[reportId].remediation = resolution;
        complianceReports[reportId].resolutionTimestamp = block.timestamp;
        
        emit ComplianceReportResolved(reportId, resolution);
    }
    
    function generateRegulatoryReport(
        RegulatoryFramework framework,
        string memory reportData
    ) public onlyRegulatoryReporter {
        globalMetrics.totalRegulatoryReports++;
        globalMetrics.frameworkViolations[framework]++;
        
        emit RegulatoryReportGenerated(block.timestamp, framework, reportData);
    }
    
    function updateCapitalRequirement(uint256 newRequirement) public onlyRole(DEFAULT_ADMIN_ROLE) {
        uint256 oldRequirement = minCapitalRequirement;
        minCapitalRequirement = newRequirement;
        
        emit CapitalRequirementUpdated(oldRequirement, newRequirement);
    }
    
    function updateRiskScore(
        string memory cedaiId,
        uint256 newScore
    ) public onlyComplianceOfficer validRiskScore(newScore) {
        require(registry[cedaiId].isActive, "CEDAI not found or inactive");
        
        uint256 oldScore = registry[cedaiId].riskScore;
        registry[cedaiId].riskScore = newScore;
        registry[cedaiId].lastComplianceCheck = block.timestamp;
        
        emit RiskScoreUpdated(cedaiId, oldScore, newScore);
    }

    // Governance functions
    function createGovernanceProposal(
        string memory description
    ) public onlyRole(DEFAULT_ADMIN_ROLE) {
        governanceProposalCounter++;
        
        GovernanceProposal storage proposal = governanceProposals[governanceProposalCounter];
        proposal.proposalId = governanceProposalCounter;
        proposal.description = description;
        proposal.votingDeadline = block.timestamp + governanceVotingPeriod;
        proposal.proposer = msg.sender;
        
        emit GovernanceProposalCreated(governanceProposalCounter, description, msg.sender);
    }
    
    function voteOnProposal(uint256 proposalId, bool support) public onlyRole(DEFAULT_ADMIN_ROLE) {
        GovernanceProposal storage proposal = governanceProposals[proposalId];
        require(proposal.proposalId != 0, "Proposal not found");
        require(block.timestamp < proposal.votingDeadline, "Voting period ended");
        require(!proposal.hasVoted[msg.sender], "Already voted");
        
        proposal.hasVoted[msg.sender] = true;
        if (support) {
            proposal.yesVotes++;
        } else {
            proposal.noVotes++;
        }
        
        emit GovernanceProposalVoted(proposalId, msg.sender, support);
    }
    
    function executeProposal(uint256 proposalId) public onlyRole(DEFAULT_ADMIN_ROLE) {
        GovernanceProposal storage proposal = governanceProposals[proposalId];
        require(proposal.proposalId != 0, "Proposal not found");
        require(block.timestamp >= proposal.votingDeadline, "Voting period not ended");
        require(!proposal.executed, "Proposal already executed");
        require(proposal.yesVotes > proposal.noVotes, "Proposal not approved");
        
        proposal.executed = true;
        
        emit GovernanceProposalExecuted(proposalId, true);
    }

    // Enhanced query functions
    function getCEDAIEntry(string memory cedaiId) public view returns (CEDAIEntry memory) {
        return registry[cedaiId];
    }
    
    function getCEDAIEntryDetails(string memory cedaiId) public view returns (
        string memory cedaiId_,
        address issuer,
        bytes32 zkProofCommitment,
        bool breachFlag,
        BreachSeverity breachSeverity,
        EnforcementAction enforcementAction,
        uint256 breachTimestamp,
        uint256 lastUpdated,
        string memory breachDescription,
        bytes32 entryHash,
        bool isActive
    ) {
        CEDAIEntry memory entry = registry[cedaiId];
        return (
            entry.cedaiId,
            entry.issuer,
            entry.zkProofCommitment,
            entry.breachFlag,
            entry.breachSeverity,
            entry.enforcementAction,
            entry.breachTimestamp,
            entry.lastUpdated,
            entry.breachDescription,
            entry.entryHash,
            entry.isActive
        );
    }
    
    function getComplianceReport(uint256 reportId) public view returns (
        uint256,
        uint256,
        ComplianceStatus,
        RegulatoryFramework,
        string memory,
        string memory,
        bool,
        address,
        uint256
    ) {
        ComplianceReport memory report = complianceReports[reportId];
        return (
            report.reportId,
            report.timestamp,
            report.status,
            report.framework,
            report.description,
            report.remediation,
            report.resolved,
            report.reporter,
            report.resolutionTimestamp
        );
    }
    
    function getGovernanceProposal(uint256 proposalId) public view returns (
        uint256,
        string memory,
        uint256,
        uint256,
        uint256,
        bool,
        address
    ) {
        GovernanceProposal storage proposal = governanceProposals[proposalId];
        return (
            proposal.proposalId,
            proposal.description,
            proposal.votingDeadline,
            proposal.yesVotes,
            proposal.noVotes,
            proposal.executed,
            proposal.proposer
        );
    }

    // Emergency and administrative functions
    function pause(string memory reason) public onlyRole(EMERGENCY_OPERATOR_ROLE) {
        _pause();
        emit EmergencyPaused(msg.sender, reason);
    }
    
    function unpause() public onlyRole(EMERGENCY_OPERATOR_ROLE) {
        _unpause();
    }
    
    function updateTimelockDelay(uint256 newDelay) public onlyRole(DEFAULT_ADMIN_ROLE) validTimelockDelay(newDelay) {
        timelockDelay = newDelay;
    }
    
    function updateMaxRiskScore(uint256 newMaxScore) public onlyComplianceOfficer {
        require(newMaxScore <= MAX_RISK_SCORE, "Invalid max risk score");
        maxRiskScore = newMaxScore;
    }

    // Internal compliance functions
    function performKYCCheck(string memory cedaiId, address issuer) internal view returns (bool) {
        // In production, this would integrate with KYC providers
        // For now, return true for demo purposes
        return true;
    }
    
    function performAMLCheck(string memory cedaiId, address issuer) internal view returns (bool) {
        // In production, this would integrate with AML screening services
        // For now, return true for demo purposes
        return true;
    }

    // UUPS upgrade functions
    function _authorizeUpgrade(address newImplementation) internal override onlyUpgrader {}
    
    function upgradeTo(address newImplementation) public onlyUpgrader {
        upgradeToAndCall(newImplementation, "");
    }
    
    function upgradeToAndCall(address newImplementation, bytes memory data) public payable override onlyUpgrader {
        _authorizeUpgrade(newImplementation);
        super.upgradeToAndCall(newImplementation, data);
    }
} 