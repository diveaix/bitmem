import { LearningClient } from "./learning.js";
import { AegisModule } from "./aegis.js";
import { BitgetInfraClient } from "./bitget.js";
import { createComputeFromConfig } from "./compute.js";
import type { ComputeClient } from "./compute.js";
import { createStorageFromConfig, BitMemCore } from "./bitmem.js";
import { createProofRecorderFromConfig, ProofsClient } from "./proofs.js";
import type { AegisRiskClient } from "./risk.js";
import type { ContextClient } from "./context.js";
import type { MemoryClient } from "./memory.js";
import type { ProfileClient } from "./profile.js";
import type { MemoryStorage } from "./storage.js";
import { TradesClient } from "./trades.js";
import type { BitMemConfig } from "./types.js";

export class BitMem {
  readonly bitmem: BitMemCore;
  readonly aegis: AegisModule;
  readonly memory: MemoryClient;
  readonly context: ContextClient;
  readonly profile: ProfileClient;
  readonly risk: AegisRiskClient;
  readonly trades: TradesClient;
  readonly learning: LearningClient;
  readonly proofs: ProofsClient;
  readonly bitget: BitgetInfraClient;
  private readonly compute: ComputeClient;

  constructor(
    readonly config: BitMemConfig = {},
    storage: MemoryStorage = createStorageFromConfig(config.storage),
    compute: ComputeClient = createComputeFromConfig(config.compute)
  ) {
    this.bitmem = new BitMemCore(storage);
    this.compute = compute;
    this.aegis = new AegisModule(
      this.bitmem.memory,
      this.bitmem.context,
      this.compute
    );
    this.memory = this.bitmem.memory;
    this.context = this.bitmem.context;
    this.profile = this.bitmem.profile;
    this.risk = this.aegis.risk;
    this.trades = new TradesClient(this.memory);
    this.learning = new LearningClient(this.memory, this.compute);
    this.proofs = new ProofsClient(createProofRecorderFromConfig(config.chain));
    this.bitget = new BitgetInfraClient(this.memory);
  }
}
