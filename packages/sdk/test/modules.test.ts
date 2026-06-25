import { describe, expect, it } from "vitest";
import { BitMem, BitMemCore, AegisModule } from "../src/index.js";

describe("SDK module boundaries", () => {
  it("exposes BIT/MEM core and Aegis as separate modules in one SDK", async () => {
    const sdk = new BitMem();

    expect(sdk.bitmem).toBeInstanceOf(BitMemCore);
    expect(sdk.aegis).toBeInstanceOf(AegisModule);
    expect(sdk.memory).toBe(sdk.bitmem.memory);
    expect(sdk.context).toBe(sdk.bitmem.context);
    expect(sdk.risk).toBe(sdk.aegis.risk);
  });
});
