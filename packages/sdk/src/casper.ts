import { createId, hashJson } from "./hash.js";
import type { MemoryClient } from "./memory.js";
import type { MemoryRecord, RiskDecision, RiskFinding } from "./types.js";

export type CasperAgentActionSurface =
  | "x402"
  | "mcp"
  | "cspr-trade"
  | "odra"
  | "manual";

export type CasperAgentActionType =
  | "x402_payment"
  | "defi_swap"
  | "liquidity_action"
  | "contract_deploy"
  | "rwa_attestation"
  | "chain_query"
  | "tool_call";

export type CasperMcpRisk = "read" | "write" | "danger";

export type CasperAgentGuardrailPolicy = {
  allowedServices: string[];
  allowedMcpServers: string[];
  maxSpendPerRequestUsd: number;
  maxSessionSpendUsd: number;
  maxRequestsPerSession: number;
  maxQuoteAgeMs: number;
  requireHumanForX402AboveUsd: number;
  requireHumanForDeFiWrites: boolean;
  requireHumanForContractDeploys: boolean;
  blockDangerousMcpTools: boolean;
};

export type CasperAgentGuardrailPolicyInput = Partial<CasperAgentGuardrailPolicy> & {
  agentId: string;
  title?: string;
  notes?: string;
};

export type CasperX402QuoteInput = {
  agentId: string;
  service: string;
  endpoint: string;
  amountUsd?: string | number;
  amountCspr?: string | number;
  currency?: "CSPR" | "USDC" | string;
  facilitator?: string;
  observedAt?: string;
  expiresAt?: string;
  raw?: Record<string, unknown>;
};

export type CasperMcpObservationInput = {
  agentId: string;
  server: string;
  tool: string;
  risk: CasperMcpRisk;
  observedAt?: string;
  request?: Record<string, unknown>;
  response?: Record<string, unknown>;
  summary?: string;
};

export type CasperAgentActionReviewInput = {
  agentId: string;
  intent?: string;
  surface: CasperAgentActionSurface;
  actionType: CasperAgentActionType;
  service?: string;
  endpoint?: string;
  paymentUsd?: string | number;
  sessionSpendUsd?: string | number;
  requestsInSession?: number;
  quoteObservedAt?: string;
  mcpServer?: string;
  mcpTool?: string;
  mcpRisk?: CasperMcpRisk;
  readOnlyMcp?: boolean;
  humanConfirmed?: boolean;
  proposedAt?: string;
  policy?: Partial<CasperAgentGuardrailPolicy>;
  rawAction?: Record<string, unknown>;
};

export type CasperAgentActionVerdict = {
  actionId: string;
  actionHash: string;
  reportHash: string;
  decision: RiskDecision;
  riskScore: number;
  reason: string;
  findings: RiskFinding[];
  matchedPolicyTitle?: string;
  report: MemoryRecord;
};

const DEFAULT_CASPER_POLICY: CasperAgentGuardrailPolicy = {
  allowedServices: [],
  allowedMcpServers: [],
  maxSpendPerRequestUsd: 5,
  maxSessionSpendUsd: 25,
  maxRequestsPerSession: 20,
  maxQuoteAgeMs: 5 * 60 * 1000,
  requireHumanForX402AboveUsd: 1,
  requireHumanForDeFiWrites: true,
  requireHumanForContractDeploys: true,
  blockDangerousMcpTools: true
};

export class CasperAgentInfraClient {
  constructor(private readonly memory: MemoryClient) {}

  async createAgentGuardrailPolicy(
    input: CasperAgentGuardrailPolicyInput
  ): Promise<MemoryRecord> {
    const policy = normalizePolicy(input);
    return this.memory.add({
      agentId: input.agentId,
      kind: "policy",
      title: input.title ?? "Casper agent x402 and MCP guardrails",
      content: {
        network: "casper",
        surface: "casper-ai-toolkit",
        policyType: "casper_agent_guardrails",
        ...policy,
        notes: input.notes
      },
      tags: ["casper", "policy", "x402", "mcp", "agent-guardrails"]
    });
  }

