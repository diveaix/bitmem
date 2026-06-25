import type { TradePlan } from "../src/index.js";
import { createDemoSdk, fixturePath, readJsonFile } from "./shared.js";

type OutcomeFixture = {
  agentId: string;
  txHashes: string[];
  status: "executed" | "failed" | "reverted" | "skipped";
  pnlUsd?: number;
  reason?: string;
};

const sdk = createDemoSdk();
const plan = await readJsonFile<TradePlan>(fixturePath("risky-plan.json"));
const context = await sdk.bitmem.context.forTradePlan(plan);
const verdict = await sdk.aegis.risk.reviewPlan({ ...plan, context });
const outcome = await readJsonFile<OutcomeFixture>(fixturePath("failed-outcome.json"));
const record = await sdk.trades.recordOutcome({
  ...outcome,
  planId: verdict.planId
});
const lesson = await sdk.learning.reflect({
  agentId: outcome.agentId,
  planId: verdict.planId
});

console.log(
  JSON.stringify(
    {
      outcome: {
        id: record.id,
        hash: record.hash
      },
      lesson: {
        id: lesson.id,
        hash: lesson.hash,
        content: lesson.content
      }
    },
    null,
    2
  )
);
