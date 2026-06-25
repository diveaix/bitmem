import { createId, hashJson } from "./hash.js";
import type { MemoryClient } from "./memory.js";
import type { MemoryRecord, RiskDecision, RiskFinding } from "./types.js";

export type BitgetMcpModule =
  | "spot"
  | "futures"
  | "account"
  | "margin"
  | "copytrading"
  | "convert"
  | "earn"
  | "p2p"
  | "broker";

export type BitgetProductType =
  | "SPOT"
  | "USDT-FUTURES"
  | "USDC-FUTURES"
  | "COIN-FUTURES";

export type BitgetObservationSource = "mcp" | "cli" | "api" | "manual";

export type BitgetToolRisk = "read" | "write" | "danger";

export type BitgetMarketSnapshotInput = {
  agentId: string;
  symbol: string;
  productType: BitgetProductType;
  observedAt?: string;
  source?: BitgetObservationSource;
  tools?: string[];
  ticker?: {
    lastPrice?: string | number;
    markPrice?: string | number;
    indexPrice?: string | number;
    bidPrice?: string | number;
    askPrice?: string | number;
    high24h?: string | number;
    low24h?: string | number;
    volume24h?: string | number;
    quoteVolume24h?: string | number;
  };
  fundingRate?: {
    rateBps?: number;
    rate?: string | number;
    nextFundingTime?: string;
  };
  openInterest?: {
    amount?: string | number;
    valueUsd?: string | number;
  };
  depth?: {
    bids?: Array<[string | number, string | number]>;
    asks?: Array<[string | number, string | number]>;
    spreadBps?: number;
  };
  candles?: {
    granularity: string;
    count?: number;
    firstOpenTime?: string;
    lastCloseTime?: string;
    lastClose?: string | number;
    changePct?: number;
  };
  raw?: Record<string, unknown>;
};

export type BitgetPositionSnapshotInput = {
  agentId: string;
  observedAt?: string;
  source?: BitgetObservationSource;
  account?: {
    accountType?: "spot" | "futures" | "funding" | "all";
    equityUsd?: string | number;
    availableUsd?: string | number;
    marginUsedUsd?: string | number;
  };
  positions: BitgetPosition[];
  raw?: Record<string, unknown>;
};

export type BitgetPosition = {
  symbol: string;
  productType: BitgetProductType;
  holdSide?: "long" | "short" | "net";
  marginMode?: "crossed" | "isolated";
  leverage?: string | number;
  total?: string | number;
  available?: string | number;
  avgOpenPrice?: string | number;
  markPrice?: string | number;
  notionalUsd?: string | number;
  unrealizedPnlUsd?: string | number;
  liquidationPrice?: string | number;
};

export type BitgetToolObservationInput = {
  agentId: string;
  tool: string;
  module: BitgetMcpModule;
  risk: BitgetToolRisk;
  source?: BitgetObservationSource;
  observedAt?: string;
  request?: Record<string, unknown>;
  response?: Record<string, unknown>;
  summary?: string;
};

export type BitgetFuturesGuardrailPolicy = {
  allowedSymbols: string[];
  allowedProductTypes: BitgetProductType[];
  maxLeverage: number;
  maxSingleOrderUsd: number;
  maxTotalExposureUsd: number;
  maxFundingRateBps: number;
  maxOpenInterestChangePct: number;
  maxMarketDataAgeMs: number;
  requireHumanForWrites: boolean;
  readOnlyMcpRequired: boolean;
};

export type BitgetFuturesGuardrailPolicyInput = Partial<BitgetFuturesGuardrailPolicy> & {
  agentId: string;
  title?: string;
  notes?: string;
};

export type BitgetFuturesOrderIntentInput = {
  agentId: string;
  intent?: string;
  symbol: string;
  productType: Exclude<BitgetProductType, "SPOT">;
  side: "buy" | "sell";
  tradeSide?: "open" | "close";
  orderType: "limit" | "market";
  size: string | number;
  price?: string | number;
  leverage?: string | number;
  marginCoin?: string;
  reduceOnly?: boolean;
  readOnlyMcp?: boolean;
  humanConfirmed?: boolean;
  proposedAt?: string;
  marketSnapshot?: BitgetMarketSnapshotInput;
  positionSnapshot?: BitgetPositionSnapshotInput;
  policy?: Partial<BitgetFuturesGuardrailPolicy>;
  rawOrder?: Record<string, unknown>;
};

export type BitgetOrderRiskVerdict = {
  orderId: string;
  orderHash: string;
  reportHash: string;
  decision: RiskDecision;
  riskScore: number;
  reason: string;
  notionalUsd?: number;
  referencePrice?: number;
  findings: RiskFinding[];
  matchedPolicyTitle?: string;
  report: MemoryRecord;
};