  async rememberX402Quote(input: CasperX402QuoteInput): Promise<MemoryRecord> {
    const observedAt = input.observedAt ?? new Date().toISOString();
    const service = normalizeName(input.service);
    return this.memory.add({
      agentId: input.agentId,
      kind: "protocol_profile",
      title: `Casper x402 quote: ${service} ${input.endpoint}`,
      content: {
        network: "casper",
        surface: "x402",
        snapshotType: "payment_quote",
        service,
        endpoint: input.endpoint,
        amountUsd: coerceNumber(input.amountUsd),
        amountCspr: input.amountCspr === undefined ? undefined : String(input.amountCspr),
        currency: input.currency ?? "CSPR",
        facilitator: input.facilitator ?? "casper-x402",
        observedAt,
        expiresAt: input.expiresAt,
        raw: input.raw
      },
      tags: ["casper", "x402", "payment-quote", service]
    });
  }

  async rememberMcpObservation(input: CasperMcpObservationInput): Promise<MemoryRecord> {
    const observedAt = input.observedAt ?? new Date().toISOString();
    const server = normalizeName(input.server);
    return this.memory.add({
      agentId: input.agentId,
      kind: input.risk === "read" ? "protocol_profile" : "risk_report",
      title: `Casper MCP ${server}.${input.tool} ${input.risk} observation`,
      content: {
        network: "casper",
        surface: "mcp",
        snapshotType: "tool_observation",
        observedAt,
        server,
        tool: input.tool,
        risk: input.risk,
        request: input.request,
        response: input.response,
        summary: input.summary
      },
      tags: ["casper", "mcp", "tool-observation", server, input.risk]
    });
  }

