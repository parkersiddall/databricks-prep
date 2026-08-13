import type { z } from "zod";

import categoriesJson from "./categories.json";
import deaTestJson from "./databricks/data-engineer-associate/test.json";
import deaPracticeExam01Json from "./databricks/data-engineer-associate/practice-exams/practice-exam-01.json";
import deaPracticeExam02Json from "./databricks/data-engineer-associate/practice-exams/practice-exam-02.json";

import {
  CategoriesFileSchema,
  PracticeExamSchema,
  TestSchema,
  type Category,
  type PracticeExam,
  type Question,
  type Test,
} from "./schema";

/**
 * The single place content enters the app.
 *
 * JSON is imported statically rather than read from disk, so it is bundled and
 * type-checked, works under static export, and needs no filesystem access at
 * runtime. Everything is validated once at module load — an invalid file fails
 * the build instead of producing a wrong score mid-exam.
 *
 * To add a practice exam:  import it above, then add it to the owning entry in
 *                          `sources` below.
 * To add a test:           new folder with test.json + practice-exams/, a new
 *                          `sources` entry, and its id listed in categories.json.
 */
const sources: ReadonlyArray<{
  test: unknown;
  practiceExams: readonly unknown[];
}> = [
  {
    test: deaTestJson,
    practiceExams: [deaPracticeExam01Json, deaPracticeExam02Json],
  },
];

/** A test together with its category and its practice exams. */
export type TestNode = {
  test: Test;
  categorySlug: string;
  practiceExams: PracticeExam[];
};

type Registry = {
  categories: Category[];
  categoryBySlug: Map<string, Category>;
  testNodeById: Map<string, TestNode>;
  testNodesByCategorySlug: Map<string, TestNode[]>;
  practiceExamById: Map<string, PracticeExam>;
  /** Which test owns a given practice exam — the missed pool is test-scoped. */
  testIdByPracticeExamId: Map<string, string>;
  questionById: Map<string, Question>;
};

function fail(message: string): never {
  throw new Error(`[content] ${message}`);
}

function parseOrFail<T>(schema: z.ZodType<T>, value: unknown, label: string): T {
  const result = schema.safeParse(value);

  if (!result.success) {
    const details = result.error.issues
      .map((issue) => {
        const path = issue.path.join(".");
        return `  - ${path === "" ? "(root)" : path}: ${issue.message}`;
      })
      .join("\n");

    fail(`${label} failed validation:\n${details}`);
  }

  return result.data;
}

function build(): Registry {
  const categories = parseOrFail(
    CategoriesFileSchema,
    categoriesJson,
    "categories.json",
  );

  const categoryBySlug = new Map<string, Category>();
  for (const category of categories) {
    if (categoryBySlug.has(category.slug)) {
      fail(`duplicate category slug "${category.slug}"`);
    }
    categoryBySlug.set(category.slug, category);
  }

  // Which category claims each test, so tests can resolve their own URL prefix.
  const categorySlugByTestId = new Map<string, string>();
  for (const category of categories) {
    for (const testId of category.testIds) {
      const existing = categorySlugByTestId.get(testId);
      if (existing !== undefined) {
        fail(
          `test "${testId}" is listed under both "${existing}" and "${category.slug}"; a test belongs to exactly one category`,
        );
      }
      categorySlugByTestId.set(testId, category.slug);
    }
  }

  const testNodeById = new Map<string, TestNode>();
  const practiceExamById = new Map<string, PracticeExam>();
  const testIdByPracticeExamId = new Map<string, string>();
  const questionById = new Map<string, Question>();

  for (const source of sources) {
    const test = parseOrFail(TestSchema, source.test, "a test.json");

    if (testNodeById.has(test.id)) {
      fail(`duplicate test id "${test.id}"`);
    }

    const categorySlug = categorySlugByTestId.get(test.id);
    if (categorySlug === undefined) {
      fail(
        `test "${test.id}" is not listed in the testIds of any category in categories.json`,
      );
    }

    const domains = new Set(test.domains);
    const practiceExams: PracticeExam[] = [];
    const slugsSeen = new Set<string>();

    for (const rawPracticeExam of source.practiceExams) {
      const practiceExam = parseOrFail(
        PracticeExamSchema,
        rawPracticeExam,
        `a practice exam under test "${test.id}"`,
      );

      if (practiceExamById.has(practiceExam.id)) {
        fail(`duplicate practice exam id "${practiceExam.id}"`);
      }
      if (slugsSeen.has(practiceExam.slug)) {
        fail(
          `test "${test.id}" has two practice exams with slug "${practiceExam.slug}"`,
        );
      }
      slugsSeen.add(practiceExam.slug);

      for (const question of practiceExam.questions) {
        // Question ids key both saved progress and the test-wide missed pool, so
        // a collision across practice exams would silently merge two questions.
        const owner = questionById.get(question.id);
        if (owner !== undefined) {
          fail(
            `question id "${question.id}" is used by more than one practice exam; ids must be globally unique`,
          );
        }

        // A typo'd domain would otherwise show up as a phantom row in the
        // per-domain results breakdown.
        if (question.domain !== undefined && !domains.has(question.domain)) {
          fail(
            `question "${question.id}" has domain "${question.domain}", which is not one of the domains declared by test "${test.id}"`,
          );
        }

        questionById.set(question.id, question);
      }

      practiceExams.push(practiceExam);
      practiceExamById.set(practiceExam.id, practiceExam);
      testIdByPracticeExamId.set(practiceExam.id, test.id);
    }

    testNodeById.set(test.id, { test, categorySlug, practiceExams });
  }

  for (const [testId, categorySlug] of categorySlugByTestId) {
    if (!testNodeById.has(testId)) {
      fail(
        `category "${categorySlug}" lists test "${testId}", but no such test is registered in registry.ts`,
      );
    }
  }

  const testNodesByCategorySlug = new Map<string, TestNode[]>();
  for (const category of categories) {
    testNodesByCategorySlug.set(
      category.slug,
      category.testIds.map((testId) => testNodeById.get(testId)!),
    );
  }

  return {
    categories,
    categoryBySlug,
    testNodeById,
    testNodesByCategorySlug,
    practiceExamById,
    testIdByPracticeExamId,
    questionById,
  };
}

export const registry: Registry = build();
