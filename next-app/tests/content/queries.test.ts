import { describe, expect, it } from "vitest";

import {
  getCategories,
  getCategoryBySlug,
  getPracticeExamBySlug,
  getPracticeExamsForTest,
  getQuestionsByIds,
  getQuestionsForTest,
  getTestBySlug,
  getTimeLimitMinutes,
  listPracticeExamParams,
  listTestParams,
} from "@/content/queries";

/**
 * Exercised against the real seeded content, so these double as a check that
 * the registry's load-time validation passed.
 */

const CATEGORY_SLUG = "databricks";
const TEST_SLUG = "data-engineer-associate";

describe("registry invariants over the seeded content", () => {
  it("loads at least one category", () => {
    expect(getCategories().length).toBeGreaterThan(0);
  });

  it("gives the test more than one practice exam", () => {
    const test = getTestBySlug(CATEGORY_SLUG, TEST_SLUG);
    expect(test).toBeDefined();

    // A test owning many practice exams is the core relationship; keeping two in
    // the seed data means the listing and routing code is exercised for real.
    expect(getPracticeExamsForTest(test!.id).length).toBeGreaterThan(1);
  });

  it("keeps question ids unique across every practice exam", () => {
    const test = getTestBySlug(CATEGORY_SLUG, TEST_SLUG)!;
    const ids = getQuestionsForTest(test.id).map((question) => question.id);

    expect(new Set(ids).size).toBe(ids.length);
  });

  it("only uses domains declared by the owning test", () => {
    const test = getTestBySlug(CATEGORY_SLUG, TEST_SLUG)!;
    const declared = new Set(test.domains);

    for (const question of getQuestionsForTest(test.id)) {
      if (question.domain !== undefined) {
        expect(declared).toContain(question.domain);
      }
    }
  });

  it("points every question's correctOptionId at a real option", () => {
    const test = getTestBySlug(CATEGORY_SLUG, TEST_SLUG)!;

    for (const question of getQuestionsForTest(test.id)) {
      const optionIds = question.options.map((option) => option.id);
      expect(optionIds).toContain(question.correctOptionId);
    }
  });
});

describe("lookups", () => {
  it("resolves a category by slug and returns undefined for an unknown one", () => {
    expect(getCategoryBySlug(CATEGORY_SLUG)?.slug).toBe(CATEGORY_SLUG);
    expect(getCategoryBySlug("nope")).toBeUndefined();
  });

  it("resolves a practice exam by test id and slug", () => {
    const test = getTestBySlug(CATEGORY_SLUG, TEST_SLUG)!;
    const practiceExam = getPracticeExamBySlug(test.id, "practice-exam-1");

    expect(practiceExam?.slug).toBe("practice-exam-1");
    expect(getPracticeExamBySlug(test.id, "practice-exam-99")).toBeUndefined();
  });

  it("falls back to the test's default time limit", () => {
    const test = getTestBySlug(CATEGORY_SLUG, TEST_SLUG)!;
    const [practiceExam] = getPracticeExamsForTest(test.id);

    expect(getTimeLimitMinutes(practiceExam.id)).toBe(
      test.defaultTimeLimitMinutes,
    );
  });

  it("returns null for the time limit of an unknown practice exam", () => {
    expect(getTimeLimitMinutes("does-not-exist")).toBeNull();
  });
});

describe("getQuestionsByIds", () => {
  it("preserves the requested order", () => {
    const test = getTestBySlug(CATEGORY_SLUG, TEST_SLUG)!;
    const all = getQuestionsForTest(test.id);
    const requested = [all[2].id, all[0].id, all[1].id];

    expect(getQuestionsByIds(requested).map((q) => q.id)).toEqual(requested);
  });

  it("skips ids that no longer exist", () => {
    const test = getTestBySlug(CATEGORY_SLUG, TEST_SLUG)!;
    const [first] = getQuestionsForTest(test.id);

    // A saved session can outlive the content it referenced.
    expect(getQuestionsByIds([first.id, "removed-question"]).map((q) => q.id)).toEqual([
      first.id,
    ]);
  });
});

describe("route param helpers", () => {
  it("lists one entry per test and per practice exam", () => {
    expect(listTestParams()).toEqual([
      { category: CATEGORY_SLUG, test: TEST_SLUG },
    ]);

    const practiceExamParams = listPracticeExamParams();
    expect(practiceExamParams.length).toBeGreaterThan(1);
    expect(practiceExamParams[0]).toEqual({
      category: CATEGORY_SLUG,
      test: TEST_SLUG,
      practiceExam: "practice-exam-1",
    });
  });
});
