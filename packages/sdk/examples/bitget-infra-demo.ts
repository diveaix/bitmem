import { createBitgetMcpCodexConfig } from "../src/index.js";
import { createDemoSdk } from "./shared.js";

const sdk = createDemoSdk();
const agentId = "agent-bitget-01";
const observedAt = new Date().toISOString();

const policy = await sdk.bitget.createFuturesGuardrailPolicy({
  agentId,
  allowedSymbols: ["BTCUSDT", "ETHUSDT"],
  allowedProductTypes: ["USDT-FUTURES"],
  maxLeverage: 5,
  maxSingleOrderUsd: 1_000,
  maxTotalExposureUsd: 2_500,
  maxFundingRateBps: 15,
  requireHumanForWrites: true,
  readOnlyMcpRequired: true,
  notes:
    "Demo policy for Bitget AI Hackathon Track 2. Read-only market data is safe; write operations need human confirmation."
});

const marketSnapshotInput = {
  agentId,
  symbol: "BTCUSDT",
  productType: "USDT-FUTURES" as const,
  observedAt,
  tools: [
    "futures_get_ticker",
    "futures_get_funding_rate",
    "futures_get_open_interest"
  ],
  ticker: {
    lastPrice: "100000",
    bidPrice: "99990",
    askPrice: "100010"
  },
  fundingRate: {
    rate: "0.002"
  },
  openInterest: {
    valueUsd: "1200000000"
  }
};

const positionSnapshotInput = {
  agentId,
  observedAt,
  account: {
    accountType: "futures" as const,
    equityUsd: "2000",
    availableUsd: "1500"
  },
  positions: [
    {
      symbol: "BTCUSDT",
      productType: "USDT-FUTURES" as const,
      holdSide: "long" as const,
      leverage: "3",
      total: "0.01",
      markPrice: "100000",
      unrealizedPnlUsd: "42"
    }
  ]
};

const marketSnapshot = await sdk.bitget.rememberMarketSnapshot(marketSnapshotInput);
const positionSnapshot =
  await sdk.bitget.rememberPositionSnapshot(positionSnapshotInput);
const observation = await sdk.bitget.rememberToolObservation({
  agentId,
  module: "futures",
  tool: "futures_get_funding_rate",
  risk: "read",
  observedAt,
  request: {
    productType: "USDT-FUTURES",
    symbol: "BTCUSDT"
  },
  response: {
    fundingRate: "0.002"
  },
  summary: "Funding is elevated, so a new leveraged long should require review."
});

const verdict = await sdk.bitget.assessFuturesOrder({
  agentId,
  intent: "Open a BTCUSDT momentum long from a Bitget AI signal",
  productType: "USDT-FUTURES",
  symbol: "BTCUSDT",
  side: "buy",
  tradeSide: "open",
  orderType: "market",
  size: "0.02",
  leverage: 7,
  marketSnapshot: marketSnapshotInput,
  positionSnapshot: positionSnapshotInput,
  readOnlyMcp: false,
  humanConfirmed: false
});

console.log(
  JSON.stringify(
    {
      story: "Bitget Agent Hub market data -> BIT/MEM memory -> futures guardrail review -> auditable report",
      memoryPath: ".bit-mem/demo-memory.json",
      bitgetMcpCodexConfig: createBitgetMcpCodexConfig({
        modules: ["spot", "futures", "account"],
        readOnly: true
      }),
      memories: {
        policy: {
          id: policy.id,
          hash: policy.hash
        },
        marketSnapshot: {
          id: marketSnapshot.id,
          hash: marketSnapshot.hash
        },
        positionSnapshot: {
          id: positionSnapshot.id,
          hash: positionSnapshot.hash
        },
        observation: {
          id: observation.id,
          hash: observation.hash
        }
      },
      verdict: {
        decision: verdict.decision,
        riskScore: verdict.riskScore,
        reason: verdict.reason,
        notionalUsd: verdict.notionalUsd,
        referencePrice: verdict.referencePrice,
        reportHash: verdict.reportHash,
        findings: verdict.findings
      }
    },
    null,
    2
  )
);
