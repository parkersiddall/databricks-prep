# Architecture

The design this app is being built to. Read alongside
[`build-plan.md`](build-plan.md), which tracks execution status.

## What this is

A practice-exam app for Databricks certifications. The user drills down
**test category → test → practice exam**, takes an exam, gets scored, and
reviews every answer. Questions they miss accumulate into a pool they can drill
separately.

Two constraints shape every decision below:

- **No database.** All progress lives in browser `localStorage`.
- **No authentication.** There is no user identity; state is per-device,
  per-browser.

## Vocabulary

| Term              | Means                              | Example                            | Cardinality       |
| ----------------- | ---------------------------------- | ---------------------------------- | ----------------- |
| **Test category** | Top-level grouping on the homepage | Databricks                         | 1 for now         |
| **Test**          | A specific certification           | Databricks Data Engineer Associate | many per category |
| **Practice exam** | One sittable exam + its questions  | Practice Exam 1                    | **many per test** |
| **Question**      | A single item                      | —                                  | many per exam     |

The one-to-many that matters: **a test owns multiple practice exams.** Types are
`Category`, `Test`, `PracticeExam`, `Question` — no bare `exam` identifier, since
it is ambiguous between the middle and leaf level.

## Stack

| Concern            | Choice                                        | Why                                                                    |
| ------------------ | --------------------------------------------- | ---------------------------------------------------------------------- |
| Framework          | Next.js 16 (App Router), React 19, TS `strict` | Content pages prerender; the runner is client-side                     |
| Styling            | Tailwind v4 + hand-rolled primitives           | No component-library churn for ~6 primitives                           |
| Content validation | Zod 4                                          | Malformed question JSON fails loudly at load, not silently mid-exam    |
| Client state       | Zustand 5 + `persist`                          | Purpose-built localStorage persistence with versioning and migrations  |
| Tests              | Vitest                                         | Unit tests for grading and the missed-pool reducer                     |

No API routes, no server state. Every page is statically renderable.

## Routing

Routes are content-addressed, so they prerender and survive a refresh. Session
state is resolved client-side by a **source key**; no session IDs in URLs.

```
/                                            Test categories
/[category]                                  Tests in the category
/[category]/[test]                           Practice exams + "Missed Questions" card
/[category]/[test]/[practiceExam]            Start / resume screen
/[category]/[test]/[practiceExam]/take       Runner        — source key `pe:<practiceExamId>`
/[category]/[test]/[practiceExam]/results    Attempt review
/[category]/[test]/review                    Missed-pool overview
/[category]/[test]/review/take               Review runner — source key `review:<testId>`
/[category]/[test]/review/results            Review results
```

Concretely: `/databricks/data-engineer-associate/practice-exam-1/take`.

`generateStaticParams` on each dynamic segment enumerates the registry. Runner
and results pages are `"use client"`.

**The missed-question review sits at the test level, not the practice-exam
level** — the pool spans every practice exam under that certification, which is
the entire point of it.

**Key decision:** one generic runner component driven by a source key, so a
practice exam and a review session share a single code path.

## Content layer

```
next-app/src/content/
├── categories.json                          category metadata + which tests belong to each
└── databricks/
    └── data-engineer-associate/
        ├── test.json                        title, description, defaultTimeLimitMinutes,
        │                                    passingScorePct, domains[]
        └── practice-exams/
            ├── practice-exam-01.json        { id, slug, title, questions: [...] }
            └── practice-exam-02.json
```

`categories.json` is an **array** of categories, each listing the `testIds` it
owns. `practice-exam-*.json` may also carry `timeLimitMinutes`, which overrides
the test's `defaultTimeLimitMinutes`.

Three modules make up the layer:

| Module        | Role                                                                       |
| ------------- | -------------------------------------------------------------------------- |
| `schema.ts`   | Zod schemas + the exported `Category` / `Test` / `PracticeExam` / `Question` types |
| `registry.ts` | Static JSON imports, validation, and the lookup maps                        |
| `queries.ts`  | The read-only accessors pages use; nothing else touches `registry` directly  |

`registry.ts` **statically imports** each JSON file and validates it with Zod at
module load — no `fs` globbing, so it works under static export and keeps types
end-to-end. Adding a practice exam is a JSON file plus one import line; adding a
test also needs an entry in `categories.json`.

### Validated invariants

Violating any of these throws at module load, which fails the build rather than
surfacing as a wrong score mid-exam. All are covered by
`tests/content/schema.test.ts` and `tests/content/queries.test.ts`.

1. `correctOptionId` names one of the question's own options, and option ids
   within a question are unique.
2. Question ids are unique **globally**, not just within a practice exam.
3. A question's `domain`, when present, is one of the owning test's declared
   `domains` — otherwise a typo becomes a phantom row in the results breakdown.
4. Every test is claimed by exactly one category, and every `testIds` entry in
   `categories.json` resolves to a registered test.
5. Category slugs are unique, and practice-exam slugs are unique within a test.

### Question schema

A **discriminated union on `type`** from day one, even though only one member
exists today. Only single-select is required now; multi-select and others may
come later.

```ts
const QuestionBase = z.object({
  id: z.string(),                 // stable + globally unique
  prompt: z.string(),
  code: z.object({ language: z.string(), source: z.string() }).optional(),
  explanation: z.string().optional(),
  domain: z.string().optional(),  // exam objective; powers the results breakdown
});

const SingleChoiceQuestion = QuestionBase.extend({
  type: z.literal("single"),
  options: z.array(z.object({ id: z.string(), text: z.string() })).min(2),
  correctOptionId: z.string(),
});

export const Question = z.discriminatedUnion("type", [SingleChoiceQuestion]);
```