  async assessAgentAction(
    input: CasperAgentActionReviewInput
  ): Promise<CasperAgentActionVerdict> {
    const policyMemory = await this.findLatestPolicy(input.agentId);
    const policy = normalizePolicy({
      agentId: input.agentId,
      ...(policyMemory?.content ?? {}),
      ...(input.policy ?? {})
    });
    const findings: RiskFinding[] = [];
    let requiresHuman = false;
    const proposedAt = input.proposedAt ?? new Date().toISOString();
    const paymentUsd = coerceNumber(input.paymentUsd);
    const service = input.service ? normalizeName(input.service) : undefined;
    const mcpServer = input.mcpServer ? normalizeName(input.mcpServer) : undefined;

    if (
      service &&
      policy.allowedServices.length > 0 &&
      !policy.allowedServices.map(normalizeName).includes(service)
    ) {
      findings.push({
        code: "CASPER_SERVICE_NOT_ALLOWED",
        severity: "critical",
        message: `${service} is outside the allowed Casper x402 services.`
      });
    }

    if (
      mcpServer &&
      policy.allowedMcpServers.length > 0 &&
      !policy.allowedMcpServers.map(normalizeName).includes(mcpServer)
    ) {
      findings.push({
        code: "CASPER_MCP_SERVER_NOT_ALLOWED",
        severity: "critical",
        message: `${mcpServer} is outside the allowed Casper MCP servers.`
      });
    }

    if (input.actionType === "x402_payment") {
      if (paymentUsd === undefined) {
        findings.push({
          code: "CASPER_X402_AMOUNT_MISSING",
          severity: "warning",
          message: "No USD-equivalent x402 payment amount was available for spend checks."
        });
        requiresHuman = true;
      } else {
        if (paymentUsd > policy.maxSpendPerRequestUsd) {
          findings.push({
            code: "CASPER_X402_REQUEST_SPEND_LIMIT",
            severity: "critical",
            message: `x402 payment ${formatUsd(paymentUsd)} exceeds maxSpendPerRequestUsd ${formatUsd(policy.maxSpendPerRequestUsd)}.`
          });
        }
        if (paymentUsd > policy.requireHumanForX402AboveUsd) {
          findings.push({
            code: "CASPER_X402_HUMAN_THRESHOLD",
            severity: "warning",
            message: `x402 payment ${formatUsd(paymentUsd)} exceeds the human-review threshold ${formatUsd(policy.requireHumanForX402AboveUsd)}.`
          });
          requiresHuman = true;
        }
      }

      const sessionSpendUsd = coerceNumber(input.sessionSpendUsd);
      if (sessionSpendUsd !== undefined && sessionSpendUsd > policy.maxSessionSpendUsd) {
        findings.push({
          code: "CASPER_X402_SESSION_SPEND_LIMIT",
          severity: "critical",
          message: `Projected session spend ${formatUsd(sessionSpendUsd)} exceeds maxSessionSpendUsd ${formatUsd(policy.maxSessionSpendUsd)}.`
        });
      }

      if (
        input.requestsInSession !== undefined &&
        input.requestsInSession > policy.maxRequestsPerSession
      ) {
        findings.push({
          code: "CASPER_X402_REQUEST_COUNT_LIMIT",
          severity: "warning",
          message: `Session request count ${input.requestsInSession} exceeds maxRequestsPerSession ${policy.maxRequestsPerSession}.`
        });
        requiresHuman = true;
      }

      if (
        input.quoteObservedAt &&
        Date.parse(proposedAt) - Date.parse(input.quoteObservedAt) > policy.maxQuoteAgeMs
      ) {
        findings.push({
          code: "CASPER_X402_STALE_QUOTE",
          severity: "warning",
          message: "The x402 payment quote is older than the policy allows."
        });
        requiresHuman = true;
      }
    }

    const mcpRisk = input.mcpRisk;
    if (mcpRisk === "danger" && policy.blockDangerousMcpTools) {
      findings.push({
        code: "CASPER_DANGEROUS_MCP_TOOL",
        severity: "critical",
        message: "The selected Casper MCP tool was marked dangerous by the agent runtime."
      });
    }

    if ((mcpRisk === "write" || mcpRisk === "danger") && input.humanConfirmed !== true) {
      findings.push({
        code: "CASPER_MCP_WRITE_REQUIRES_HUMAN",
        severity: "warning",
        message: "Casper MCP write actions require explicit human confirmation."
      });
      requiresHuman = true;
    }

    if (input.readOnlyMcp === false && mcpRisk !== "read") {
      findings.push({
        code: "CASPER_MCP_READ_ONLY_NOT_CONFIRMED",
        severity: "warning",
        message: "The MCP session was not marked read-only for this review."
      });
      requiresHuman = true;
    }

    if (
      (input.actionType === "defi_swap" || input.actionType === "liquidity_action") &&
      policy.requireHumanForDeFiWrites &&
      input.humanConfirmed !== true
    ) {
      findings.push({
        code: "CASPER_DEFI_WRITE_REQUIRES_HUMAN",
        severity: "warning",
        message: "Casper DeFi write actions require human confirmation by policy."
      });
      requiresHuman = true;
    }

    if (
      input.actionType === "contract_deploy" &&
      policy.requireHumanForContractDeploys &&
      input.humanConfirmed !== true
    ) {
      findings.push({
        code: "CASPER_CONTRACT_DEPLOY_REQUIRES_HUMAN",
        severity: "warning",
        message: "Casper contract deploys require human confirmation by policy."
      });
      requiresHuman = true;
    }

    if (findings.length === 0) {
      findings.push({
        code: "CASPER_NO_BLOCKING_RISK_FOUND",
        severity: "info",
        message: "Casper agent action matches the available guardrail policy."
      });
    }

    const riskScore = calculateRiskScore(findings);
    const decision = decide(findings, riskScore, requiresHuman);
    const actionId = createId("casper_action");
    const actionHash = hashJson({
      ...input,
      service,
      mcpServer,
      proposedAt
    });
    const reason = summarizeDecision(decision, findings);

    const report = await this.memory.add({
      agentId: input.agentId,
      kind: decision === "BLOCK" ? "blocked_action" : "risk_report",
      title: `Casper ${decision}: ${input.intent ?? input.actionType}`,
      content: {
        network: "casper",
        surface: input.surface,
        reportType: "casper_agent_action_review",
        actionId,
        actionHash,
        proposedAt,
        actionType: input.actionType,
        intent: input.intent,
        service,
        endpoint: input.endpoint,
        paymentUsd,
        sessionSpendUsd: coerceNumber(input.sessionSpendUsd),
        requestsInSession: input.requestsInSession,
        mcpServer,
        mcpTool: input.mcpTool,
        mcpRisk,
        readOnlyMcp: input.readOnlyMcp,
        humanConfirmed: input.humanConfirmed,
        decision,
        riskScore,
        reason,
        findings,
        policy,
        matchedPolicyTitle: policyMemory?.title,
        rawAction: input.rawAction
      },
      tags: ["casper", input.surface, "agent-action-review", decision.toLowerCase()]
    });

    return {
      actionId,
      actionHash,
      reportHash: report.hash,
      decision,
      riskScore,
      reason,
      findings,
      matchedPolicyTitle: policyMemory?.title,
      report
    };
  }

