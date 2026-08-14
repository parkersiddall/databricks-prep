# Architecture

The design this app is built to. Read alongside [`decisions.md`](decisions.md),
which records why the repo is laid out this way and which alternatives were
rejected.

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

### Server shell, client runner

Each interactive route is a **thin server component** that validates the route
params, calls `notFound()` on a bad slug, and renders a client component with the
source key and the hrefs it needs. The page itself stays static; all session state
lives client-side.

`useSessionRunner` returns a discriminated union — `loading` / `missing` /
`ready` — because "still reading localStorage" needs a skeleton while "no session
for this key" needs a prompt to start.

**`ExamRunner`'s only exit control is a "Leave exam" button under each "Submit
exam" button**, going back to the sitting's `startHref` (start/resume screen).
Since every mutation persists immediately (see below), leaving mid-attempt
needs no confirmation dialog. It's duplicated once per breakpoint, same as
"Submit exam", because the question-nav sidebar itself is duplicated between
the mobile disclosure and the desktop `aside`. The results and missed-pool
overview pages don't need one of their own: they already route through
`PageContainer`, which renders breadcrumbs plus an explicit back button.

**Trade-off:** because the runner resolves questions client-side through
`content/queries`, the whole content registry is bundled into the client. Fine at
this size, and it is what makes the runner work offline with no API. If the
question bank grows large, the fix is to pass one practice exam's questions from
the server shell as props rather than importing the registry in client code.

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
  timer: TimerState;              // { timeLimitMs, elapsedMs, lastResumedAt }
  status: "in-progress" | "submitted";
  result?: AttemptResult;
  submittedAt?: number;
};
```

The timer fields are **nested as a `TimerState`** rather than flattened onto the
session, so `lib/timer.ts` functions compose directly instead of every caller
rebuilding the struct.

Operations on a session live in `lib/session.ts` as pure functions
(`createSession`, `setAnswer`, `toggleFlag`, `goToIndex`, `submitSession`, and
`resumeTimer` / `flushTimer` / `pauseTimer` passthroughs). Each returns a new
session, or **the same object when nothing changed**, which lets the store skip
needless re-renders. `stores/sessions.ts` is a thin wrapper that holds the map
and persists it.

One rule worth knowing: **study mode locks a question once answered.** It reveals
the correct answer and feeds the missed pool at that instant, so allowing a change
afterwards would let the user grade the same question twice.

Keying by source key gives **each practice exam its own independent session** —
Practice Exam 1 can sit half-finished while Practice Exam 2 is untouched. The
practice-exam list reads these to show "In progress — 12/45" or "Scored 78%"
badges per row.

Three details make "finish it later" actually work:

1. **Question order is frozen at session start** (`questionIds` snapshot).
   Critical for review sessions — the pool mutates as answers are graded, and a
   live-derived list would reshuffle the exam mid-attempt.
2. **The timer accumulates on pause**, rather than storing a fixed deadline.
   `lib/timer.ts` exposes `resume` / `flush` / `pause` over a `TimerState` of
   `{ timeLimitMs, elapsedMs, lastResumedAt }`: `resume` on mount (idempotent, so
   repeated mounts cannot lose banked time), `flush` on each tick, `pause` on
   `visibilitychange` / `beforeunload`. Closing the tab pauses the clock, which
   is what resuming implies; `isExpired` drives auto-submit. Elapsed time is
   clamped at zero so a backwards system clock cannot refund spent time.
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

**Review sittings are untimed and default to study mode.** The goal is deliberate
practice rather than exam pressure; exam mode remains available. `ReviewPanel`
also offers "Clear review list", which empties the pool for one test only and
leaves practice-exam sessions and scores untouched.

### Hydration

`localStorage` is client-only, so persisted state must not drive the first
render. `hooks/use-hydrated.ts` gates the runner and results pages behind a
skeleton. **This is the single most likely source of hydration-mismatch bugs in
this app.**

It is built on **`useSyncExternalStore`, not `useState` + `useEffect`**, because
that primitive takes a separate server snapshot — pinned to `false`, and also used
for the client's hydrating render. This matters: Zustand's localStorage
persistence rehydrates *synchronously* while the store module is evaluated, so
`hasHydrated()` already returns true by the client's first render. Reading it
directly would reintroduce the very mismatch the hook exists to prevent. (Seeding
`useState` from it and correcting in an effect also trips
`react-hooks/set-state-in-effect`.)

`hooks/use-session-runner.ts` is the runner's entire API: it binds a source key to
the sessions store, the missed pool, and a one-second tick. It returns `null`
until hydrated, resumes the clock on mount, flushes on each tick, banks time on
`visibilitychange` / `beforeunload`, and auto-submits on expiry.

### Theme

Theme is the one place a hydration mismatch is *intended*. An inline script in
the document head reads `dbp:prefs:v1` and sets `data-theme` on `<html>` before
first paint, which is what avoids a flash of the wrong theme — but it means the
client's `<html>` no longer matches the server's. `<html>` therefore carries
`suppressHydrationWarning`, whose scope is that element's own attributes and does
not extend into the tree. `ThemeSync` keeps the attribute in step when the
preference changes afterwards.

Removing either piece breaks something: without the script there is a flash;
without the prop there is a hydration error on every page.

### Prose rendering

Prompts, options, and explanations are authored with Markdown-style backticks
around identifiers. `parseInlineCode` splits those spans out and `<RichText>`
renders them as `<code>`. **This is the entire extent of Markdown support** —
deliberately, rather than shipping a parser for a few identifiers. An unmatched
backtick stays literal instead of swallowing the rest of the string.

## Grading

A `graders` record keyed on question `type`, so a future multi-select is one new
grader plus one new option renderer — no changes to the runner, stores, or
results.

```ts
type Graders = {
  [T in QuestionType]: (q: Extract<Question, { type: T }>, a: AnswerValue | undefined) => boolean;
};

scoreAttempt(questions, answers, { passingScorePct }): AttemptResult
// -> { correctCount, answeredCount, total, scorePct, passed, perQuestion[], byDomain[] }
```

The mapped type is the enforcement mechanism: adding a member to the `Question`
union fails the build until a grader exists for it.

Two grading decisions that matter:

- **An unanswered question is graded incorrect**, as in the real exam.
  `answeredCount` is reported separately so the UI can warn about blanks before
  submitting.
- **`scorePct` is exact and unrounded.** Rounding inside grading could turn a
  69.6% into a pass; `passed` compares the exact value, and `formatPercent`
  rounds only for display.

Questions with no `domain` are excluded from `byDomain` but still counted in
`total`. Breakdown rows follow first-appearance order, so they read in exam order.

Pure functions over plain data. This is the layer that gets unit tests.

### Results

`components/results/ResultsView` reads the submitted session by source key and
renders the score summary, the per-objective breakdown, and the full answer
review. Like the runner, it is **generic over the source key**, so practice-exam
results and review-sitting results share one implementation.

The answer review reuses `OptionList` in its revealed, disabled state rather than
duplicating option markup, so a reviewed question looks exactly like the one that
was sat. Its "only incorrect" filter keeps each question's **original exam
number** rather than renumbering the filtered view.

Time taken comes from the stopped timer. Because `submitSession` pauses it, the
`now` argument to `elapsedAt` cannot affect the total — which matters, since
calling `Date.now()` during render trips ESLint's `react-hooks/purity` rule.

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
