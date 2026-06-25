import { describe, expect, it } from "vitest";
import { BitMem } from "../src/index.js";

describe("agent profile", () => {
  it("returns stable and dynamic agent memory in one call", async () => {
    const sdk = new BitMem();

    await sdk.bitmem.memory.add({
      agentId: "agent",
      kind: "skill",
      title: "Swap",
      content: { description: "Can build swap plans" }
    });
    await sdk.bitmem.memory.add({
      agentId: "agent",
      kind: "policy",
      title: "Conservative Policy",
      content: { maxTradeUsd: 500 }
    });
    await sdk.bitmem.memory.add({
      agentId: "agent",
      kind: "failure_lesson",
      title: "Avoid unknown vaults",
      content: { lesson: "Unknown vaults require human review" }
    });

    const profile = await sdk.bitmem.profile.get({
      agentId: "agent",
      query: "vaults"
    });

    expect(profile.summary.skills).toEqual(["Swap"]);
    expect(profile.summary.policies).toEqual(["Conservative Policy"]);
    expect(profile.summary.recentLessons).toEqual(["Avoid unknown vaults"]);
    expect(profile.searchResults.some((memory) => memory.title === "Avoid unknown vaults")).toBe(true);
  });
});
