import { describe, expect, it } from "vitest";

import { shuffle } from "@/lib/shuffle";

/** Deterministic stand-in for Math.random, cycling through fixed draws. */
function sequence(draws: readonly number[]): () => number {
  let index = 0;
  return () => draws[index++ % draws.length];
}

describe("shuffle", () => {
  it("keeps every element exactly once", () => {
    const items = ["a", "b", "c", "d", "e"];

    expect([...shuffle(items)].sort()).toEqual([...items].sort());
  });

  it("leaves the input array untouched", () => {
    const items = ["a", "b", "c"];
    shuffle(items);

    expect(items).toEqual(["a", "b", "c"]);
  });

  it("produces the permutation the draws dictate", () => {
    // Fisher-Yates walks index 3 -> 1. Drawing 0 every time swaps each of those
    // with the head, which is a fully determined result.
    expect(shuffle(["a", "b", "c", "d"], sequence([0]))).toEqual([
      "b",
      "c",
      "d",
      "a",
    ]);
  });

  it("leaves the order alone when every draw picks the element in place", () => {
    // random() just under 1 makes `swap` equal `index` at every step.
    const items = ["a", "b", "c", "d"];

    expect(shuffle(items, sequence([0.999999]))).toEqual(items);
  });

  it("handles empty and single-element inputs", () => {
    expect(shuffle([])).toEqual([]);
    expect(shuffle(["only"])).toEqual(["only"]);
  });
});