  private async findLatestPolicy(agentId: string): Promise<MemoryRecord | undefined> {
    const policies = await this.memory.search({
      agentId,
      kinds: ["policy"],
      query: "casper agent x402 mcp guardrails",
      limit: 10
    });

    return policies.find((policy) => {
      const content = policy.content as Record<string, unknown>;
      return content.network === "casper" && content.policyType === "casper_agent_guardrails";
    });
  }
}

export function defaultCasperAgentPolicy(): CasperAgentGuardrailPolicy {
  return { ...DEFAULT_CASPER_POLICY };
}

function normalizePolicy(
  input: Partial<CasperAgentGuardrailPolicy> & { agentId?: string }
): CasperAgentGuardrailPolicy {
  return {
    allowedServices:
      input.allowedServices?.map(normalizeName) ?? DEFAULT_CASPER_POLICY.allowedServices,
    allowedMcpServers:
      input.allowedMcpServers?.map(normalizeName) ?? DEFAULT_CASPER_POLICY.allowedMcpServers,
    maxSpendPerRequestUsd: positiveNumber(
      input.maxSpendPerRequestUsd,
      DEFAULT_CASPER_POLICY.maxSpendPerRequestUsd
    ),
    maxSessionSpendUsd: positiveNumber(
      input.maxSessionSpendUsd,
      DEFAULT_CASPER_POLICY.maxSessionSpendUsd
    ),
    maxRequestsPerSession: positiveNumber(
      input.maxRequestsPerSession,
      DEFAULT_CASPER_POLICY.maxRequestsPerSession
    ),
    maxQuoteAgeMs: positiveNumber(input.maxQuoteAgeMs, DEFAULT_CASPER_POLICY.maxQuoteAgeMs),
    requireHumanForX402AboveUsd: positiveNumber(
      input.requireHumanForX402AboveUsd,
      DEFAULT_CASPER_POLICY.requireHumanForX402AboveUsd
    ),
    requireHumanForDeFiWrites:
      input.requireHumanForDeFiWrites ?? DEFAULT_CASPER_POLICY.requireHumanForDeFiWrites,
    requireHumanForContractDeploys:
      input.requireHumanForContractDeploys ??
      DEFAULT_CASPER_POLICY.requireHumanForContractDeploys,
    blockDangerousMcpTools:
      input.blockDangerousMcpTools ?? DEFAULT_CASPER_POLICY.blockDangerousMcpTools
  };
}

function normalizeName(value: string): string {
  return value.trim().toLowerCase();
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

function calculateRiskScore(findings: RiskFinding[]): number {
  const score = findings.reduce((total, finding) => {
    if (finding.severity === "critical") return total + 60;
    if (finding.severity === "warning") return total + 25;
    return total;
  }, 0);

  return Math.min(score, 100);
}

function decide(
  findings: RiskFinding[],
  riskScore: number,
  requiresHuman: boolean
): RiskDecision {
  if (findings.some((finding) => finding.severity === "critical")) return "BLOCK";
  if (requiresHuman || riskScore >= 50) return "REQUIRE_HUMAN";
  if (findings.some((finding) => finding.severity === "warning")) return "WARN";
  return "ALLOW";
}

function summarizeDecision(decision: RiskDecision, findings: RiskFinding[]): string {
  if (decision === "ALLOW") return "Casper agent action matches the guardrail policy.";
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
