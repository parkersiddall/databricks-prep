import { describe, expect, it } from "vitest";

import type { Question } from "@/content/schema";
import {
  isAnswerCorrect,
  scoreAttempt,
  type AnswerValue,
} from "@/lib/grading";

function question(
  id: string,
  correctOptionId: string,
  domain?: string,
): Question {
  return {
    id,
    type: "single",
    prompt: `Prompt ${id}`,
    domain,
    options: [
      { id: "a", text: "A" },
      { id: "b", text: "B" },
      { id: "c", text: "C" },
    ],
    correctOptionId,
  };
}

const single = (optionId: string): AnswerValue => ({ type: "single", optionId });

describe("isAnswerCorrect", () => {
  it("accepts the correct option", () => {
    expect(isAnswerCorrect(question("q1", "b"), single("b"))).toBe(true);
  });

  it("rejects a wrong option", () => {
    expect(isAnswerCorrect(question("q1", "b"), single("c"))).toBe(false);
  });

  it("treats an unanswered question as incorrect", () => {
    expect(isAnswerCorrect(question("q1", "b"), undefined)).toBe(false);
  });
});

describe("scoreAttempt", () => {
  const questions = [
    question("q1", "a", "Platform"),
    question("q2", "b", "Platform"),
    question("q3", "c", "Governance"),
    question("q4", "a", "Governance"),
  ];

  it("counts correct answers and computes the percentage", () => {
    const result = scoreAttempt(
      questions,
      { q1: single("a"), q2: single("b"), q3: single("a"), q4: single("a") },
      { passingScorePct: 70 },
    );

    expect(result.correctCount).toBe(3);
    expect(result.total).toBe(4);
    expect(result.answeredCount).toBe(4);
    expect(result.scorePct).toBe(75);
    expect(result.passed).toBe(true);
  });

  it("counts blanks as incorrect but not as answered", () => {
    const result = scoreAttempt(
      questions,
      { q1: single("a"), q2: single("b") },
      { passingScorePct: 70 },
    );

    expect(result.correctCount).toBe(2);
    expect(result.answeredCount).toBe(2);
    expect(result.total).toBe(4);
    expect(result.scorePct).toBe(50);
    expect(result.passed).toBe(false);
  });

  it("passes exactly at the threshold", () => {
    const result = scoreAttempt(
      questions,
      { q1: single("a"), q2: single("b"), q3: single("c") },
      { passingScorePct: 75 },
    );

    expect(result.scorePct).toBe(75);
    expect(result.passed).toBe(true);
  });

  // Rounding here would turn a near miss into a pass, so the exact value is kept.
  it("does not round the score up into a pass", () => {
    const threeOfFour = [
      question("a1", "a"),
      question("a2", "a"),
      question("a3", "a"),
    ];

    const result = scoreAttempt(
      threeOfFour,
      { a1: single("a"), a2: single("a"), a3: single("b") },
      { passingScorePct: 70 },
    );

    expect(result.scorePct).toBeCloseTo(66.667, 3);
    expect(result.passed).toBe(false);
  });

  it("reports per-question outcomes in exam order", () => {
    const result = scoreAttempt(
      questions,
      { q2: single("a") },
      { passingScorePct: 70 },
    );

    expect(result.perQuestion.map((outcome) => outcome.questionId)).toEqual([
      "q1",
      "q2",
      "q3",
      "q4",
    ]);
    expect(result.perQuestion[0]).toMatchObject({
      answered: false,
      correct: false,
    });
    expect(result.perQuestion[1]).toMatchObject({
      answered: true,
      correct: false,
      answer: { type: "single", optionId: "a" },
    });
  });

  it("breaks results down by domain", () => {
    const result = scoreAttempt(
      questions,
      { q1: single("a"), q2: single("b"), q3: single("a"), q4: single("a") },
      { passingScorePct: 70 },
    );

    expect(result.byDomain).toEqual([
      { domain: "Platform", correctCount: 2, total: 2, scorePct: 100 },
      { domain: "Governance", correctCount: 1, total: 2, scorePct: 50 },
    ]);
  });

  it("omits questions with no domain from the breakdown but still totals them", () => {
    const result = scoreAttempt(
      [question("q1", "a", "Platform"), question("q2", "a")],
      { q1: single("a"), q2: single("a") },
      { passingScorePct: 70 },
    );

    expect(result.total).toBe(2);
    expect(result.byDomain).toEqual([
      { domain: "Platform", correctCount: 1, total: 1, scorePct: 100 },
    ]);
  });

  it("handles an empty question list without dividing by zero", () => {
    const result = scoreAttempt([], {}, { passingScorePct: 70 });

    expect(result).toMatchObject({
      correctCount: 0,
      total: 0,
      scorePct: 0,
      passed: false,
    });
    expect(result.byDomain).toEqual([]);
  });

  it("ignores answers for questions not in the attempt", () => {
    const result = scoreAttempt(
      [question("q1", "a")],
      { q1: single("a"), qStale: single("a") },
      { passingScorePct: 70 },
    );

    expect(result.total).toBe(1);
    expect(result.correctCount).toBe(1);
  });
});
