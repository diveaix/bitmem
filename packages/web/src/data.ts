import type { LucideIcon } from "lucide-react";
import {
  Braces,
  Brain,
  CandlestickChart,
  Cpu,
  Database,
  GitBranch,
  KeyRound,
  Link2,
  Plug,
  ShieldCheck,
  TerminalSquare,
  Workflow,
  UserCircle2
} from "lucide-react";

export type Decision = "ALLOW" | "WARN" | "BLOCK" | "REQUIRE_HUMAN";

export type MemoryKind =
  | "agent_profile"
  | "skill"
  | "strategy"
  | "policy"
  | "trade_plan"
  | "executed_trade"
  | "risk_report"
  | "blocked_action"
  | "failure_lesson"
  | "human_feedback"
  | "protocol_profile";

export type MemorySource = "SDK" | "MCP" | "API" | "Manual";

export type MemoryNode = {
  id: string;
  kind: MemoryKind;
  title: string;
  detail: string;
  agentId: string;
  agentName: string;
  source: MemorySource;
  from: string;
  age: string;
  size: number;
  x: number;
  y: number;
  confidence: number;
  tags: string[];
  linked: string[];
  status: "synced" | "local";
};

export type ConnectionMethod = {
  id: "sdk" | "api" | "mcp" | "bitget";
  title: string;
  subtitle: string;
  icon: LucideIcon;
  command: string;
  bullets: string[];
};

export const kindLabels: Record<MemoryKind, string> = {
  agent_profile: "Agent profile",
  skill: "Skill",
  strategy: "Strategy",
  policy: "Policy",
  trade_plan: "Trade plan",
  executed_trade: "Executed trade",
  risk_report: "Risk report",
  blocked_action: "Blocked action",
  failure_lesson: "Failure lesson",
  human_feedback: "Human feedback",
  protocol_profile: "Protocol profile"
};

export const sourceMeta: Record<
  MemorySource,
  { label: string; color: string; soft: string; detail: string }
> = {
  SDK: {
    label: "SDK",
    color: "#7c3aed",
    soft: "rgba(124, 58, 237, 0.08)",
    detail: "native agent runtime"
  },
  MCP: {
    label: "MCP",
    color: "#9333ea",
    soft: "rgba(147, 51, 234, 0.08)",
    detail: "tool call from an LLM agent"
  },
  API: {
    label: "API",
    color: "#a855f7",
    soft: "rgba(168, 85, 247, 0.08)",
    detail: "HTTP service or worker"
  },
  Manual: {
    label: "Manual",
    color: "#ea580c",
    soft: "rgba(234, 88, 12, 0.08)",
    detail: "operator dashboard entry"
  }
};

export const agentOptions = [
  { id: "agent-bitget-01", name: "Bitget Sentinel" },
  { id: "agent-futures-02", name: "Futures Guard" },
  { id: "agent-market-03", name: "Market Memory" }
];

export const stackItems = [
  {
    title: "0G Storage",
    detail: "Durable Bitget snapshots, guardrail policies, order reviews, outcomes, and agent profiles.",
    icon: Database
  },
  {
    title: "0G Compute",
    detail: "Private reasoning path for risk explanations, blocked-order reflection, and policy summaries.",
    icon: Cpu
  },
  {
    title: "0G Chain",
    detail: "Compact proof hashes for guardrail decisions, report integrity, and memory provenance.",
    icon: KeyRound
  },
  {
    title: "Bitget Agent Hub",
    detail: "Read-only Bitget MCP plus SDK, REST, and BIT/MEM MCP entry points for agent workflows.",
    icon: TerminalSquare
  }
];

export const connectionMethods: ConnectionMethod[] = [
  {
    id: "sdk",
    title: "TypeScript SDK",
    subtitle: "Best for teams wrapping Bitget Agent Hub from Node or a TypeScript execution service.",
    icon: Braces,
    command: "npm install @bit-mem/sdk",
    bullets: [
      "Write Bitget snapshots and guardrails from the agent runtime",
      "Fetch policy and context before a futures order handoff",
      "Record outcomes, blocked actions, and review reports"
    ]
  },
  {
    id: "mcp",
    title: "Streamable HTTP MCP",
    subtitle: "Best for Codex, Claude, and LLM agents that need BIT/MEM tools beside Bitget tools.",
    icon: Plug,
    command: "https://bit-mem-backend-production.up.railway.app/mcp",
    bullets: [
      "Paste one HTTPS URL into the MCP client",
      "Use the agent API key as the bearer token",
      "Expose memory, context, guardrail review, outcomes, and reflection tools"
    ]
  },
  {
    id: "api",
    title: "REST API",
    subtitle: "Best for Python agents, monitoring workers, notebooks, and hosted risk services.",
    icon: Link2,
    command: "https://bit-mem-backend-production.up.railway.app/v1",
    bullets: [
      "POST /memory",
      "GET /profile and POST /context",
      "POST /review-plan and POST /learning/reflect"
    ]
  },
  {
    id: "bitget",
    title: "Bitget Agent Hub",
    subtitle: "Best for Bitget AI agents that need read-only market context, futures guardrails, and audit memory.",
    icon: CandlestickChart,
    command: "npx -y bitget-mcp-server --modules spot,futures,account --read-only",
    bullets: [
      "Ingest Bitget ticker, funding, open-interest, account, and position snapshots",
      "Review futures order intents against guardrails before execution",
      "Keep write/trade workflows behind explicit human confirmation"
    ]
  }
];

