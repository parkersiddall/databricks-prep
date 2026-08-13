import { describe, expect, it } from "vitest";

import {
  formatDuration,
  formatMinutes,
  formatPercent,
  joinMeta,
  parseInlineCode,
  pluralize,
} from "@/lib/format";

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

describe("formatDuration", () => {
  it("renders mm:ss with a zero-padded seconds field", () => {
    expect(formatDuration(65_000)).toBe("1:05");
    expect(formatDuration(9_000)).toBe("0:09");
  });

  it("widens to h:mm:ss past an hour", () => {
    expect(formatDuration(3_600_000)).toBe("1:00:00");
    expect(formatDuration(5_445_000)).toBe("1:30:45");
  });

  it("floors partial seconds rather than rounding up", () => {
    expect(formatDuration(1_999)).toBe("0:01");
  });

  // An expired timer must never render as negative.
  it("clamps negative input to zero", () => {
    expect(formatDuration(-5_000)).toBe("0:00");
  });
});

describe("formatPercent", () => {
  it("rounds to a whole percent", () => {
    expect(formatPercent(66.6667)).toBe("67%");
    expect(formatPercent(75)).toBe("75%");
  });
});

describe("parseInlineCode", () => {
  it("returns a single text segment when there is no code", () => {
    expect(parseInlineCode("plain prose")).toEqual([
      { type: "text", value: "plain prose" },
    ]);
  });

  it("splits a backticked span out of the surrounding text", () => {
    expect(parseInlineCode("look in `_delta_log` for it")).toEqual([
      { type: "text", value: "look in " },
      { type: "code", value: "_delta_log" },
      { type: "text", value: " for it" },
    ]);
  });

  it("handles several spans, including at the very start and end", () => {
    expect(parseInlineCode("`a` then `b`")).toEqual([
      { type: "code", value: "a" },
      { type: "text", value: " then " },
      { type: "code", value: "b" },
    ]);
  });

  // Must not swallow the rest of the string when a backtick is unbalanced.
  it("leaves an unmatched backtick as literal text", () => {
    expect(parseInlineCode("a ` dangling backtick")).toEqual([
      { type: "text", value: "a ` dangling backtick" },
    ]);
  });

  it("handles an empty string", () => {
    expect(parseInlineCode("")).toEqual([]);
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
