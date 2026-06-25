import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, describe, expect, it } from "vitest";
import { createBitMemApi } from "./index.js";

let tempDir: string | undefined;

afterEach(async () => {
  if (tempDir) {
    await rm(tempDir, { recursive: true, force: true });
    tempDir = undefined;
  }
});

describe("BIT/MEM API", () => {
  it("requires API key ownership for memory and review routes", async () => {
    tempDir = await mkdtemp(join(tmpdir(), "bit-mem-api-"));
    const server = createBitMemApi({
      authPath: join(tempDir, "auth.json"),
      memoryPath: join(tempDir, "memory.json")
    });
    await new Promise<void>((resolve) => server.listen(0, resolve));

    try {
      const address = server.address();
      if (address === null || typeof address === "string") {
        throw new Error("Expected TCP server address");
      }
      const baseUrl = `http://127.0.0.1:${address.port}`;
      const firstKey = await createApiKey(baseUrl, "first@example.com");
      const secondKey = await createApiKey(baseUrl, "second@example.com");
      const token = "0x1111111111111111111111111111111111111111";
      const spender = "0x2222222222222222222222222222222222222222";

      const unauthenticatedResponse = await fetch(`${baseUrl}/memory`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentId: "agent",
          kind: "policy",
          title: "Policy",
          content: {}
        })
      });
      expect(unauthenticatedResponse.status).toBe(401);

      const memoryResponse = await fetch(`${baseUrl}/v1/memory`, {
        method: "POST",
        headers: authorizedHeaders(firstKey),
        body: JSON.stringify({
          agentId: "agent",
          kind: "policy",
          title: "Policy",
          content: {
            maxNativeValueWei: "0",
            allowedContracts: [token],
            trustedSpenders: [],
            maxTokenApprovalAmount: "10"
          }
        })
      });
      const memory = (await memoryResponse.json()) as {
        memory: { id: string; agentId: string; title: string };
      };
      expect(memoryResponse.status).toBe(201);
      expect(memory.memory.agentId).toBe("agent");

      const allMemoryResponse = await fetch(`${baseUrl}/v1/memory?limit=20`, {
        headers: { Authorization: `Bearer ${firstKey}` }
      });
      const allMemory = (await allMemoryResponse.json()) as {
        memories: Array<{ agentId: string; title: string }>;
      };
      expect(allMemoryResponse.status).toBe(200);
      expect(allMemory.memories).toEqual([
        expect.objectContaining({ agentId: "agent", title: "Policy" })
      ]);

      const isolatedMemoryResponse = await fetch(`${baseUrl}/v1/memory?limit=20`, {
        headers: { Authorization: `Bearer ${secondKey}` }
      });
      const isolatedMemory = (await isolatedMemoryResponse.json()) as {
        memories: Array<{ agentId: string; title: string }>;
      };
      expect(isolatedMemoryResponse.status).toBe(200);
      expect(isolatedMemory.memories).toEqual([]);

      const forbiddenDeleteResponse = await fetch(
        `${baseUrl}/v1/memory/${encodeURIComponent(memory.memory.id)}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${secondKey}` }
        }
      );
      expect(forbiddenDeleteResponse.status).toBe(404);

      const firstProfileResponse = await fetch(
        `${baseUrl}/v1/profile?agentId=agent&query=Policy`,
        { headers: { Authorization: `Bearer ${firstKey}` } }
      );
      const firstProfile = (await firstProfileResponse.json()) as {
        profile: { summary: { policies: string[] } };
      };
      expect(firstProfileResponse.status).toBe(200);
      expect(firstProfile.profile.summary.policies).toEqual(["Policy"]);

      const secondProfileResponse = await fetch(
        `${baseUrl}/v1/profile?agentId=agent&query=Policy`,
        { headers: { Authorization: `Bearer ${secondKey}` } }
      );
      const secondProfile = (await secondProfileResponse.json()) as {
        profile: { summary: { policies: string[] } };
      };
      expect(secondProfileResponse.status).toBe(200);
      expect(secondProfile.profile.summary.policies).toEqual([]);

      const data =
        "0x095ea7b3" +
        "000000000000000000000000" +
        spender.slice(2) +
        "ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff";
      const plan = {
        agentId: "agent",
        intent: "approve risky spender",
        txs: [
          {
            chainId: 16602,
            to: token,
            data,
            value: "0"
          }
        ],
        metadata: {}
      };

      const reviewResponse = await fetch(`${baseUrl}/v1/review-plan`, {
        method: "POST",
        headers: authorizedHeaders(firstKey),
        body: JSON.stringify(plan)
      });
      const review = (await reviewResponse.json()) as {
        context: { memories: Array<{ agentId: string; title: string }> };
        verdict: { decision: string; decodedTransactions: Array<{ kind: string }> };
        proof: { provider: string };
      };

      expect(reviewResponse.status).toBe(200);
      expect(review.context.memories[0]?.agentId).toBe("agent");
      expect(review.verdict.decision).toBe("BLOCK");
      expect(review.verdict.decodedTransactions[0]?.kind).toBe("erc20_approve");
      expect(review.proof.provider).toBe("local");

      const deleteResponse = await fetch(
        `${baseUrl}/v1/memory/${encodeURIComponent(memory.memory.id)}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${firstKey}` }
        }
      );
      const deleted = (await deleteResponse.json()) as {
        memory: { id: string; agentId: string };
      };
      expect(deleteResponse.status).toBe(200);
      expect(deleted.memory.id).toBe(memory.memory.id);
      expect(deleted.memory.agentId).toBe("agent");

      const afterDeleteResponse = await fetch(`${baseUrl}/v1/memory?limit=20`, {
        headers: { Authorization: `Bearer ${firstKey}` }
      });
      const afterDelete = (await afterDeleteResponse.json()) as {
        memories: Array<{ id: string }>;
      };
      expect(afterDelete.memories.some((item) => item.id === memory.memory.id)).toBe(false);
    } finally {
      await new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve()))
      );
    }
  });
});

async function createApiKey(baseUrl: string, email: string): Promise<string> {
  const loginResponse = await fetch(`${baseUrl}/auth/request-login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email })
  });
  const login = (await loginResponse.json()) as { devVerificationToken: string };
  expect(loginResponse.status).toBe(200);

  const verifyResponse = await fetch(`${baseUrl}/auth/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token: login.devVerificationToken })
  });
  expect(verifyResponse.status).toBe(200);
  const cookie = verifyResponse.headers.get("set-cookie")?.split(";")[0];
  expect(cookie).toBeTruthy();

  const keyResponse = await fetch(`${baseUrl}/api-keys`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookie ?? ""
    },
    body: JSON.stringify({ name: "test key" })
  });
  const key = (await keyResponse.json()) as { secret: string };
  expect(keyResponse.status).toBe(201);
  return key.secret;
}

function authorizedHeaders(apiKey: string) {
  return {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json"
  };
}
