import type { PrivateReasoning, BitMemConfig } from "./types.js";

export type ComputePurpose = "risk_review" | "failure_reflection";

export type ComputePrompt = {
  purpose: ComputePurpose;
  system: string;
  user: string;
};

export interface ComputeClient {
  generate(prompt: ComputePrompt): Promise<PrivateReasoning>;
}

export class LocalComputeClient implements ComputeClient {
  async generate(prompt: ComputePrompt): Promise<PrivateReasoning> {
    return {
      provider: "local",
      model: "local-deterministic",
      summary: summarizeLocally(prompt)
    };
  }
}

export type ZeroGComputeClientOptions = {
  apiKey: string;
  baseUrl?: string;
  model?: string;
};

export class ZeroGComputeClient implements ComputeClient {
  private readonly baseUrl: string;
  private readonly model: string;

  constructor(private readonly options: ZeroGComputeClientOptions) {
    this.baseUrl = stripTrailingSlash(
      options.baseUrl ?? "https://router-api.0g.ai/v1"
    );
    this.model = options.model ?? "zai-org/GLM-5-FP8";
  }

  async generate(prompt: ComputePrompt): Promise<PrivateReasoning> {
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.options.apiKey}`
      },
      body: JSON.stringify({
        model: this.model,
        temperature: 0.1,
        messages: [
          {
            role: "system",
            content: prompt.system
          },
          {
            role: "user",
            content: prompt.user
          }
        ]
      })
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(
        `0G Compute request failed with ${response.status}: ${body}`
      );
    }

    const json = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const summary = json.choices?.[0]?.message?.content?.trim();

    if (!summary) {
      throw new Error("0G Compute response did not include message content.");
    }

    return {
      provider: "0g",
      model: this.model,
      summary,
      raw: json
    };
  }
}

export function createComputeFromConfig(
  compute: BitMemConfig["compute"] = { provider: "local" }
): ComputeClient {
  if (compute.provider === "local") {
    return new LocalComputeClient();
  }

  if (!compute.apiKey) {
    throw new Error("0G compute requires apiKey in compute config.");
  }

  return new ZeroGComputeClient({
    apiKey: compute.apiKey,
    baseUrl: compute.baseUrl,
    model: compute.model
  });
}

function summarizeLocally(prompt: ComputePrompt): string {
  if (prompt.purpose === "risk_review") {
    return "Local deterministic review completed. Use 0G Compute credentials for private AI reasoning.";
  }

  return "Local deterministic reflection completed. Use 0G Compute credentials for private failure analysis.";
}

function stripTrailingSlash(value: string): string {
  return value.endsWith("/") ? value.slice(0, -1) : value;
}
