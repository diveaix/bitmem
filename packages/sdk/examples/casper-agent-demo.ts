import { createDemoSdk } from "./shared.js";

const sdk = createDemoSdk();
const agentId = "agent-casper-01";
const observedAt = new Date(Date.now() - 7 * 60 * 1000).toISOString();

const policy = await sdk.casper.createAgentGuardrailPolicy({
  agentId,
  allowedServices: ["cspr-market-data", "rwa-price-oracle"],
  allowedMcpServers: ["cspr-cloud", "cspr-trade"],
  maxSpendPerRequestUsd: 2,
  maxSessionSpendUsd: 10,
  maxRequestsPerSession: 12,
  requireHumanForX402AboveUsd: 0.5,
  requireHumanForDeFiWrites: true,
  requireHumanForContractDeploys: true,
  notes:
    "Casper Buildathon demo policy: agents may pay small x402 quotes and read chain data, but DeFi writes and contract deploys require operator review."
});

const quote = await sdk.casper.rememberX402Quote({
  agentId,
  service: "cspr-market-data",
  endpoint: "/v1/rwa/nav/latest",
  amountUsd: 0.75,
  amountCspr: "42.0",
  observedAt,
  facilitator: "casper-x402-facilitator",
  raw: {
    status: 402,
    accepts: ["CSPR"]
  }
});

const observation = await sdk.casper.rememberMcpObservation({
  agentId,
  server: "cspr-trade",
  tool: "swap",
  risk: "write",
  observedAt: new Date().toISOString(),
  request: {
    from: "CSPR",
    to: "USDC",
    amount: "500"
  },
  summary: "Agent prepared a CSPR.trade swap after reading market context."
});

const x402Verdict = await sdk.casper.assessAgentAction({
  agentId,
  intent: "Pay an x402 market-data endpoint before updating an RWA valuation model",
  surface: "x402",
  actionType: "x402_payment",
  service: "cspr-market-data",
  endpoint: "/v1/rwa/nav/latest",
  paymentUsd: 0.75,
  sessionSpendUsd: 4.25,
  requestsInSession: 8,
  quoteObservedAt: observedAt,
  humanConfirmed: false
});

const defiVerdict = await sdk.casper.assessAgentAction({
  agentId,
  intent: "Swap CSPR into USDC using the CSPR.trade MCP server",
  surface: "cspr-trade",
  actionType: "defi_swap",
  mcpServer: "cspr-trade",
  mcpTool: "swap",
  mcpRisk: "write",
  readOnlyMcp: false,
  humanConfirmed: false,
  rawAction: {
    from: "CSPR",
    to: "USDC",
    amount: "500"
  }
});

console.log(
  JSON.stringify(
    {
      story:
        "Casper AI Toolkit agent -> x402/MCP observations -> BIT/MEM memory -> guardrail review -> auditable report",
      memoryPath: ".bit-mem/demo-memory.json",
      memories: {
        policy: {
          id: policy.id,
          hash: policy.hash
        },
        quote: {
          id: quote.id,
          hash: quote.hash
        },
        observation: {
          id: observation.id,
          hash: observation.hash
        }
      },
      verdicts: {
        x402: {
          decision: x402Verdict.decision,
          riskScore: x402Verdict.riskScore,
          reason: x402Verdict.reason,
          reportHash: x402Verdict.reportHash,
          findings: x402Verdict.findings
        },
        defi: {
          decision: defiVerdict.decision,
          riskScore: defiVerdict.riskScore,
          reason: defiVerdict.reason,
          reportHash: defiVerdict.reportHash,
          findings: defiVerdict.findings
        }
      }
    },
    null,
    2
  )
);
