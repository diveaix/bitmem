import { readFile } from "node:fs/promises";
import { BitMem } from "../src/index.js";

export const demoMemoryPath = ".bit-mem/demo-memory.json";

export function createDemoSdk(): BitMem {
  return new BitMem({
    storage: {
      provider: "file",
      path: demoMemoryPath
    }
  });
}

export async function readJsonFile<T>(path: string): Promise<T> {
  return JSON.parse(await readFile(path, "utf8")) as T;
}

export function fixturePath(name: string): string {
  return `packages/sdk/examples/fixtures/${name}`;
}
