// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/// @title EDAI ZK Proof Verifier
/// @notice Verifies zero-knowledge proofs for EDAI commitments
/// @dev Implements ZK proof verification for energy dispatch commitments
contract EDAIZKVerifier is ReentrancyGuard, AccessControl, Pausable {
    bytes32 public constant VERIFIER_ROLE = keccak256("VERIFIER_ROLE");
    bytes32 public constant PROVER_ROLE = keccak256("PROVER_ROLE");
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");

    struct ZKProof {
        string proofId;
        bytes32 commitment;
        bytes32 publicInputs;
        bytes proof;
        uint256 timestamp;
        address prover;
        bool isValid;
        string verificationResult;
    }

    struct VerificationParams {
        string edaiId;
        bytes32 expectedCommitment;
        bytes32 publicInputs;
        bytes proof;
        uint256 timestamp;
    }

    // Storage
    mapping(string => ZKProof) public proofs;
    mapping(bytes32 => bool) public verifiedCommitments;
    mapping(address => string[]) public proverProofs;
    mapping(string => uint256) public verificationCount;
    mapping(bytes32 => uint256) public commitmentTimestamps;

    // Events
    event ProofSubmitted(
        string indexed proofId,
        string indexed edaiId,
        bytes32 commitment,
        address indexed prover,
        uint256 timestamp
    );

    event ProofVerified(
        string indexed proofId,
        string indexed edaiId,
        bytes32 commitment,
        bool isValid,
        string result,
        uint256 timestamp
    );

    event CommitmentVerified(
        bytes32 indexed commitment,
        string indexed edaiId,
        bool isValid,
        uint256 timestamp
    );

    event VerifierAuthorized(
        address indexed verifier,
        bool authorized,
        uint256 timestamp
    );

    // Constants
    uint256 public constant MAX_PROOF_SIZE = 10000; // 10KB max proof size
    uint256 public constant VERIFICATION_TIMEOUT = 1 hours;
    uint256 public constant MIN_VERIFICATIONS = 2;

    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(VERIFIER_ROLE, msg.sender);
        _grantRole(PROVER_ROLE, msg.sender);
        _grantRole(OPERATOR_ROLE, msg.sender);
    }

    /// @notice Submit a ZK proof for verification
    /// @param proofId Unique proof identifier
    /// @param edaiId EDAI identifier
    /// @param commitment The commitment hash
    /// @param publicInputs Public inputs hash
    /// @param proof The ZK proof bytes
    function submitProof(
        string memory proofId,
        string memory edaiId,
        bytes32 commitment,
        bytes32 publicInputs,
        bytes memory proof
    ) external onlyRole(PROVER_ROLE) whenNotPaused {
        require(bytes(proofId).length > 0, "Invalid proof ID");
        require(bytes(edaiId).length > 0, "Invalid EDAI ID");
        require(commitment != bytes32(0), "Invalid commitment");
        require(proof.length > 0, "Invalid proof");
        require(proof.length <= MAX_PROOF_SIZE, "Proof too large");
        require(proofs[proofId].timestamp == 0, "Proof already exists");

        ZKProof storage newProof = proofs[proofId];
        newProof.proofId = proofId;
        newProof.commitment = commitment;
        newProof.publicInputs = publicInputs;
        newProof.proof = proof;
        newProof.timestamp = block.timestamp;
        newProof.prover = msg.sender;
        newProof.isValid = false;
        newProof.verificationResult = "";

        proverProofs[msg.sender].push(proofId);
        commitmentTimestamps[commitment] = block.timestamp;

        emit ProofSubmitted(proofId, edaiId, commitment, msg.sender, block.timestamp);
    }

    /// @notice Verify a submitted ZK proof
    /// @param proofId The proof identifier
    /// @param isValid Whether the proof is valid
    /// @param result Verification result message
    function verifyProof(
        string memory proofId,
        bool isValid,
        string memory result
    ) external onlyRole(VERIFIER_ROLE) whenNotPaused {
        require(bytes(proofId).length > 0, "Invalid proof ID");
        
        ZKProof storage proof = proofs[proofId];
        require(proof.timestamp != 0, "Proof not found");
        require(!proof.isValid, "Proof already verified");

        proof.isValid = isValid;
        proof.verificationResult = result;
        verificationCount[proofId]++;

        if (isValid) {
            verifiedCommitments[proof.commitment] = true;
        }

        emit ProofVerified(
            proofId,
            "", // edaiId would be stored if needed
            proof.commitment,
            isValid,
            result,
            block.timestamp
        );
    }

    /// @notice Verify a commitment directly
    /// @param commitment The commitment to verify
    /// @param edaiId The EDAI identifier
    /// @param isValid Whether the commitment is valid
    function verifyCommitment(
        bytes32 commitment,
        string memory edaiId,
        bool isValid
    ) external onlyRole(VERIFIER_ROLE) whenNotPaused {
        require(commitment != bytes32(0), "Invalid commitment");
        require(bytes(edaiId).length > 0, "Invalid EDAI ID");

        verifiedCommitments[commitment] = isValid;
        commitmentTimestamps[commitment] = block.timestamp;

        emit CommitmentVerified(commitment, edaiId, isValid, block.timestamp);
    }

    /// @notice Check if a commitment is verified
    /// @param commitment The commitment to check
    /// @return Whether the commitment is verified
    function isCommitmentVerified(bytes32 commitment) external view returns (bool) {
        return verifiedCommitments[commitment];
    }

    /// @notice Get proof details
    /// @param proofId The proof identifier
    /// @return Proof details
    function getProof(string memory proofId) external view returns (ZKProof memory) {
        return proofs[proofId];
    }

    /// @notice Get all proofs for a prover
    /// @param prover The prover address
    /// @return Array of proof IDs
    function getProverProofs(address prover) external view returns (string[] memory) {
        return proverProofs[prover];
    }

    /// @notice Check if a proof is stale
    /// @param proofId The proof identifier
    /// @return Whether the proof is stale
    function isProofStale(string memory proofId) external view returns (bool) {
        ZKProof storage proof = proofs[proofId];
        return proof.timestamp != 0 && (block.timestamp - proof.timestamp) > VERIFICATION_TIMEOUT;
    }

    /// @notice Get verification count for a proof
    /// @param proofId The proof identifier
    /// @return Number of verifications
    function getVerificationCount(string memory proofId) external view returns (uint256) {
        return verificationCount[proofId];
    }

    /// @notice Batch verify multiple proofs
    /// @param proofIds Array of proof identifiers
    /// @param validities Array of validity flags
    /// @param results Array of result messages
    function batchVerifyProofs(
        string[] memory proofIds,
        bool[] memory validities,
        string[] memory results
    ) external onlyRole(VERIFIER_ROLE) whenNotPaused {
        require(proofIds.length == validities.length, "Array length mismatch");
        require(proofIds.length == results.length, "Array length mismatch");
        require(proofIds.length <= 50, "Batch too large");

        for (uint256 i = 0; i < proofIds.length; i++) {
            _verifyProofInternal(proofIds[i], validities[i], results[i]);
        }
    }

    /// @notice Internal function to verify a proof
    /// @param proofId The proof identifier
    /// @param isValid Whether the proof is valid
    /// @param result Verification result message
    function _verifyProofInternal(
        string memory proofId,
        bool isValid,
        string memory result
    ) internal {
        require(bytes(proofId).length > 0, "Invalid proof ID");
        
        ZKProof storage proof = proofs[proofId];
        require(proof.timestamp != 0, "Proof not found");
        require(!proof.isValid, "Proof already verified");

        proof.isValid = isValid;
        proof.verificationResult = result;
        verificationCount[proofId]++;

        if (isValid) {
            verifiedCommitments[proof.commitment] = true;
        }

        emit ProofVerified(
            proofId,
            "", // edaiId would be stored if needed
            proof.commitment,
            isValid,
            result,
            block.timestamp
        );
    }

    /// @notice Authorize a verifier
    /// @param verifier The verifier address
    /// @param authorized Whether to authorize
    function authorizeVerifier(address verifier, bool authorized) external onlyRole(OPERATOR_ROLE) {
        require(verifier != address(0), "Invalid verifier address");
        
        if (authorized) {
            _grantRole(VERIFIER_ROLE, verifier);
        } else {
            _revokeRole(VERIFIER_ROLE, verifier);
        }

        emit VerifierAuthorized(verifier, authorized, block.timestamp);
    }

    /// @notice Get commitment timestamp
    /// @param commitment The commitment
    /// @return Timestamp when commitment was created
    function getCommitmentTimestamp(bytes32 commitment) external view returns (uint256) {
        return commitmentTimestamps[commitment];
    }

    /// @notice Check if proof exists
    /// @param proofId The proof identifier
    /// @return Whether the proof exists
    function proofExists(string memory proofId) external view returns (bool) {
        return proofs[proofId].timestamp != 0;
    }
} 