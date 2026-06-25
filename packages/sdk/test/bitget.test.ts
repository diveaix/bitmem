import { describe, expect, it } from "vitest";
import { BitMem } from "../src/index.js";

describe("Bitget infra adapter", () => {
  it("stores Bitget market snapshots as protocol memory", async () => {
    const mem = new BitMem();
    const memory = await mem.bitget.rememberMarketSnapshot({
      agentId: "agent",
      symbol: "btcusdt",
      productType: "USDT-FUTURES",
      ticker: {
        lastPrice: "100000",
        bidPrice: "99990",
        askPrice: "100010"
      },
      fundingRate: {
        rate: "0.0001"
      },
      openInterest: {
        valueUsd: "1200000000"
      }
    });

    expect(memory.kind).toBe("protocol_profile");
    expect(memory.tags).toEqual(
      expect.arrayContaining(["bitget", "market-snapshot", "btcusdt"])
    );
    expect(memory.content).toMatchObject({
      exchange: "bitget",
      surface: "bitget-agent-hub",
      snapshotType: "market",
      symbol: "BTCUSDT",
      productType: "USDT-FUTURES",
      fundingRateBps: 1
    });
  });

  it("blocks futures orders that breach leverage and notional guardrails", async () => {
    const mem = new BitMem();
    await mem.bitget.createFuturesGuardrailPolicy({
      agentId: "agent",
      allowedSymbols: ["BTCUSDT"],
      maxLeverage: 5,
      maxSingleOrderUsd: 1_000,
      maxTotalExposureUsd: 5_000,
      requireHumanForWrites: false,
      readOnlyMcpRequired: false
    });

    const verdict = await mem.bitget.assessFuturesOrder({
      agentId: "agent",
      intent: "Open BTC long",
      productType: "USDT-FUTURES",
      symbol: "BTCUSDT",
      side: "buy",
      tradeSide: "open",
      orderType: "market",
      size: "0.02",
      leverage: 10,
      marketSnapshot: {
        agentId: "agent",
        productType: "USDT-FUTURES",
        symbol: "BTCUSDT",
        ticker: {
          lastPrice: "100000"
        }
      }
    });

    expect(verdict.decision).toBe("BLOCK");
    expect(verdict.notionalUsd).toBe(2000);
    expect(verdict.findings.map((finding) => finding.code)).toEqual(
      expect.arrayContaining([
        "BITGET_LEVERAGE_LIMIT",
        "BITGET_SINGLE_ORDER_NOTIONAL_LIMIT"
      ])
    );
    expect(verdict.report.kind).toBe("blocked_action");
  });

  it("requires human review when write access is not confirmed safe", async () => {
    const mem = new BitMem();
    await mem.bitget.createFuturesGuardrailPolicy({
      agentId: "agent",
      allowedSymbols: ["ETHUSDT"],
      maxLeverage: 10,
      maxSingleOrderUsd: 5_000,
      requireHumanForWrites: true,
      readOnlyMcpRequired: true
    });

    const verdict = await mem.bitget.assessFuturesOrder({
      agentId: "agent",
      productType: "USDT-FUTURES",
      symbol: "ETHUSDT",
      side: "sell",
      tradeSide: "open",
      orderType: "limit",
      size: "0.5",
      price: "3000",
      leverage: 3,
      readOnlyMcp: false,
      humanConfirmed: false
    });

    expect(verdict.decision).toBe("REQUIRE_HUMAN");
    expect(verdict.findings.map((finding) => finding.code)).toEqual(
      expect.arrayContaining([
        "BITGET_READ_ONLY_MCP_NOT_CONFIRMED",
        "BITGET_WRITE_REQUIRES_HUMAN"
      ])
    );
    expect(verdict.report.kind).toBe("risk_report");
  });
});
