// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/// @title AegisProofRegistry
/// @notice Anchors BIT/MEM risk decisions and memory/report hashes on an EVM chain.
contract AegisProofRegistry {
    enum Decision {
        ALLOW,
        WARN,
        BLOCK,
        REQUIRE_HUMAN
    }

    struct DecisionRecord {
        bytes32 agentId;
        bytes32 planHash;
        bytes32 reportHash;
        Decision decision;
        address recorder;
        uint64 recordedAt;
    }

    mapping(bytes32 decisionId => DecisionRecord record) public decisions;

    event DecisionRecorded(
        bytes32 indexed decisionId,
        bytes32 indexed agentId,
        bytes32 indexed planHash,
        bytes32 reportHash,
        Decision decision,
        address recorder
    );

    function recordDecision(
        bytes32 agentId,
        bytes32 planHash,
        bytes32 reportHash,
        Decision decision
    ) external returns (bytes32 decisionId) {
        require(agentId != bytes32(0), "agentId required");
        require(planHash != bytes32(0), "planHash required");
        require(reportHash != bytes32(0), "reportHash required");

        decisionId = keccak256(
            abi.encode(
                block.chainid,
                msg.sender,
                agentId,
                planHash,
                reportHash,
                decision,
                block.timestamp
            )
        );

        decisions[decisionId] = DecisionRecord({
            agentId: agentId,
            planHash: planHash,
            reportHash: reportHash,
            decision: decision,
            recorder: msg.sender,
            recordedAt: uint64(block.timestamp)
        });

        emit DecisionRecorded(
            decisionId,
            agentId,
            planHash,
            reportHash,
            decision,
            msg.sender
        );
    }
}
