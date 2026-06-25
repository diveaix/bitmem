# Supermemory Notes For BIT/MEM

Source reviewed:

- https://supermemory.ai/
- https://github.com/supermemoryai/supermemory

## Useful Patterns

Supermemory is useful as a reference because it packages memory as a developer primitive instead of just a database problem. The public README emphasizes:

- `add` for storing memories
- `profile` for stable facts plus recent context
- hybrid search across memories and documents
- local mode for self-hosted development
- MCP tools such as memory, recall, and context
- plugins for agent tools

## What BIT/MEM Takes From This

BIT/MEM adopts the ergonomics, not the product:

- `sdk.bitmem.memory.add(...)`
- `sdk.bitmem.profile.get(...)`
- `sdk.bitmem.context.forTradePlan(...)`
- local file mode for demos
- HTTP adapter that can later be wrapped by MCP

The key idea is one-call context before an agent takes action.

## What BIT/MEM Does Differently

BIT/MEM is operational infrastructure for trading agents, not a general personal memory app.

Differences:

- memory types are trading-agent specific
- risk review is a first-class module
- transaction calldata is decoded before execution
- failure reflection is tied to trade outcomes
- policy changes are not automatically accepted when they increase risk
- proof hashes can be anchored on 0G Chain
- memory artifacts can be stored on 0G Storage
- private reasoning can run through 0G Compute Router / Private Computer

## What We Should Not Build For This Hackathon

Do not build:

- a Supermemory UI clone
- a consumer personal memory product
- generic Gmail/Drive/Notion connectors
- a leaderboard for tracking other people's private agents
- a demo trading bot

Those would dilute the hackathon story. The sharp demo is: existing trading agents plug into BIT/MEM to remember, review, learn, and prove.

