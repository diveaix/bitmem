#!/usr/bin/env node
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createBitMemMcpServer } from "./create-server.js";

const server = createBitMemMcpServer({
  allowLocalFallback: true,
  apiBaseUrl:
    process.env.BITMEM_API_URL ??
    process.env.BIT_MEM_API_URL ??
    "http://127.0.0.1:8787",
  apiKey: process.env.BITMEM_API_KEY ?? process.env.BIT_MEM_API_KEY,
  memoryPath: process.env.BIT_MEM_MCP_MEMORY_PATH ?? ".bit-mem/mcp-memory.json"
});

const transport = new StdioServerTransport();
await server.connect(transport);
