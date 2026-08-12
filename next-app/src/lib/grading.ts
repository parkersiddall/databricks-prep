import type { Question, QuestionType } from "@/content/schema";

/**
 * Grading. Pure functions over plain data — no React, no storage.
 *
 * Adding a question type means adding one entry to `graders` (the mapped type
 * makes a missing entry a compile error) and one option renderer. Nothing in the
 * runner, the stores, or the results page needs to change.
 */

export type SingleChoiceAnswer = {
  type: "single";
  optionId: string;
};

/** Mirrors the Question union: one member per question type. */
export type AnswerValue = SingleChoiceAnswer;

type Graders = {
  [T in QuestionType]: (
    question: Extract<Question, { type: T }>,
    answer: AnswerValue | undefined,
  ) => boolean;
};

const graders: Graders = {
  single: (question, answer) =>
    answer?.type === "single" && answer.optionId === question.correctOptionId,
};

/** An unanswered question is graded incorrect, as in the real exam. */
export function isAnswerCorrect(
  question: Question,
  answer: AnswerValue | undefined,
): boolean {
  // The cast is confined to this line: TypeScript cannot correlate a union
  // member with its own grader through an index access.
  const grader = graders[question.type] as (
    question: Question,
    answer: AnswerValue | undefined,
  ) => boolean;

  return grader(question, answer);
}

export type QuestionOutcome = {
  questionId: string;
  domain?: string;
  /** False when the user left it blank. Blank still counts as incorrect. */
  answered: boolean;
  correct: boolean;
  answer?: AnswerValue;
};

export type DomainBreakdown = {
  domain: string;
  correctCount: number;
  total: number;
  scorePct: number;
};

export type AttemptResult = {
  correctCount: number;
  answeredCount: number;
  total: number;
  /**
   * Exact percentage, deliberately not rounded — rounding here could flip a
   * 69.6% into a pass. Format at the point of display.
   */
  scorePct: number;
  passed: boolean;
  perQuestion: QuestionOutcome[];
  /** Only questions carrying a `domain` appear here; all count toward `total`. */
  byDomain: DomainBreakdown[];
};

function percentage(correct: number, total: number): number {
  return total === 0 ? 0 : (correct / total) * 100;
}

export function scoreAttempt(
  questions: readonly Question[],
  answers: Readonly<Record<string, AnswerValue>>,
  options: { passingScorePct: number },
): AttemptResult {
  const perQuestion: QuestionOutcome[] = [];

  let correctCount = 0;
  let answeredCount = 0;

  // Insertion order follows the questions, so the breakdown reads in exam order.
  const domainTallies = new Map<string, { correct: number; total: number }>();

  for (const question of questions) {
    const answer = answers[question.id];
    const answered = answer !== undefined;
    const correct = isAnswerCorrect(question, answer);

    if (answered) answeredCount += 1;
    if (correct) correctCount += 1;

    perQuestion.push({
      questionId: question.id,
      domain: question.domain,
      answered,
      correct,
      answer,
    });

    if (question.domain !== undefined) {
      const tally = domainTallies.get(question.domain) ?? {
        correct: 0,
        total: 0,
      };
      tally.total += 1;
      if (correct) tally.correct += 1;
      domainTallies.set(question.domain, tally);
    }
  }

  const total = questions.length;
  const scorePct = percentage(correctCount, total);

  return {
    correctCount,
    answeredCount,
    total,
    scorePct,
    passed: scorePct >= options.passingScorePct,
    perQuestion,
    byDomain: [...domainTallies].map(([domain, tally]) => ({
      domain,
      correctCount: tally.correct,
      total: tally.total,
      scorePct: percentage(tally.correct, tally.total),
    })),
  };
}
