# Bitget AI Hackathon Track 2 Brief

## Positioning

BIT/MEM fits the Trading Infrastructure track because it is not an alpha bot. It is the memory, risk, monitoring, and audit layer that Bitget AI agents can call before and after they act.

Submission angle:

```text
BIT/MEM x Bitget Agent Hub: a memory-backed risk black box for Bitget AI trading agents.
```

## Bitget AI Tool Surface

Bitget Agent Hub exposes two integration paths:

- MCP server for Claude Code, Cursor, Codex, VS Code, Windsurf, and other MCP clients.
- CLI plus skills for shell-based agents.

The official module surface includes:

- Default modules: `spot`, `futures`, `account`.
- Optional modules: `margin`, `copytrading`, `convert`, `earn`, `p2p`, `broker`.
- Public market data tools: spot/futures ticker, depth, candles, trades, symbols/contracts, futures funding rates, and open interest.
- Private account/trading tools: balances, bills, spot/futures order placement, cancellation, fills, futures positions, leverage/config updates, transfers, deposits, withdrawals, margin, copy trading, convert, earn, P2P, and broker workflows.
- Safety mode: `--read-only` disables write/trade operations at the MCP server level.
- Skill Hub: macro, market-intel, news-briefing, sentiment, and technical-analysis skills.

Primary references:

- [Bitget AI Hackathon](https://www.bitget.com/activity-hub/hackathon)
- [Bitget Agent Hub](https://github.com/Bitget-AI/agent_hub)
- [Bitget MCP setup guide](https://www.bitget.com/academy/how-to-connect-bitget-mcp-to-claude-cursor-ai-agents-2026-setup-guide)
- [Bitget MCP tools reference](https://raw.githubusercontent.com/Bitget-AI/agent_hub/main/docs/tools-reference.md)

## Implemented In This Repo

New SDK module: `sdk.bitget`.

It adds:

- `rememberMarketSnapshot()` for Bitget spot/futures market observations.
- `rememberPositionSnapshot()` for Bitget account and futures exposure observations.
- `rememberToolObservation()` for raw MCP/CLI tool call audit entries.
- `createFuturesGuardrailPolicy()` for Bitget futures-specific risk policy memory.
- `assessFuturesOrder()` for deterministic pre-trade review of proposed Bitget futures orders.
- `createBitgetMcpCodexConfig()` for a safe default Codex MCP config using `bitget-mcp-server --read-only`.

Guardrail checks include:

- allowed symbols
- allowed product types
- max leverage
- max single-order notional
- max total exposure
- max funding-rate threshold
- stale market data
- read-only MCP confirmation
- explicit human confirmation for write/trade operations

Runnable demo:

```bash
npm run example:bitget
```

Demo story:

1. Seed Bitget futures guardrails as policy memory.
2. Store Bitget futures ticker, funding, open-interest, and position snapshots.
3. Review a proposed Bitget futures order.
4. Return `BLOCK`, `WARN`, `REQUIRE_HUMAN`, or `ALLOW`.
5. Store the review as auditable BIT/MEM memory.

## Recommended Product Additions

Highest value under a short deadline:

1. Bitget read-only MCP setup in the Connect page.
2. Bitget market/position memory ingestion in the SDK.
3. Bitget futures guardrail review.
4. Demo script that judges can run without live Bitget credentials.
5. Submission copy that names the official Bitget tools used.

Worth adding next if time remains:

1. A dashboard panel for Bitget snapshots and latest guardrail verdicts.
2. A candle replay helper that records signal context versus eventual outcome.
3. Account-risk heatmap from `futures_get_positions` plus `get_account_assets`.
4. Optional authenticated mode for read-only account snapshots.

Avoid for this submission:

- Autonomous live trading.
- Withdrawal/transfer flows.
- Copy trading execution.
- Any workflow that requires committing credentials or giving judges trade permissions.

Those are seductive, but they would increase risk and distract from the infrastructure track. Safer, clearer, and more defensible is: Bitget data and agent actions go in; memory, risk decisions, and audit reports come out.
