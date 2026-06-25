export { BitMem } from "./client.js";
export { BitMemApiClient } from "./api-client.js";
export { AegisModule } from "./aegis.js";
export {
  BitgetInfraClient,
  createBitgetMcpCodexConfig,
  defaultBitgetFuturesPolicy
} from "./bitget.js";
export {
  LocalComputeClient,
  ZeroGComputeClient,
  createComputeFromConfig
} from "./compute.js";
export { BitMemCore, createStorageFromConfig } from "./bitmem.js";
export { InMemoryStorage, JsonFileStorage, createMemoryRecord } from "./storage.js";
export { ZeroGStorageAdapter, createZeroGStorageAdapter } from "./storage-0g.js";
export { MemoryClient } from "./memory.js";
export { ContextClient } from "./context.js";
export { ProfileClient } from "./profile.js";
export { AegisRiskClient } from "./risk.js";
export { decodeTransaction, MAX_UINT_256, SELECTORS } from "./decoder.js";
export { TradesClient } from "./trades.js";
export { LearningClient } from "./learning.js";
export { memoryInputSchema, tradePlanSchema, transactionSchema } from "./types.js";
export {
  AEGIS_PROOF_REGISTRY_ABI,
  LocalProofRecorder,
  ProofsClient,
  ZeroGChainProofRecorder,
  createProofRecorderFromConfig
} from "./proofs.js";
export type {
  BitgetFuturesGuardrailPolicy,
  BitgetFuturesGuardrailPolicyInput,
  BitgetFuturesOrderIntentInput,
  BitgetMarketSnapshotInput,
  BitgetMcpConfigInput,
  BitgetMcpModule,
  BitgetObservationSource,
  BitgetOrderRiskVerdict,
  BitgetPosition,
  BitgetPositionSnapshotInput,
  BitgetProductType,
  BitgetToolObservationInput,
  BitgetToolRisk
} from "./bitget.js";
export type {
  ContextResult,
  AgentProfile,
  DecodedActionKind,
  DecodedTransaction,
  MemoryInput,
  MemoryKind,
  MemoryRecord,
  RiskDecision,
  RiskFinding,
  RiskSeverity,
  RiskVerdict,
  PrivateReasoning,
  ProofRecordInput,
  ProofRecordResult,
  TradePlan,
  TransactionRequest,
  BitMemConfig
} from "./types.js";
export type { ReviewPlanResult, BitMemApiClientConfig } from "./api-client.js";
