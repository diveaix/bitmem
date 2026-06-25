# BIT/MEM for Bitget AI Hackathon

## Track

Trading Infrastructure.

## One-Liner

BIT/MEM is a memory-backed risk and audit layer for Bitget AI trading agents: it turns Bitget MCP/CLI observations into persistent memory, reviews proposed futures orders against guardrails, and stores verifiable reports before execution.

## What We Added For Bitget AI

This version adds a Bitget infrastructure adapter to the existing BIT/MEM SDK.

The adapter supports:

- Bitget market snapshot memory from futures/spot ticker, depth, candles, funding, and open-interest data.
- Bitget account and futures position snapshot memory.
- Bitget MCP/CLI tool-call audit memory.
- Futures guardrail policies for Bitget agents.
- Deterministic pre-trade review for proposed Bitget futures orders.
- Safe default Codex MCP config for `bitget-mcp-server --read-only`.

## Why It Fits Track 2

Track 2 asks for foundational trading infrastructure such as monitoring dashboards, risk management modules, data SDKs, and backtesting/replay systems.

BIT/MEM is exactly that layer:

- It does not try to be a trading bot.
- It does not custody funds.
- It does not need wallet or exchange withdrawal access.
- It gives agents persistent operational memory.
- It gives operators an audit trail of what the agent saw and why it was allowed, warned, blocked, or escalated.

## Bitget AI Tools Used

The implementation is designed around Bitget Agent Hub:

- MCP server: `bitget-mcp-server`
- CLI path: `bgc`
- Default modules: `spot`, `futures`, `account`
- Optional modules: `margin`, `copytrading`, `convert`, `earn`, `p2p`, `broker`
- Read-only mode: `--read-only`
- Key market tools: `futures_get_ticker`, `futures_get_funding_rate`, `futures_get_open_interest`, `futures_get_depth`, `spot_get_ticker`, `spot_get_candles`
- Key private read tools for operators: `get_account_assets`, `futures_get_positions`, `futures_get_orders`, `futures_get_fills`

## Demo

Run:

```bash
npm install
npm run example:bitget
```

The demo:

1. Creates a Bitget futures guardrail policy.
2. Stores Bitget-style futures market and position snapshots.
3. Stores a Bitget MCP tool observation.
4. Reviews a proposed BTCUSDT futures order.
5. Blocks or escalates based on leverage, notional, funding, read-only status, and human-confirmation policy.
6. Stores the decision as memory for future context and audit.

## Safety Model

The recommended hackathon configuration is read-only by default:

```json
{
  "name": "bitget",
  "command": "npx",
  "args": ["-y", "bitget-mcp-server", "--modules", "spot,futures,account", "--read-only"]
}
```

Write/trade operations should require explicit human confirmation. Withdrawal permissions should not be enabled for agent demos.

## Source References

- Bitget AI Hackathon: https://www.bitget.com/activity-hub/hackathon
- Bitget Agent Hub: https://github.com/Bitget-AI/agent_hub
- Bitget MCP guide: https://www.bitget.com/academy/how-to-connect-bitget-mcp-to-claude-cursor-ai-agents-2026-setup-guide
- Bitget tools reference: https://raw.githubusercontent.com/Bitget-AI/agent_hub/main/docs/tools-reference.md