export const demoPlan = {
  agentId: "agent-bitget-01",
  intent: "Review sample approval before Bitget handoff",
  txs: [
    {
      chainId: 16602,
      to: "0x1111111111111111111111111111111111111111",
      data: "0x095ea7b30000000000000000000000002222222222222222222222222222222222222222ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff",
      value: "0",
      label: "Sample blocked approval for guardrail demo"
    }
  ],
  metadata: { source: "web-dashboard-demo" }
};

export const productPillars = [
  {
    title: "Bitget memory before action",
    body: "The agent retrieves market snapshots, futures exposure, guardrails, prior reviews, and blocked actions before an order handoff.",
    icon: Database
  },
  {
    title: "Guardrails around execution",
    body: "Aegis reviews Bitget futures order intents and returns ALLOW, WARN, BLOCK, or REQUIRE_HUMAN without placing trades itself.",
    icon: ShieldCheck
  },
  {
    title: "Audit after outcomes",
    body: "Blocked actions, handoffs, failures, and human feedback are stored as reusable evidence for future Bitget reviews.",
    icon: GitBranch
  }
];

/* ── New data for supermemory-style landing ────────────── */

export type ProductFeature = {
  id: string;
  num: string;
  title: string;
  headline: string;
  body: string;
  icon: LucideIcon;
};

export const productFeatures: ProductFeature[] = [
  {
    id: "memory",
    num: "01",
    title: "Memory",
    headline: "Persistent Bitget context",
    body: "Bitget ticker, funding, open-interest, account, position, guardrail, and review records are stored and retrieved before every order decision.",
    icon: Brain
  },
  {
    id: "aegis",
    num: "02",
    title: "Aegis Risk",
    headline: "Pre-handoff safety review",
    body: "Every Bitget futures order intent passes through leverage, notional, exposure, funding, stale-data, and human-confirmation checks.",
    icon: ShieldCheck
  },
  {
    id: "learning",
    num: "03",
    title: "Learning",
    headline: "Structured risk reflection",
    body: "Blocked or skipped Bitget actions produce reusable lessons, suggested guardrail updates, and human-approval flags.",
    icon: GitBranch
  },
  {
    id: "proofs",
    num: "04",
    title: "Proofs",
    headline: "Verifiable audit trail on 0G Chain",
    body: "Decision hashes, Bitget risk reports, and memory artifacts can be anchored on-chain so operators can verify the review trail.",
    icon: KeyRound
  },
  {
    id: "profiles",
    num: "05",
    title: "Profiles",
    headline: "One-call Bitget agent state",
    body: "Retrieve the agent's profile plus recent Bitget market, position, policy, and review context in a single call.",
    icon: UserCircle2
  },
  {
    id: "context",
    num: "06",
    title: "Context",
    headline: "Relevant guardrail context",
    body: "Before a futures order is reviewed, the context module retrieves matching policies, exposure snapshots, market state, and prior risk reports.",
    icon: Workflow
  }
];

export type ComparisonRow = {
  aspect: string;
  legacy: string;
  bitmem: string;
};

export const comparisonRows: ComparisonRow[] = [
  { aspect: "Market context", legacy: "Forgotten MCP responses", bitmem: "Persistent Bitget snapshots" },
  { aspect: "Futures risk", legacy: "Ad hoc order checks", bitmem: "Leverage, notional, exposure, and funding guardrails" },
  { aspect: "Execution", legacy: "Agent can jump straight to write tools", bitmem: "Dry-run handoff gated by ALLOW or human review" },
  { aspect: "Audit", legacy: "No durable trail", bitmem: "Stored risk reports and proof hashes" },
  { aspect: "Storage", legacy: "Local logs or dashboards only", bitmem: "0G-backed memory artifacts" },
  { aspect: "Privacy", legacy: "Risk reasoning exposed in app logs", bitmem: "Private reasoning via 0G Router" }
];

export type HowItWorksStep = {
  num: string;
  title: string;
  body: string;
};

export const howItWorksSteps: HowItWorksStep[] = [
  { num: "1", title: "Connect Bitget", body: "Start Bitget Agent Hub read-only and initialize the BIT/MEM SDK or MCP layer." },
  { num: "2", title: "Capture snapshots", body: "Store ticker, funding, open-interest, account, position, and tool-call observations." },
  { num: "3", title: "Review order", body: "Submit a Bitget futures order intent. Aegis checks policy, exposure, and market context." },
  { num: "4", title: "Handoff or stop", body: "Return ALLOW, WARN, BLOCK, or REQUIRE_HUMAN before any Bitget write operation." },
  { num: "5", title: "Record & audit", body: "Store the report, outcome, human feedback, and proof hashes for future reviews." }
];
