import { BitMem } from "../src/index.js";

const mem = new BitMem();

const agentId = "trader-01";
const token = "0x1111111111111111111111111111111111111111";
const unknownSpender = "0x2222222222222222222222222222222222222222";

await mem.memory.add({
  agentId,
  kind: "policy",
  title: "Owner Risk Policy",
  content: {
    maxNativeValueWei: "0",
    allowedContracts: [token],
    trustedSpenders: []
  }
});

const unlimitedApprovalData =
  "0x095ea7b3" +
  "000000000000000000000000" +
  unknownSpender.slice(2) +
  "ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff";

const plan = {
  agentId,
  intent: "Approve USDC before depositing into a vault",
  txs: [
    {
      chainId: 16602,
      to: token,
      data: unlimitedApprovalData,
      value: "0"
    }
  ]
};

const context = await mem.context.forTradePlan(plan);
const verdict = await mem.risk.reviewPlan({ ...plan, context });
const proof = await mem.proofs.recordDecision({
  agentId,
  planHash: verdict.planHash,
  reportHash: verdict.reportHash,
  decision: verdict.decision
});

console.log(JSON.stringify({ verdict, proof }, null, 2));
