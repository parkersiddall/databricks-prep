# databricks-prep

Practice test app to prepare for the Databricks certification exam

## Layout

```
databricks-prep/
├── docker/       Dockerfile and compose files
├── docs/         architecture, decisions, build plan
└── next-app/     the Next.js application (standard create-next-app packaging)
```

- [`next-app/README.md`](next-app/README.md) — what lives in each source
  directory, and what belongs where.
- [`docs/architecture.md`](docs/architecture.md) — the design.
- [`docs/decisions.md`](docs/decisions.md) — why the repo is laid out this way,
  and which alternatives were rejected.
- [`docs/build-plan.md`](docs/build-plan.md) — current status and remaining work.

## Running locally

```bash
cd next-app
npm install
npm run dev          # http://localhost:3000
```

Other scripts, all from `next-app/`: `npm run build`, `npm start`, `npm test`,
`npm run typecheck`, `npm run lint`.

## Adding content

All content is JSON under `next-app/src/content/`, registered in
`src/content/registry.ts`. Nothing is read from disk at runtime — the registry
imports each file statically and validates it at module load, so a mistake fails
`npm test` and `npm run build` with a message prefixed `[content]` naming the
offending id.

Terminology is exact here: a **test category** (Databricks) holds **tests**
(Data Engineer Associate), and a test holds many **practice exams**
(Practice Exam 1). Slugs become URL segments:

```
/databricks/data-engineer-associate/practice-exam-1
 └ category    └ test                └ practice exam
```

### Add a practice exam to an existing test

The common case. Two steps.

**1.** Create the file, numbered in sequence:

```
next-app/src/content/databricks/data-engineer-associate/practice-exams/practice-exam-03.json
```

```json
{
  "id": "dea-pe-03",
  "slug": "practice-exam-3",
  "title": "Practice Exam 3",
  "description": "Optional one-liner shown on the test page.",
  "questions": [
    {
      "id": "dea-pe3-001",
      "type": "single",
      "domain": "Databricks Lakehouse Platform",
      "prompt": "Which directory holds a Delta table's transaction log?",
      "code": { "language": "sql", "source": "DESCRIBE DETAIL my_table;" },
      "options": [
        { "id": "a", "text": "_delta_log" },
        { "id": "b", "text": "_metadata" }
      ],
      "correctOptionId": "a",
      "explanation": "Shown on the results page after submitting."
    }
  ]
}
```

**2.** Register it in [`registry.ts`](next-app/src/content/registry.ts) — one
import, one array entry:

```ts
import deaPracticeExam03Json from "./databricks/data-engineer-associate/practice-exams/practice-exam-03.json";

const sources = [
  {
    test: deaTestJson,
    practiceExams: [
      deaPracticeExam01Json,
      deaPracticeExam02Json,
      deaPracticeExam03Json, // ← added
    ],
  },
];
```

Then `npm test`. The new exam appears on the test page and at
`/databricks/data-engineer-associate/practice-exam-3`.

### Add a test to an existing category

**1.** Create the folder and its `test.json`:

```
next-app/src/content/databricks/data-analyst-associate/
├── test.json
└── practice-exams/practice-exam-01.json
```

```json
{
  "id": "databricks-data-analyst-associate",
  "slug": "data-analyst-associate",
  "title": "Databricks Certified Data Analyst Associate",
  "description": "Optional.",
  "defaultTimeLimitMinutes": 90,
  "passingScorePct": 70,
  "domains": ["Databricks SQL", "Data Management", "Analytics Applications"]
}
```

`domains` is the closed set of exam objectives. Every question's `domain` must
match one of them exactly — this is enforced, because a typo would otherwise show
up as a phantom row in the per-domain results breakdown.

**2.** List the test id in
[`categories.json`](next-app/src/content/categories.json):

```json
"testIds": [
  "databricks-data-engineer-associate",
  "databricks-data-analyst-associate"
]
```

**3.** Add imports and a new `sources` entry in `registry.ts`:

```ts
{
  test: dataAnalystTestJson,
  practiceExams: [daaPracticeExam01Json],
}
```

### Add a category

Append an object to the `categories.json` array, then add its tests as above. A
category must list at least one test id.

```json
{
  "id": "aws",
  "slug": "aws",
  "title": "AWS",
  "description": "Optional, shown on the homepage card.",
  "testIds": ["aws-solutions-architect-associate"]
}
```

### Rules worth knowing before you write content

- **Question ids must be globally unique and never change.** They are the key for
  saved progress and for the missed-question pool, which is shared across every
  practice exam in a test. Reusing an id across two exams silently merges two
  different questions; renumbering ids invalidates users' saved progress.
  Convention: `dea-pe3-001`.
- **`correctOptionId` must name one of that question's own `options`.** A typo
  here would mark every attempt wrong, so it is validated.
- **Slugs must be lowercase and hyphenated** (`practice-exam-3`, not
  `Practice Exam 3`), and must be unique among their siblings.
- **`code` is optional** and renders as a syntax-highlighted block above the
  options. **`explanation`** is optional and shows on the results page.
- **`timeLimitMinutes`** on a practice exam overrides the test's
  `defaultTimeLimitMinutes`. Omit it to inherit.
- Only `"type": "single"` (one correct answer) is supported today. Other formats
  need a new schema member and grader — see
  [`docs/architecture.md`](docs/architecture.md).

Run `npm test` after any content change; the validation suite is the fastest way
to catch these.

## Running with Docker

From the `docker/` directory:

```bash
cd docker

docker compose up --build                          # dev server, hot reload
docker compose down

docker compose -f compose.prod.yaml up --build     # production standalone build
docker compose -f compose.prod.yaml down
```

Both stacks come from one multi-stage [`docker/Dockerfile`](docker/Dockerfile) —
`--target dev` for the dev server, `--target runner` for a minimal non-root
production image. The build context is `next-app/`, so `.dockerignore` lives
there alongside the app.

Override the host port with `PORT=4000 docker compose up`.

> Next.js recommends plain `npm run dev` over Docker for day-to-day development on
> macOS and Windows, since containerized filesystem access can slow hot reload. The
> dev container is here for parity checks and for Linux hosts.