export type BitgetMcpConfigInput = {
  modules?: BitgetMcpModule[] | "all";
  readOnly?: boolean;
  includeCredentialEnv?: boolean;
};

const DEFAULT_FUTURES_POLICY: BitgetFuturesGuardrailPolicy = {
  allowedSymbols: [],
  allowedProductTypes: ["USDT-FUTURES"],
  maxLeverage: 10,
  maxSingleOrderUsd: 1_000,
  maxTotalExposureUsd: 5_000,
  maxFundingRateBps: 25,
  maxOpenInterestChangePct: 20,
  maxMarketDataAgeMs: 5 * 60 * 1000,
  requireHumanForWrites: true,
  readOnlyMcpRequired: true
};

export class BitgetInfraClient {
  constructor(private readonly memory: MemoryClient) {}

  async rememberMarketSnapshot(input: BitgetMarketSnapshotInput): Promise<MemoryRecord> {
    const observedAt = input.observedAt ?? new Date().toISOString();
    const symbol = normalizeSymbol(input.symbol);
    const fundingRateBps = normalizeFundingRateBps(input.fundingRate);
    const spreadBps = input.depth?.spreadBps ?? calculateSpreadBps(input);

    return this.memory.add({
      agentId: input.agentId,
      kind: "protocol_profile",
      title: `Bitget ${symbol} ${input.productType} market snapshot`,
      content: {
        exchange: "bitget",
        surface: "bitget-agent-hub",
        snapshotType: "market",
        source: input.source ?? "mcp",
        symbol,
        productType: input.productType,
        observedAt,
        tools: input.tools ?? defaultMarketTools(input.productType),
        ticker: input.ticker,
        fundingRateBps,
        openInterest: input.openInterest,
        depth: {
          bidLevels: input.depth?.bids?.length,
          askLevels: input.depth?.asks?.length,
          spreadBps
        },
        candles: input.candles,
        raw: input.raw
      },
      tags: ["bitget", "market-snapshot", input.productType.toLowerCase(), symbol.toLowerCase()]
    });
  }

  async rememberPositionSnapshot(input: BitgetPositionSnapshotInput): Promise<MemoryRecord> {
    const observedAt = input.observedAt ?? new Date().toISOString();
    const positions = input.positions.map((position) => ({
      ...position,
      symbol: normalizeSymbol(position.symbol),
      notionalUsd: position.notionalUsd ?? estimatePositionNotionalUsd(position)
    }));

    return this.memory.add({
      agentId: input.agentId,
      kind: "agent_profile",
      title: "Bitget account and position snapshot",
      content: {
        exchange: "bitget",
        surface: "bitget-agent-hub",
        snapshotType: "positions",
        source: input.source ?? "mcp",
        observedAt,
        account: input.account,
        positions,
        totalExposureUsd: sumNumbers(
          positions.map((position) => coerceNumber(position.notionalUsd))
        ),
        raw: input.raw
      },
      tags: ["bitget", "position-snapshot", "account"]
    });
  }

  async rememberToolObservation(input: BitgetToolObservationInput): Promise<MemoryRecord> {
    const observedAt = input.observedAt ?? new Date().toISOString();
    return this.memory.add({
      agentId: input.agentId,
      kind: input.risk === "read" ? "protocol_profile" : "risk_report",
      title: `Bitget ${input.module}.${input.tool} ${input.risk} observation`,
      content: {
        exchange: "bitget",
        surface: "bitget-agent-hub",
        snapshotType: "tool_observation",
        source: input.source ?? "mcp",
        observedAt,
        tool: input.tool,
        module: input.module,
        risk: input.risk,
        request: input.request,
        response: input.response,
        summary: input.summary
      },
      tags: ["bitget", "tool-observation", input.module, input.risk]
    });
  }

  async createFuturesGuardrailPolicy(
    input: BitgetFuturesGuardrailPolicyInput
  ): Promise<MemoryRecord> {
    const policy = normalizePolicy(input);
    return this.memory.add({
      agentId: input.agentId,
      kind: "policy",
      title: input.title ?? "Bitget futures guardrails",
      content: {
        exchange: "bitget",
        surface: "bitget-agent-hub",
        policyType: "bitget_futures_guardrails",
        ...policy,
        notes: input.notes
      },
      tags: ["bitget", "policy", "futures", "guardrails"]
    });
  }

