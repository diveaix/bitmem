# Live 0G Checklist

This repo is fully runnable in local/file mode. The following steps require live credentials, funded wallets, or deployed addresses.

## 1. Environment

Copy `.env.example` and fill the values:

```bash
OG_STORAGE_INDEXER_RPC=
OG_EVM_RPC=
OG_STORAGE_PRIVATE_KEY=
OG_COMPUTE_API_KEY=
OG_COMPUTE_BASE_URL=https://router-api.0g.ai/v1
OG_COMPUTE_MODEL=zai-org/GLM-5-FP8
AEGIS_REGISTRY_ADDRESS=
OG_CHAIN_PRIVATE_KEY=
```

Never commit `.env`.

## 2. 0G Compute Router

Checklist:

- visit `https://pc.0g.ai`
- connect wallet
- deposit 0G tokens to the Router balance
- create an API key starting with `sk-`
- set `OG_COMPUTE_API_KEY`

The 0G docs describe the Router as an OpenAI-compatible API gateway. Mainnet endpoint:

```text
https://router-api.0g.ai/v1
```

Testnet endpoint:

```text
https://router-api-testnet.integratenetwork.work/v1
```

Source: https://docs.0g.ai/developer-hub/building-on-0g/compute-network/router/overview

## 3. 0G Storage

Install optional live storage dependencies only when running live uploads:

```bash
npm install @0gfoundation/0g-storage-ts-sdk@1.2.10 ethers@^6.17.0
```

Set:

```bash
OG_STORAGE_INDEXER_RPC=<0g-storage-indexer-url>
OG_EVM_RPC=https://evmrpc-testnet.0g.ai
OG_STORAGE_PRIVATE_KEY=<funded-private-key>
```

Use SDK config:

```ts
const sdk = new BitMem({
  storage: {
    provider: "0g",
    indexerRpc: process.env.OG_STORAGE_INDEXER_RPC,
    evmRpc: process.env.OG_EVM_RPC,
    privateKey: process.env.OG_STORAGE_PRIVATE_KEY
  }
});
```

The official storage SDK dependency chain may introduce third-party audit advisories when installed. The core SDK keeps these packages optional so local development and tests stay clean.

Source: https://docs.0g.ai/developer-hub/building-on-0g/storage/sdk

## 4. 0G Chain Proof Registry

Contract:

```text
contracts/AegisProofRegistry.sol
```

0G contract deployment docs currently specify Cancun EVM compatibility and these network values:

```text
0G Galileo testnet RPC: https://evmrpc-testnet.0g.ai
0G Galileo testnet chain ID: 16602
0G mainnet RPC: https://evmrpc.0g.ai
0G mainnet chain ID: 16661
```

After deploying the registry, set:

```bash
AEGIS_REGISTRY_ADDRESS=<deployed-contract-address>
OG_CHAIN_PRIVATE_KEY=<funded-private-key>
```

Use SDK config:

```ts
const sdk = new BitMem({
  chain: {
    provider: "0g",
    rpcUrl: process.env.OG_EVM_RPC,
    registryAddress: process.env.AEGIS_REGISTRY_ADDRESS,
    privateKey: process.env.OG_CHAIN_PRIVATE_KEY
  }
});
```

Source: https://docs.0g.ai/developer-hub/building-on-0g/contracts-on-0g/deploy-contracts

## 5. Before The Hackathon Demo

Run:

```bash
npm run build
npm test
npm run api:smoke
npm audit --omit=dev
```

Then record these live artifacts if credentials are available:

- a 0G Storage root hash for one memory object
- a 0G Compute response in a risk report
- a 0G Chain transaction hash from `recordDecision`
