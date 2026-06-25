# BIT/MEM Contracts

## AegisProofRegistry

`AegisProofRegistry.sol` anchors BIT/MEM decision artifacts on 0G Chain.

The SDK stores full memory and risk reports offchain, usually on 0G Storage. This contract records compact hashes:

- `agentId`
- `planHash`
- `reportHash`
- `decision`
- `recorder`
- `recordedAt`

0G Chain deployment notes:

- 0G Chain is EVM-compatible.
- Compile with Cancun EVM settings.
- Testnet RPC: `https://evmrpc-testnet.0g.ai`
- Testnet chain ID: `16602`
- Mainnet RPC: `https://evmrpc.0g.ai`
- Mainnet chain ID: `16661`

Reference: https://docs.0g.ai/developer-hub/building-on-0g/contracts-on-0g/deploy-contracts