Validation must assert that `correctOptionId` exists in `options`, and that
question IDs are unique **across all practice exams**.

> **Question IDs must be stable and globally unique.** They are the primary key
> for saved progress and the missed pool. Because the pool is shared across every
> practice exam in a test, an ID collision between Practice Exam 1 and 2 silently
> merges two different questions. Renumbering IDs invalidates users' stored
> progress. Convention: `dea-pe1-014`.

## State and persistence

Three independently versioned `localStorage` keys, so a schema change to one
does not destroy the others.

| Store      | Key                | Holds                                       |
| ---------- | ------------------ | ------------------------------------------- |
| sessions   | `dbp:sessions:v1`  | In-progress and completed attempts          |
| missed     | `dbp:missed:v1`    | Missed-question pool with streak counters   |
| prefs      | `dbp:prefs:v1`     | Default mode, timer on/off, theme           |

### Session

```ts
type Session = {
  id: string;
  sourceKey: string;              // "pe:<practiceExamId>" | "review:<testId>"
  testId: string;
  questionIds: string[];          // frozen at start
  answers: Record<string, AnswerValue>;
  flagged: string[];
  currentIndex: number;
  mode: "exam" | "study";         // study = instant feedback
  startedAt: number;
  timeLimitMs: number | null;
  elapsedMs: number;              // accumulated across visits
  lastResumedAt: number | null;
  status: "in-progress" | "submitted";
  result?: AttemptResult;
};
```

Keying by source key gives **each practice exam its own independent session** —
Practice Exam 1 can sit half-finished while Practice Exam 2 is untouched. The
practice-exam list reads these to show "In progress — 12/45" or "Scored 78%"
badges per row.

Three details make "finish it later" actually work:

1. **Question order is frozen at session start** (`questionIds` snapshot).
   Critical for review sessions — the pool mutates as answers are graded, and a
   live-derived list would reshuffle the exam mid-attempt.
2. **The timer accumulates on pause**, rather than storing a fixed deadline. On
   mount set `lastResumedAt = Date.now()`; on each tick and on
   `visibilitychange` / `beforeunload`, flush `elapsedMs += now - lastResumedAt`.
   Closing the tab pauses the clock, which is what resuming implies. Auto-submit
   at zero.
3. **Every mutation persists immediately.** No save button; a hard refresh
   mid-question loses nothing.

### Missed-question pool

```ts
type MissedEntry = {
  questionId: string;
  testId: string;                 // pool is scoped per certification
  firstMissedAt: number;
  lastSeenAt: number;
  timesMissed: number;
  correctStreak: number;          // graduates out at 2
};
```

Applied per graded question — at submit in exam mode, at answer time in study
mode:

- **Incorrect** → upsert entry, `timesMissed++`, `correctStreak = 0`
- **Correct** → if an entry exists, `correctStreak++`; remove it at **2**

Correct answers from *any* session count toward the streak, not just review
sessions — a question genuinely learned should not linger because it was only
met in a full practice exam.

Review sessions pull every pool entry for the test, sorted by `correctStreak`
asc, then `timesMissed` desc, then `lastSeenAt` asc, capped at a user-chosen
size (10 / 25 / all).

### Hydration

`localStorage` is client-only, so persisted state must not drive the first
render. A `use-hydrated` hook wrapping `store.persist.hasHydrated()` gates the
runner and results pages behind a skeleton. **This is the single most likely
source of hydration-mismatch bugs in this app.**

## Grading

A `graders` record keyed on question `type`, so a future multi-select is one new
grader plus one new option renderer — no changes to the runner, stores, or
results.

```ts
const graders: { [T in Question["type"]]: (q: Extract<Question, { type: T }>, a?: AnswerValue) => boolean };

scoreAttempt(questions, answers): AttemptResult
// -> { correctCount, total, scorePct, passed, perQuestion[], byDomain[] }
```

Pure functions over plain data. This is the layer that gets unit tests.

## Target source layout

Directories are created **as code lands in them**, not scaffolded upfront.

```
next-app/
├── src/
│   ├── app/            routes; pages stay thin
│   ├── content/        question JSON + schema.ts, registry.ts, queries.ts
│   ├── lib/            grading.ts, missed-pool.ts, timer.ts, format.ts
│   ├── stores/         sessions.ts, missed.ts, prefs.ts
│   ├── hooks/          use-hydrated.ts, use-session-runner.ts
│   └── components/
│       ├── layout/     page-container.tsx (frame, heading, sections)
│       ├── ui/         badge, card, breadcrumbs, button, dialog, progress
│       ├── exam/       runner pieces
│       └── results/    score summary, domain breakdown, answer review
└── tests/              mirrors src/ — tests/content/, tests/lib/, …
```

### Next 16 route conventions

Pages use the **generated** `PageProps<"/[category]/[test]">` and
`LayoutProps<"/">` global helpers rather than hand-written prop types, and
`params` is a **Promise** that must be awaited. `typedRoutes` is not enabled, so
`Link href` accepts ordinary template strings.

`src/` contains only shipping code. Tests live under `tests/` in a mirrored tree
and import through the `@/` alias — `tests/content/schema.test.ts` covers
`src/content/schema.ts`. Vitest's `include` is `tests/**/*.test.ts`.

## Known trade-offs

- **Browser storage means progress is per-device and lost if site data is
  cleared.** Accepted given the no-database constraint. A settings-page
  export/import JSON button is the cheap escape hatch and a natural later
  addition.
- **Only `type: "single"` is implemented.** The discriminated union, grader map,
  and `AnswerValue` type are the seams where other formats plug in.
- **Timer limits** come from `test.json` (`defaultTimeLimitMinutes`), overridable
  per practice exam; untimed attempts are allowed.