  async assessFuturesOrder(
    input: BitgetFuturesOrderIntentInput
  ): Promise<BitgetOrderRiskVerdict> {
    const policyMemory = await this.findLatestFuturesPolicy(input.agentId);
    const policy = normalizePolicy({
      agentId: input.agentId,
      ...(policyMemory?.content ?? {}),
      ...(input.policy ?? {})
    });
    const findings: RiskFinding[] = [];
    let requiresHuman = false;
    const proposedAt = input.proposedAt ?? new Date().toISOString();
    const symbol = normalizeSymbol(input.symbol);
    const referencePrice = resolveReferencePrice(input);
    const size = coerceNumber(input.size);
    const notionalUsd =
      referencePrice !== undefined && size !== undefined
        ? Math.abs(referencePrice * size)
        : undefined;

    if (
      policy.allowedProductTypes.length > 0 &&
      !policy.allowedProductTypes.includes(input.productType)
    ) {
      findings.push({
        code: "BITGET_PRODUCT_TYPE_NOT_ALLOWED",
        severity: "critical",
        message: `${input.productType} is outside the allowed Bitget product types.`
      });
    }

    if (
      policy.allowedSymbols.length > 0 &&
      !policy.allowedSymbols.map(normalizeSymbol).includes(symbol)
    ) {
      findings.push({
        code: "BITGET_SYMBOL_NOT_ALLOWED",
        severity: "critical",
        message: `${symbol} is outside the allowed Bitget symbols.`
      });
    }

    const leverage = coerceNumber(input.leverage);
    if (leverage !== undefined && leverage > policy.maxLeverage) {
      findings.push({
        code: "BITGET_LEVERAGE_LIMIT",
        severity: "critical",
        message: `Requested leverage ${leverage}x exceeds maxLeverage ${policy.maxLeverage}x.`
      });
    }

    if (referencePrice === undefined) {
      findings.push({
        code: "BITGET_REFERENCE_PRICE_MISSING",
        severity: "warning",
        message: "No limit price or recent Bitget ticker price was available for notional checks."
      });
      requiresHuman = true;
    }

    if (notionalUsd !== undefined && notionalUsd > policy.maxSingleOrderUsd) {
      findings.push({
        code: "BITGET_SINGLE_ORDER_NOTIONAL_LIMIT",
        severity: "critical",
        message: `Order notional ${formatUsd(notionalUsd)} exceeds maxSingleOrderUsd ${formatUsd(policy.maxSingleOrderUsd)}.`
      });
    }

    const existingExposureUsd = input.positionSnapshot
      ? calculateTotalExposureUsd(input.positionSnapshot)
      : undefined;
    const opensExposure = input.tradeSide !== "close" && input.reduceOnly !== true;
    if (
      existingExposureUsd !== undefined &&
      notionalUsd !== undefined &&
      opensExposure &&
      existingExposureUsd + notionalUsd > policy.maxTotalExposureUsd
    ) {
      findings.push({
        code: "BITGET_TOTAL_EXPOSURE_LIMIT",
        severity: "critical",
        message: `Projected exposure ${formatUsd(existingExposureUsd + notionalUsd)} exceeds maxTotalExposureUsd ${formatUsd(policy.maxTotalExposureUsd)}.`
      });
    }

    const fundingRateBps = normalizeFundingRateBps(input.marketSnapshot?.fundingRate);
    if (
      fundingRateBps !== undefined &&
      Math.abs(fundingRateBps) > policy.maxFundingRateBps
    ) {
      findings.push({
        code: "BITGET_FUNDING_RATE_LIMIT",
        severity: "warning",
        message: `Funding rate ${fundingRateBps.toFixed(2)} bps exceeds maxFundingRateBps ${policy.maxFundingRateBps}.`
      });
      requiresHuman = true;
    }

    if (
      input.marketSnapshot?.observedAt &&
      Date.parse(proposedAt) - Date.parse(input.marketSnapshot.observedAt) >
        policy.maxMarketDataAgeMs
    ) {
      findings.push({
        code: "BITGET_STALE_MARKET_DATA",
        severity: "warning",
        message: "Bitget market snapshot is older than the policy allows."
      });
      requiresHuman = true;
    }

    if (policy.readOnlyMcpRequired && input.readOnlyMcp !== true) {
      findings.push({
        code: "BITGET_READ_ONLY_MCP_NOT_CONFIRMED",
        severity: "warning",
        message: "The Bitget MCP session was not marked read-only for this review."
      });
      requiresHuman = true;
    }

    if (policy.requireHumanForWrites && input.humanConfirmed !== true) {
      findings.push({
        code: "BITGET_WRITE_REQUIRES_HUMAN",
        severity: "warning",
        message: "Bitget order placement requires explicit human confirmation by policy."
      });
      requiresHuman = true;
    }

    if (findings.length === 0) {
      findings.push({
        code: "BITGET_NO_BLOCKING_RISK_FOUND",
        severity: "info",
        message: "Bitget futures order matches the available guardrail policy."
      });
    }

    const riskScore = calculateRiskScore(findings);
    const decision = decideBitget(findings, riskScore, requiresHuman);
    const orderId = createId("bitget_order");
    const orderHash = hashJson({
      ...input,
      symbol,
      proposedAt
    });
    const reason = summarizeBitgetDecision(decision, findings);

    const report = await this.memory.add({
      agentId: input.agentId,
      kind: decision === "BLOCK" ? "blocked_action" : "risk_report",
      title: `Bitget ${decision}: ${input.intent ?? `${symbol} ${input.side}`}`,
      content: {
        exchange: "bitget",
        surface: "bitget-agent-hub",
        reportType: "bitget_futures_order_review",
        orderId,
        orderHash,
        proposedAt,
        symbol,
        productType: input.productType,
        side: input.side,
        tradeSide: input.tradeSide,
        orderType: input.orderType,
        marginCoin: input.marginCoin,
        size: String(input.size),
        price: input.price === undefined ? undefined : String(input.price),
        leverage: input.leverage === undefined ? undefined : String(input.leverage),
        notionalUsd,
        referencePrice,
        decision,
        riskScore,
        reason,
        findings,
        policy,
        matchedPolicyTitle: policyMemory?.title,
        rawOrder: input.rawOrder
      },
      tags: ["bitget", "futures", "order-review", decision.toLowerCase()]
    });

    return {
      orderId,
      orderHash,
      reportHash: report.hash,
      decision,
      riskScore,
      reason,
      notionalUsd,
      referencePrice,
      findings,
      matchedPolicyTitle: policyMemory?.title,
      report
    };
  }

