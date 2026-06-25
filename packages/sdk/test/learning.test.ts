import { describe, expect, it } from "vitest";
import { BitMem } from "../src/index.js";

describe("learning reflections", () => {
  it("stores a failure lesson with private reasoning metadata", async () => {
    const sdk = new BitMem();

    await sdk.trades.recordOutcome({
      agentId: "agent",
      planId: "plan_123",
      txHashes: ["0xabc"],
      status: "failed",
      pnlUsd: -12,
      reason: "High slippage"
    });

    const lesson = await sdk.learning.reflect({
      agentId: "agent",
      planId: "plan_123"
    });

    expect(lesson.kind).toBe("failure_lesson");
    expect(lesson.content).toMatchObject({
      planId: "plan_123",
      requiresHumanApproval: true
    });
    expect(
      (lesson.content.privateReasoning as { provider: string }).provider
    ).toBe("local");
  });
});
