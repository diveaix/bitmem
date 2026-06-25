import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createBitMemApi } from "../src/index.js";

const tempDir = await mkdtemp(join(tmpdir(), "bit-mem-api-smoke-"));
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
  const policy = await readJson("packages/sdk/examples/fixtures/policy.json");
  const strategy = await readJson("packages/sdk/examples/fixtures/strategy.json");
  const plan = await readJson("packages/sdk/examples/fixtures/risky-plan.json");
  const apiKey = await createApiKey(baseUrl);

  await postJson(`${baseUrl}/v1/memory`, policy, apiKey);
  await postJson(`${baseUrl}/v1/memory`, strategy, apiKey);
  const profile = await getJson(`${baseUrl}/v1/profile?agentId=trader-01&query=vault`, apiKey);
  const context = await postJson(`${baseUrl}/v1/context`, plan, apiKey);
  const review = await postJson(`${baseUrl}/v1/review-plan`, plan, apiKey);

  console.log(JSON.stringify({ profile, context, review }, null, 2));
} finally {
  await new Promise<void>((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve()))
  );
  await rm(tempDir, { recursive: true, force: true });
}

async function readJson(path: string): Promise<unknown> {
  return JSON.parse(await readFile(path, "utf8"));
}

async function createApiKey(baseUrl: string): Promise<string> {
  const login = await postJson(`${baseUrl}/auth/request-login`, {
    email: "smoke@example.com"
  }) as { devVerificationToken: string };
  const verifyResponse = await fetch(`${baseUrl}/auth/verify`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ token: login.devVerificationToken })
  });

  if (!verifyResponse.ok) {
    throw new Error(`verify failed with ${verifyResponse.status}: ${await verifyResponse.text()}`);
  }

  const cookie = verifyResponse.headers.get("set-cookie")?.split(";")[0] ?? "";
  const key = await postJson(
    `${baseUrl}/api-keys`,
    { name: "smoke key" },
    undefined,
    cookie
  ) as { secret: string };

  return key.secret;
}

async function postJson(
  url: string,
  body: unknown,
  apiKey?: string,
  cookie?: string
): Promise<unknown> {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
      ...(cookie ? { Cookie: cookie } : {})
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    throw new Error(`${url} failed with ${response.status}: ${await response.text()}`);
  }

  return response.json();
}

async function getJson(url: string, apiKey?: string): Promise<unknown> {
  const response = await fetch(url, {
    headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : undefined
  });

  if (!response.ok) {
    throw new Error(`${url} failed with ${response.status}: ${await response.text()}`);
  }

  return response.json();
}