  private async findLatestFuturesPolicy(agentId: string): Promise<MemoryRecord | undefined> {
    const policies = await this.memory.search({
      agentId,
      kinds: ["policy"],
      query: "bitget futures guardrails",
      limit: 10
    });

    return policies.find((policy) => {
      const content = policy.content as Record<string, unknown>;
      return content.exchange === "bitget" && content.policyType === "bitget_futures_guardrails";
    });
  }
}

export function createBitgetMcpCodexConfig(input: BitgetMcpConfigInput = {}) {
  const modules = input.modules ?? ["spot", "futures", "account"];
  const args = [
    "-y",
    "bitget-mcp-server",
    "--modules",
    modules === "all" ? "all" : modules.join(",")
  ];

  if (input.readOnly ?? true) {
    args.push("--read-only");
  }

  return {
    name: "bitget",
    command: "npx",
    args,
    env:
      input.includeCredentialEnv === false
        ? undefined
        : {
            BITGET_API_KEY: "your-api-key",
            BITGET_SECRET_KEY: "your-secret-key",
            BITGET_PASSPHRASE: "your-passphrase"
          }
  };
}

export function defaultBitgetFuturesPolicy(): BitgetFuturesGuardrailPolicy {
  return { ...DEFAULT_FUTURES_POLICY };
}

function normalizePolicy(
  input: Partial<BitgetFuturesGuardrailPolicy> & { agentId?: string }
): BitgetFuturesGuardrailPolicy {
  return {
    allowedSymbols: input.allowedSymbols?.map(normalizeSymbol) ?? DEFAULT_FUTURES_POLICY.allowedSymbols,
    allowedProductTypes: input.allowedProductTypes ?? DEFAULT_FUTURES_POLICY.allowedProductTypes,
    maxLeverage: positiveNumber(input.maxLeverage, DEFAULT_FUTURES_POLICY.maxLeverage),
    maxSingleOrderUsd: positiveNumber(
      input.maxSingleOrderUsd,
      DEFAULT_FUTURES_POLICY.maxSingleOrderUsd
    ),
    maxTotalExposureUsd: positiveNumber(
      input.maxTotalExposureUsd,
      DEFAULT_FUTURES_POLICY.maxTotalExposureUsd
    ),
    maxFundingRateBps: positiveNumber(
      input.maxFundingRateBps,
      DEFAULT_FUTURES_POLICY.maxFundingRateBps
    ),
    maxOpenInterestChangePct: positiveNumber(
      input.maxOpenInterestChangePct,
      DEFAULT_FUTURES_POLICY.maxOpenInterestChangePct
    ),
    maxMarketDataAgeMs: positiveNumber(
      input.maxMarketDataAgeMs,
      DEFAULT_FUTURES_POLICY.maxMarketDataAgeMs
    ),
    requireHumanForWrites:
      input.requireHumanForWrites ?? DEFAULT_FUTURES_POLICY.requireHumanForWrites,
    readOnlyMcpRequired:
      input.readOnlyMcpRequired ?? DEFAULT_FUTURES_POLICY.readOnlyMcpRequired
  };
}

