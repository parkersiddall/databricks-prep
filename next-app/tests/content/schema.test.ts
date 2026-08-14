import { describe, expect, it } from "vitest";

import {
  CategorySchema,
  PracticeExamSchema,
  QuestionSchema,
  TestSchema,
} from "@/content/schema";

const validQuestion = {
  id: "q-001",
  type: "single" as const,
  prompt: "Which directory holds the Delta transaction log?",
  options: [
    { id: "a", text: "_delta_log" },
    { id: "b", text: "_metadata" },
  ],
  correctOptionId: "a",
};

describe("QuestionSchema", () => {
  it("accepts a well-formed single-choice question", () => {
    expect(QuestionSchema.safeParse(validQuestion).success).toBe(true);
  });

  it("accepts an optional code snippet", () => {
    const result = QuestionSchema.safeParse({
      ...validQuestion,
      code: { language: "sql", source: "SELECT 1" },
    });

    expect(result.success).toBe(true);
  });

  it("accepts an optional documentationUrl", () => {
    const result = QuestionSchema.safeParse({
      ...validQuestion,
      documentationUrl: "https://docs.databricks.com/delta/index.html",
    });

    expect(result.success).toBe(true);
  });

  it("rejects a documentationUrl that is not a valid URL", () => {
    const result = QuestionSchema.safeParse({
      ...validQuestion,
      documentationUrl: "not-a-url",
    });

    expect(result.success).toBe(false);
  });

  // The two checks below are the answer-key guards. Without them a content typo
  // silently marks every attempt at the question wrong.
  it("rejects a correctOptionId that is not one of the options", () => {
    const result = QuestionSchema.safeParse({
      ...validQuestion,
      correctOptionId: "z",
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toContain("not one of its options");
  });

  it("rejects duplicate option ids", () => {
    const result = QuestionSchema.safeParse({
      ...validQuestion,
      options: [
        { id: "a", text: "_delta_log" },
        { id: "a", text: "_metadata" },
      ],
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toContain("duplicate option ids");
  });

  it("rejects a question with fewer than two options", () => {
    const result = QuestionSchema.safeParse({
      ...validQuestion,
      options: [{ id: "a", text: "_delta_log" }],
    });

    expect(result.success).toBe(false);
  });

  it("rejects an unknown question type", () => {
    const result = QuestionSchema.safeParse({ ...validQuestion, type: "essay" });

    expect(result.success).toBe(false);
  });
});

describe("PracticeExamSchema", () => {
  const validPracticeExam = {
    id: "pe-01",
    slug: "practice-exam-1",
    title: "Practice Exam 1",
    questions: [validQuestion],
  };

  it("accepts a well-formed practice exam", () => {
    expect(PracticeExamSchema.safeParse(validPracticeExam).success).toBe(true);
  });

  it("rejects repeated question ids within one exam", () => {
    const result = PracticeExamSchema.safeParse({
      ...validPracticeExam,
      questions: [validQuestion, { ...validQuestion }],
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toContain("repeats question id");
  });

  it("rejects a slug that is not lowercase-hyphenated", () => {
    const result = PracticeExamSchema.safeParse({
      ...validPracticeExam,
      slug: "Practice Exam 1",
    });

    expect(result.success).toBe(false);
  });

  it("rejects an exam with no questions", () => {
    const result = PracticeExamSchema.safeParse({
      ...validPracticeExam,
      questions: [],
    });

    expect(result.success).toBe(false);
  });
});

describe("TestSchema", () => {
  const validTest = {
    id: "t-01",
    slug: "data-engineer-associate",
    title: "Data Engineer Associate",
    defaultTimeLimitMinutes: 90,
    passingScorePct: 70,
    domains: ["Databricks Lakehouse Platform"],
  };

  it("accepts a well-formed test", () => {
    expect(TestSchema.safeParse(validTest).success).toBe(true);
  });

  it("rejects a passing score outside 0-100", () => {
    expect(
      TestSchema.safeParse({ ...validTest, passingScorePct: 140 }).success,
    ).toBe(false);
  });

  it("rejects a non-positive time limit", () => {
    expect(
      TestSchema.safeParse({ ...validTest, defaultTimeLimitMinutes: 0 }).success,
    ).toBe(false);
  });

  it("rejects a test with no domains", () => {
    expect(TestSchema.safeParse({ ...validTest, domains: [] }).success).toBe(
      false,
    );
  });
});

describe("CategorySchema", () => {
  it("requires at least one test id", () => {
    const result = CategorySchema.safeParse({
      id: "databricks",
      slug: "databricks",
      title: "Databricks",
      testIds: [],
    });

    expect(result.success).toBe(false);
  });
});
