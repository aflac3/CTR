// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract CivicTrustRegistry {
    struct Attestation {
        uint256 timestamp;
        string resourceId;
        string breachType;
        bytes32 hashCommitment;
        string reporter;
        string proofReference;
        string fallbackMerkleRoot;
    }

    address public owner;
    Attestation[] public attestations;

    event AttestationSubmitted(
        uint256 indexed index,
        string resourceId,
        bytes32 hashCommitment,
        string breachType,
        uint256 timestamp
    );

    constructor() {
        owner = msg.sender;
    }

    function submitAttestation(
        string memory resourceId,
        string memory breachType,
        bytes32 hashCommitment,
        string memory reporter,
        string memory proofReference,
        string memory fallbackMerkleRoot
    ) public returns (uint256) {
        attestations.push(Attestation({
            timestamp: block.timestamp,
            resourceId: resourceId,
            breachType: breachType,
            hashCommitment: hashCommitment,
            reporter: reporter,
            proofReference: proofReference,
            fallbackMerkleRoot: fallbackMerkleRoot
        }));

        uint256 index = attestations.length - 1;
        emit AttestationSubmitted(index, resourceId, hashCommitment, breachType, block.timestamp);
        return index;
    }

    function getAttestation(uint256 index) public view returns (Attestation memory) {
        require(index < attestations.length, "Invalid index");
        return attestations[index];
    }

    function totalAttestations() public view returns (uint256) {
        return attestations.length;
    }
}