function defaultMarketTools(productType: BitgetProductType): string[] {
  if (productType === "SPOT") {
    return ["spot_get_ticker", "spot_get_depth", "spot_get_candles"];
  }
  return [
    "futures_get_ticker",
    "futures_get_depth",
    "futures_get_funding_rate",
    "futures_get_open_interest"
  ];
}

function normalizeSymbol(symbol: string): string {
  return symbol.trim().toUpperCase();
}

function positiveNumber(value: unknown, fallback: number): number {
  const parsed = coerceNumber(value);
  return parsed !== undefined && parsed > 0 ? parsed : fallback;
}

function coerceNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

function sumNumbers(values: Array<number | undefined>): number {
  return values.reduce<number>((total, value) => total + (value ?? 0), 0);
}

function normalizeFundingRateBps(
  fundingRate: BitgetMarketSnapshotInput["fundingRate"] | undefined
): number | undefined {
  if (!fundingRate) return undefined;
  if (fundingRate.rateBps !== undefined) return fundingRate.rateBps;
  const rate = coerceNumber(fundingRate.rate);
  return rate === undefined ? undefined : rate * 10_000;
}

function calculateSpreadBps(input: BitgetMarketSnapshotInput): number | undefined {
  const bestBid = coerceNumber(input.depth?.bids?.[0]?.[0] ?? input.ticker?.bidPrice);
  const bestAsk = coerceNumber(input.depth?.asks?.[0]?.[0] ?? input.ticker?.askPrice);
  if (bestBid === undefined || bestAsk === undefined || bestBid <= 0 || bestAsk <= 0) {
    return undefined;
  }
  const mid = (bestBid + bestAsk) / 2;
  return ((bestAsk - bestBid) / mid) * 10_000;
}

function resolveReferencePrice(input: BitgetFuturesOrderIntentInput): number | undefined {
  return (
    coerceNumber(input.price) ??
    coerceNumber(input.marketSnapshot?.ticker?.markPrice) ??
    coerceNumber(input.marketSnapshot?.ticker?.lastPrice) ??
    coerceNumber(input.marketSnapshot?.ticker?.indexPrice) ??
    coerceNumber(input.marketSnapshot?.candles?.lastClose)
  );
}

function estimatePositionNotionalUsd(position: BitgetPosition): number | undefined {
  const total = coerceNumber(position.total);
  const price = coerceNumber(position.markPrice) ?? coerceNumber(position.avgOpenPrice);
  if (total === undefined || price === undefined) return undefined;
  return Math.abs(total * price);
}

function calculateTotalExposureUsd(snapshot: BitgetPositionSnapshotInput): number {
  return sumNumbers(
    snapshot.positions.map((position) =>
      coerceNumber(position.notionalUsd) ?? estimatePositionNotionalUsd(position)
    )
  );
}

function calculateRiskScore(findings: RiskFinding[]): number {
  const score = findings.reduce((total, finding) => {
    if (finding.severity === "critical") return total + 60;
    if (finding.severity === "warning") return total + 25;
    return total;
  }, 0);

  return Math.min(score, 100);
}

function decideBitget(
  findings: RiskFinding[],
  riskScore: number,
  requiresHuman: boolean
): RiskDecision {
  if (findings.some((finding) => finding.severity === "critical")) return "BLOCK";
  if (requiresHuman || riskScore >= 50) return "REQUIRE_HUMAN";
  if (findings.some((finding) => finding.severity === "warning")) return "WARN";
  return "ALLOW";
}

function summarizeBitgetDecision(decision: RiskDecision, findings: RiskFinding[]): string {
  if (decision === "ALLOW") return "Bitget order matches the available guardrail policy.";
  const important =
    findings.find((finding) => finding.severity === "critical") ??
    findings.find((finding) => finding.severity === "warning") ??
    findings[0];
  if (decision === "BLOCK") {
    return findings
      .filter((finding) => finding.severity === "critical")
      .slice(0, 3)
      .map((finding) => finding.message)
      .join(" ");
  }
  if (decision === "REQUIRE_HUMAN") {
    return `Human confirmation required: ${important.message}`;
  }
  return important.message;
}

function formatUsd(value: number): string {
  return `$${value.toLocaleString("en-US", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0
  })}`;
}
