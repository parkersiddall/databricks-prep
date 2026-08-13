import { z } from "zod";

/**
 * Zod schemas for all authored content, plus the types the rest of the app uses.
 *
 * Everything here validates at module load (see registry.ts) so malformed
 * content fails the build with a precise message rather than surfacing as a
 * wrong score halfway through an exam.
 */

/** URL segment: lowercase, digits, single hyphens between words. */
const Slug = z
  .string()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "must be a lowercase hyphenated slug");

const Id = z.string().min(1);

export const CodeSnippetSchema = z.object({
  language: z.string().min(1),
  source: z.string().min(1),
});

export const QuestionOptionSchema = z.object({
  id: Id,
  text: z.string().min(1),
});

/**
 * Fields shared by every question type.
 *
 * `id` is the primary key for saved progress and the missed-question pool, so it
 * must be stable and unique across *every* practice exam — see the uniqueness
 * check in registry.ts. Renumbering ids invalidates users' stored progress.
 */
const questionBaseFields = {
  id: Id,
  prompt: z.string().min(1),
  code: CodeSnippetSchema.optional(),
  explanation: z.string().optional(),
  /** Exam objective. Must appear in the owning test's `domains`. */
  domain: z.string().min(1).optional(),
};

export const SingleChoiceQuestionSchema = z.object({
  ...questionBaseFields,
  type: z.literal("single"),
  options: z.array(QuestionOptionSchema).min(2),
  correctOptionId: Id,
});

/**
 * Discriminated union on `type`. Only single-select exists today; multi-select
 * and others plug in here, plus a grader in lib/grading.ts and an option
 * renderer. Nothing else needs to change.
 */
export const QuestionSchema = z
  .discriminatedUnion("type", [SingleChoiceQuestionSchema])
  .superRefine((question, ctx) => {
    switch (question.type) {
      case "single": {
        const optionIds = question.options.map((option) => option.id);

        if (new Set(optionIds).size !== optionIds.length) {
          ctx.addIssue({
            code: "custom",
            path: ["options"],
            message: `question "${question.id}" has duplicate option ids`,
          });
        }

        // Without this check a typo'd answer key silently marks every attempt wrong.
        if (!optionIds.includes(question.correctOptionId)) {
          ctx.addIssue({
            code: "custom",
            path: ["correctOptionId"],
            message: `question "${question.id}" points at option "${question.correctOptionId}", which is not one of its options (${optionIds.join(", ")})`,
          });
        }
        break;
      }
    }
  });

export const PracticeExamSchema = z
  .object({
    id: Id,
    slug: Slug,
    title: z.string().min(1),
    description: z.string().optional(),
    /** Overrides the owning test's `defaultTimeLimitMinutes` when present. */
    timeLimitMinutes: z.number().int().positive().optional(),
    questions: z.array(QuestionSchema).min(1),
  })
  .superRefine((practiceExam, ctx) => {
    const ids = practiceExam.questions.map((question) => question.id);
    const duplicates = [...new Set(ids.filter((id, i) => ids.indexOf(id) !== i))];

    if (duplicates.length > 0) {
      ctx.addIssue({
        code: "custom",
        path: ["questions"],
        message: `practice exam "${practiceExam.id}" repeats question id(s): ${duplicates.join(", ")}`,
      });
    }
  });

export const TestSchema = z.object({
  id: Id,
  slug: Slug,
  title: z.string().min(1),
  description: z.string().optional(),
  defaultTimeLimitMinutes: z.number().int().positive(),
  passingScorePct: z.number().min(0).max(100),
  /** Exam objectives. Drives the per-domain breakdown on the results page. */
  domains: z.array(z.string().min(1)).min(1),
});

export const CategorySchema = z.object({
  id: Id,
  slug: Slug,
  title: z.string().min(1),
  description: z.string().optional(),
  testIds: z.array(Id).min(1),
});

export const CategoriesFileSchema = z.array(CategorySchema).min(1);

export type CodeSnippet = z.infer<typeof CodeSnippetSchema>;
export type QuestionOption = z.infer<typeof QuestionOptionSchema>;
export type SingleChoiceQuestion = z.infer<typeof SingleChoiceQuestionSchema>;
export type Question = z.infer<typeof QuestionSchema>;
export type QuestionType = Question["type"];
export type PracticeExam = z.infer<typeof PracticeExamSchema>;
export type Test = z.infer<typeof TestSchema>;
export type Category = z.infer<typeof CategorySchema>;
