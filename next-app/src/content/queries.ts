import { registry, type TestNode } from "./registry";
import type { Category, PracticeExam, Question, Test } from "./schema";

/**
 * Read-only accessors over the validated registry. Pages and components go
 * through these rather than touching `registry` directly, so the storage shape
 * stays an implementation detail.
 *
 * Lookups that cannot resolve return `undefined`; callers on route paths should
 * translate that into `notFound()`.
 */

export function getCategories(): readonly Category[] {
  return registry.categories;
}

export function getCategoryBySlug(categorySlug: string): Category | undefined {
  return registry.categoryBySlug.get(categorySlug);
}

export function getTestsForCategory(categorySlug: string): readonly Test[] {
  const nodes = registry.testNodesByCategorySlug.get(categorySlug) ?? [];
  return nodes.map((node) => node.test);
}

export function getTestById(testId: string): Test | undefined {
  return registry.testNodeById.get(testId)?.test;
}

export function getTestBySlug(
  categorySlug: string,
  testSlug: string,
): Test | undefined {
  const nodes = registry.testNodesByCategorySlug.get(categorySlug) ?? [];
  return nodes.find((node) => node.test.slug === testSlug)?.test;
}

/** The category a test belongs to — needed to build links back up the tree. */
export function getCategorySlugForTest(testId: string): string | undefined {
  return registry.testNodeById.get(testId)?.categorySlug;
}

export function getPracticeExamsForTest(
  testId: string,
): readonly PracticeExam[] {
  return registry.testNodeById.get(testId)?.practiceExams ?? [];
}

export function getPracticeExamById(
  practiceExamId: string,
): PracticeExam | undefined {
  return registry.practiceExamById.get(practiceExamId);
}

export function getPracticeExamBySlug(
  testId: string,
  practiceExamSlug: string,
): PracticeExam | undefined {
  return registry.testNodeById
    .get(testId)
    ?.practiceExams.find(
      (practiceExam) => practiceExam.slug === practiceExamSlug,
    );
}

export function getTestIdForPracticeExam(
  practiceExamId: string,
): string | undefined {
  return registry.testIdByPracticeExamId.get(practiceExamId);
}

/** Effective time limit in minutes, or `null` when the exam is untimed. */
export function getTimeLimitMinutes(
  practiceExamId: string,
): number | null {
  const practiceExam = registry.practiceExamById.get(practiceExamId);
  if (practiceExam === undefined) return null;

  if (practiceExam.timeLimitMinutes !== undefined) {
    return practiceExam.timeLimitMinutes;
  }

  const testId = registry.testIdByPracticeExamId.get(practiceExamId);
  const test = testId === undefined ? undefined : getTestById(testId);
  return test?.defaultTimeLimitMinutes ?? null;
}

export function getQuestionById(questionId: string): Question | undefined {
  return registry.questionById.get(questionId);
}

/**
 * Resolves a frozen session snapshot back into questions, preserving the given
 * order. Unknown ids are skipped — content can be edited between the time a
 * session is saved and the time it resumes.
 */
export function getQuestionsByIds(
  questionIds: readonly string[],
): readonly Question[] {
  const questions: Question[] = [];

  for (const questionId of questionIds) {
    const question = registry.questionById.get(questionId);
    if (question !== undefined) questions.push(question);
  }

  return questions;
}

/** Every question under a test, across all of its practice exams. */
export function getQuestionsForTest(testId: string): readonly Question[] {
  const node = registry.testNodeById.get(testId);
  if (node === undefined) return [];

  return node.practiceExams.flatMap((practiceExam) => practiceExam.questions);
}

// --- route param helpers, for generateStaticParams -------------------------

export function listCategoryParams(): { category: string }[] {
  return registry.categories.map((category) => ({ category: category.slug }));
}

export function listTestParams(): { category: string; test: string }[] {
  return allTestNodes().map((node) => ({
    category: node.categorySlug,
    test: node.test.slug,
  }));
}

export function listPracticeExamParams(): {
  category: string;
  test: string;
  practiceExam: string;
}[] {
  return allTestNodes().flatMap((node) =>
    node.practiceExams.map((practiceExam) => ({
      category: node.categorySlug,
      test: node.test.slug,
      practiceExam: practiceExam.slug,
    })),
  );
}

function allTestNodes(): readonly TestNode[] {
  return [...registry.testNodeById.values()];
}
