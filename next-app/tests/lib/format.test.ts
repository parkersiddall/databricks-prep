import { describe, expect, it } from "vitest";

import { formatMinutes, joinMeta, pluralize } from "@/lib/format";

describe("pluralize", () => {
  it("uses the singular for exactly one", () => {
    expect(pluralize(1, "question")).toBe("1 question");
  });

  it("uses the plural for zero and many", () => {
    expect(pluralize(0, "question")).toBe("0 questions");
    expect(pluralize(6, "question")).toBe("6 questions");
  });

  it("accepts an irregular plural", () => {
    expect(pluralize(2, "entry", "entries")).toBe("2 entries");
  });
});

describe("formatMinutes", () => {
  it("keeps sub-hour values in minutes", () => {
    expect(formatMinutes(45)).toBe("45 min");
  });

  it("renders whole hours without a minute part", () => {
    expect(formatMinutes(120)).toBe("2 hr");
  });

  it("renders hours and minutes together", () => {
    expect(formatMinutes(90)).toBe("1 hr 30 min");
  });
});

describe("joinMeta", () => {
  it("joins parts with a middle dot", () => {
    expect(joinMeta("6 questions", "90 min")).toBe("6 questions · 90 min");
  });

  it("drops falsy parts so callers can inline conditionals", () => {
    expect(joinMeta("6 questions", false, undefined, "70% to pass")).toBe(
      "6 questions · 70% to pass",
    );
  });
});
