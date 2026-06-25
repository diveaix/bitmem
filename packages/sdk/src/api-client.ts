import type {
  AgentProfile,
  ContextResult,
  MemoryInput,
  MemoryRecord,
  ProofRecordResult,
  RiskVerdict,
  TradePlan
} from "./types.js";

export type BitMemApiClientConfig = {
  baseUrl?: string;
  apiKey: string;
  fetchImpl?: typeof fetch;
};

export type ReviewPlanResult = {
  context: ContextResult;
  verdict: RiskVerdict;
  proof: ProofRecordResult;
};

export class BitMemApiClient {
  readonly memory = {
    add: (input: MemoryInput) =>
      this.request<{ memory: MemoryRecord }>("/v1/memory", {
        method: "POST",
        body: input
      }).then((result) => result.memory),
    search: (input: { agentId: string; query?: string; limit?: number }) => {
      const params = new URLSearchParams({
        agentId: input.agentId,
        limit: String(input.limit ?? 10)
      });
      if (input.query) {
        params.set("query", input.query);
      }
      return this.request<{ memories: MemoryRecord[] }>(
        `/v1/memory?${params.toString()}`
      ).then((result) => result.memories);
    },
    delete: (id: string) =>
      this.request<{ memory: MemoryRecord }>(
        `/v1/memory/${encodeURIComponent(id)}`,
        { method: "DELETE" }
      ).then((result) => result.memory)
  };

  readonly profile = {
    get: (input: { agentId: string; query?: string; limit?: number }) => {
      const params = new URLSearchParams({
        agentId: input.agentId,
        limit: String(input.limit ?? 10)
      });
      if (input.query) {
        params.set("query", input.query);
      }
      return this.request<{ profile: AgentProfile }>(
        `/v1/profile?${params.toString()}`
      ).then((result) => result.profile);
    }
  };

  readonly context = {
    forTradePlan: (input: TradePlan) =>
      this.request<{ context: ContextResult }>("/v1/context", {
        method: "POST",
        body: input
      }).then((result) => result.context)
  };

  readonly aegis = {
    risk: {
      reviewPlan: (input: TradePlan): Promise<ReviewPlanResult> =>
        this.request<ReviewPlanResult>("/v1/review-plan", {
          method: "POST",
          body: input
        })
    }
  };

  readonly trades = {
    recordOutcome: (input: {
      agentId: string;
      planId: string;
      txHashes: string[];
      status: "executed" | "failed" | "reverted" | "skipped";
      pnlUsd?: number;
      reason?: string;
      notes?: string;
    }) =>
      this.request<{ outcome: MemoryRecord }>("/v1/trades/outcome", {
        method: "POST",
        body: input
      }).then((result) => result.outcome)
  };

  readonly learning = {
    reflect: (input: { agentId: string; planId: string }) =>
      this.request<{ lesson: MemoryRecord }>("/v1/learning/reflect", {
        method: "POST",
        body: input
      }).then((result) => result.lesson)
  };

  private readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch;

  constructor(private readonly config: BitMemApiClientConfig) {
    this.baseUrl = (config.baseUrl ?? "http://127.0.0.1:8787").replace(/\/$/, "");
    this.fetchImpl = config.fetchImpl ?? fetch;
  }

  private async request<T>(
    path: string,
    init: { method?: string; body?: unknown } = {}
  ): Promise<T> {
    const response = await this.fetchImpl(`${this.baseUrl}${path}`, {
      method: init.method ?? "GET",
      headers: {
        Authorization: `Bearer ${this.config.apiKey}`,
        "Content-Type": "application/json"
      },
      body: init.body === undefined ? undefined : JSON.stringify(init.body)
    });

    const text = await response.text();
    const payload = text ? JSON.parse(text) : undefined;

    if (!response.ok) {
      const message =
        payload && typeof payload === "object" && "error" in payload
          ? String(payload.error)
          : `BIT/MEM API returned ${response.status}`;
      throw new Error(message);
    }

    return payload as T;
  }
}
