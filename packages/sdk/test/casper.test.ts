import { describe, expect, it } from "vitest";
import { BitMem } from "../src/index.js";

describe("Casper agent infra adapter", () => {
  it("stores Casper x402 quotes as protocol memory", async () => {
    const mem = new BitMem();
    const memory = await mem.casper.rememberX402Quote({
      agentId: "agent",
      service: "CSPR-Market-Data",
      endpoint: "/v1/rwa/nav",
      amountUsd: "0.25",
      amountCspr: "10"
    });

    expect(memory.kind).toBe("protocol_profile");
    expect(memory.tags).toEqual(
      expect.arrayContaining(["casper", "x402", "payment-quote", "cspr-market-data"])
    );
    expect(memory.content).toMatchObject({
      network: "casper",
      surface: "x402",
      snapshotType: "payment_quote",
      service: "cspr-market-data",
      endpoint: "/v1/rwa/nav",
      amountUsd: 0.25
    });
  });

  it("blocks x402 payments that breach service and spend guardrails", async () => {
    const mem = new BitMem();
    await mem.casper.createAgentGuardrailPolicy({
      agentId: "agent",
      allowedServices: ["rwa-price-oracle"],
      maxSpendPerRequestUsd: 1,
      maxSessionSpendUsd: 5,
      requireHumanForX402AboveUsd: 0.5
    });

    const verdict = await mem.casper.assessAgentAction({
      agentId: "agent",
      surface: "x402",
      actionType: "x402_payment",
      service: "unknown-alpha-feed",
      endpoint: "/v1/signal",
      paymentUsd: 3,
      sessionSpendUsd: 7
    });

    expect(verdict.decision).toBe("BLOCK");
    expect(verdict.findings.map((finding) => finding.code)).toEqual(
      expect.arrayContaining([
        "CASPER_SERVICE_NOT_ALLOWED",
        "CASPER_X402_REQUEST_SPEND_LIMIT",
        "CASPER_X402_SESSION_SPEND_LIMIT"
      ])
    );
    expect(verdict.report.kind).toBe("blocked_action");
  });

  it("requires human review for Casper DeFi MCP writes", async () => {
    const mem = new BitMem();
    await mem.casper.createAgentGuardrailPolicy({
      agentId: "agent",
      allowedMcpServers: ["cspr-trade"],
      requireHumanForDeFiWrites: true
    });

    const verdict = await mem.casper.assessAgentAction({
      agentId: "agent",
      surface: "cspr-trade",
      actionType: "defi_swap",
      mcpServer: "cspr-trade",
      mcpTool: "swap",
      mcpRisk: "write",
      readOnlyMcp: false,
      humanConfirmed: false
    });

    expect(verdict.decision).toBe("REQUIRE_HUMAN");
    expect(verdict.findings.map((finding) => finding.code)).toEqual(
      expect.arrayContaining([
        "CASPER_MCP_WRITE_REQUIRES_HUMAN",
        "CASPER_MCP_READ_ONLY_NOT_CONFIRMED",
        "CASPER_DEFI_WRITE_REQUIRES_HUMAN"
      ])
    );
    expect(verdict.report.kind).toBe("risk_report");
  });
});
