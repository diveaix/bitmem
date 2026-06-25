import type { TradePlan } from "../src/index.js";
import { createDemoSdk, fixturePath, readJsonFile } from "./shared.js";

const planPath = process.argv[2] ?? fixturePath("risky-plan.json");
const sdk = createDemoSdk();
const plan = await readJsonFile<TradePlan>(planPath);
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
      planPath,
      verdict,
      proof
    },
    null,
    2
  )
);
