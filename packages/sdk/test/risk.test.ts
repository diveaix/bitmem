import { describe, expect, it } from "vitest";
import { BitMem } from "../src/index.js";

const token = "0x1111111111111111111111111111111111111111";
const trustedSpender = "0x2222222222222222222222222222222222222222";
const unknownSpender = "0x3333333333333333333333333333333333333333";
const recipient = "0x4444444444444444444444444444444444444444";

function approveData(spender: string, amountHex: string): string {
  return (
    "0x095ea7b3" +
    "000000000000000000000000" +
    spender.slice(2) +
    amountHex.padStart(64, "0")
  );
}

describe("Aegis risk review", () => {
  it("blocks unlimited approval to unknown spender", async () => {
    const mem = new BitMem();
    await mem.memory.add({
      agentId: "agent",
      kind: "policy",
      title: "Policy",
      content: {
        maxNativeValueWei: "0",
        allowedContracts: [token],
        trustedSpenders: [trustedSpender]
      }
    });

    const verdict = await mem.risk.reviewPlan({
      agentId: "agent",
      intent: "approve unknown spender",
      txs: [
        {
          chainId: 16602,
          to: token,
          data: approveData(
            unknownSpender,
            "ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"
          ),
          value: "0"
        }
      ],
      metadata: {}
    });

    expect(verdict.decision).toBe("BLOCK");
    expect(verdict.findings.some((finding) => finding.code === "UNLIMITED_APPROVAL_UNKNOWN_SPENDER")).toBe(true);
    expect(verdict.decodedTransactions[0]).toMatchObject({
      kind: "erc20_approve",
      method: "approve(address,uint256)",
      args: {
        spender: unknownSpender
      }
    });
  });

  it("allows known contract with no risky calldata", async () => {
    const mem = new BitMem();
    await mem.memory.add({
      agentId: "agent",
      kind: "policy",
      title: "Policy",
      content: {
        maxNativeValueWei: "0",
        allowedContracts: [token]
      }
    });

    const verdict = await mem.risk.reviewPlan({
      agentId: "agent",
      intent: "safe protocol interaction",
      txs: [
        {
          chainId: 16602,
          to: token,
          data: "0x",
          value: "0"
        }
      ],
      metadata: {}
    });

    expect(verdict.decision).toBe("ALLOW");
    expect(verdict.decodedTransactions[0]).toMatchObject({
      kind: "contract_call",
      method: "unknown"
    });
  });

  it("requires human approval when batch size exceeds policy", async () => {
    const mem = new BitMem();
    await mem.memory.add({
      agentId: "agent",
      kind: "policy",
      title: "Policy",
      content: {
        maxNativeValueWei: "0",
        allowedContracts: [token],
        maxBatchTransactions: 1
      }
    });

    const tx = {
      chainId: 16602,
      to: token,
      data: "0x",
      value: "0"
    };
    const verdict = await mem.risk.reviewPlan({
      agentId: "agent",
      intent: "two calls",
      txs: [tx, tx],
      metadata: {}
    });

    expect(verdict.decision).toBe("WARN");
    expect(verdict.findings.some((finding) => finding.code === "BATCH_SIZE_LIMIT")).toBe(true);
  });

  it("blocks selectors listed in policy", async () => {
    const mem = new BitMem();
    await mem.memory.add({
      agentId: "agent",
      kind: "policy",
      title: "Policy",
      content: {
        maxNativeValueWei: "0",
        allowedContracts: [token],
        blockedSelectors: ["0xa9059cbb"]
      }
    });

    const transferData =
      "0xa9059cbb" +
      "000000000000000000000000" +
      recipient.slice(2) +
      "01".padStart(64, "0");

    const verdict = await mem.risk.reviewPlan({
      agentId: "agent",
      intent: "blocked transfer",
      txs: [
        {
          chainId: 16602,
          to: token,
          data: transferData,
          value: "0"
        }
      ],
      metadata: {}
    });

    expect(verdict.decision).toBe("BLOCK");
    expect(verdict.findings.some((finding) => finding.code === "BLOCKED_SELECTOR")).toBe(true);
    expect(verdict.decodedTransactions[0]).toMatchObject({
      kind: "erc20_transfer",
      args: {
        recipient
      }
    });
  });

  it("blocks approvals over maxTokenApprovalAmount", async () => {
    const mem = new BitMem();
    await mem.memory.add({
      agentId: "agent",
      kind: "policy",
      title: "Policy",
      content: {
        maxNativeValueWei: "0",
        allowedContracts: [token],
        trustedSpenders: [trustedSpender],
        maxTokenApprovalAmount: "10"
      }
    });

    const verdict = await mem.risk.reviewPlan({
      agentId: "agent",
      intent: "approval above limit",
      txs: [
        {
          chainId: 16602,
          to: token,
          data: approveData(trustedSpender, "0b"),
          value: "0"
        }
      ],
      metadata: {}
    });

    expect(verdict.decision).toBe("BLOCK");
    expect(verdict.findings.some((finding) => finding.code === "TOKEN_APPROVAL_LIMIT")).toBe(true);
  });
});
