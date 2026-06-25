import type { MemoryInput, TradePlan } from "../src/index.js";
import { createDemoSdk, fixturePath, readJsonFile } from "./shared.js";

const sdk = createDemoSdk();

const policy = await readJsonFile<MemoryInput>(fixturePath("policy.json"));
const strategy = await readJsonFile<MemoryInput>(fixturePath("strategy.json"));
const plan = await readJsonFile<TradePlan>(fixturePath("risky-plan.json"));

await sdk.bitmem.memory.add(policy);
await sdk.bitmem.memory.add(strategy);

const context = await sdk.bitmem.context.forTradePlan(plan);
const verdict = await sdk.aegis.risk.reviewPlan({ ...plan, context });
const proof = await sdk.proofs.recordDecision({
  agentId: plan.agentId,
  planHash: verdict.planHash,
  reportHash: verdict.reportHash,
  decision: verdict.decision
});

console.log(
  JSON.stringify(
    {
      memoryPath: ".bit-mem/demo-memory.json",
      matchedMemories: verdict.matchedMemories,
      verdict,
      proof
    },
    null,
    2
  )
);
