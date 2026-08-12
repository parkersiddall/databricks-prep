@next-app/AGENTS.md

# databricks-prep

A Next.js app serving practice exams for Databricks certifications. No database,
no authentication — all user progress lives in browser `localStorage`.

**Read [`docs/architecture.md`](docs/architecture.md) before writing feature code.**
It defines the domain vocabulary, routing, data model, and persistence design.

- [`docs/build-plan.md`](docs/build-plan.md) — which steps are done, what's next.
- [`docs/decisions.md`](docs/decisions.md) — why the repo is laid out this way, and
  which alternatives were already rejected. Check it before proposing a
  restructure.

## Keeping documentation current

**Documentation is part of the change, not a follow-up.** These files are the
shared source of truth across sessions; stale ones are worse than missing ones,
because they get trusted. Before ending any turn that changed the things on the
left, update the file on the right **in the same turn and the same commit**:

| If you changed…                                              | Update                |
| ------------------------------------------------------------ | --------------------- |
| Completed, split, or added a build step                       | `docs/build-plan.md`  |
| Routing, data model, persistence, grading, or a trade-off     | `docs/architecture.md`|
| Repo layout, tooling, or rejected an approach                 | `docs/decisions.md`   |
| Commands, conventions, vocabulary, or hit a new gotcha        | `CLAUDE.md`           |

Specific triggers, all of which have already come up once:

- **A build step lands** → tick its checkbox in `docs/build-plan.md`. If the work
  revealed new sub-steps, add them rather than silently absorbing them.
- **A design detail changes during implementation** → fix
  `docs/architecture.md` immediately. When a doc and the code disagree, the code
  is right and the doc is a bug.
- **An approach is tried and abandoned, or the user rejects a proposal** → record
  it under the relevant heading in `docs/decisions.md`, with the reason. This is
  what stops it being re-proposed in a later session.
- **Something costs real debugging time** → add it to the gotchas list at the
  bottom of this file, phrased so the next session avoids it outright.
- **An open question is answered** (e.g. the question-JSON hand-off) → resolve it
  in `docs/build-plan.md` instead of leaving it listed as open.

Do not duplicate a fact across files — state it in the file that owns it and link
from the others. Two copies of the same fact drift, and then neither is
trustworthy.

## Repository layout

```
databricks-prep/
├── docker/       Dockerfile + compose files (build context is ../next-app)
├── docs/         architecture and build plan
└── next-app/     the Next.js app — stock create-next-app packaging
```

All npm commands run from `next-app/`, not the repo root. There is no root
`package.json`.

```bash
cd next-app
npm run dev          # http://localhost:3000
npm run build
npm test             # vitest
npm run typecheck    # tsc --noEmit
npm run lint
```

Docker, from `docker/`:

```bash
docker compose up --build                        # dev, hot reload
docker compose -f compose.prod.yaml up --build   # production standalone image
```

## Domain vocabulary

Use these terms exactly — in identifiers, routes, and prose. Earlier drafts
confused the middle and leaf levels, which is why this is pinned.

| Term              | Means                              | Example                            |
| ----------------- | ---------------------------------- | ---------------------------------- |
| **Test category** | Top-level grouping on the homepage | Databricks                         |
| **Test**          | A specific certification           | Databricks Data Engineer Associate |
| **Practice exam** | One sittable exam + its questions  | Practice Exam 1                    |
| **Question**      | A single item                      | —                                  |

**A test owns many practice exams.** Types are `Category`, `Test`,
`PracticeExam`, `Question`. Never introduce a bare `exam` identifier — it is
ambiguous between the middle and leaf level.

## Conventions

- **Next.js 16.** APIs differ from older versions. Consult
  `next-app/node_modules/next/dist/docs/` before writing route or config code —
  see `next-app/AGENTS.md`.
- **Source organization is grown, not scaffolded.** `src/` currently holds only
  `app/`. Create `lib/`, `stores/`, `hooks/`, `components/`, `content/` as code
  actually lands in them, per the layout in `docs/architecture.md`. Do not
  pre-create empty directories.
- **Pure logic stays pure.** Grading, the missed-question pool reducer, and timer
  math take plain data and return plain data — no React, no `localStorage`. Unit
  tests live beside them as `*.test.ts` and are the primary safety net.
- **Styling** uses the semantic Tailwind tokens defined in
  `next-app/src/app/globals.css` (`bg-surface`, `text-muted`, `border-border`,
  `text-danger`, …) rather than raw palette values, so the theme stays swappable.
  Light, system-dark, and explicit `[data-theme="dark"]` are all wired.
- **Commit cadence:** the user reviews and commits one build-plan step at a time.
  Stop after each step rather than chaining several together.

## Gotchas discovered the hard way

Each of these has already cost time once. They are not hypothetical.

1. **`npm run typecheck` fails on a clean checkout** with
   `Cannot find name 'LayoutProps'`. Next generates route types into
   `.next/types/`, so `next build` or `next dev` must run first. Relevant to CI
   ordering.
2. **`.gitignore` patterns must stay unanchored** (`node_modules`, not
   `/node_modules`). A leading slash anchors to the repo root and stops matching
   inside `next-app/` — which silently lets ~23k files into a commit.
3. **`next-app/public/.gitkeep` must exist.** `public/` is otherwise empty, git
   does not track empty directories, and the Dockerfile's `COPY /app/public`
   step fails on a fresh clone.
4. **`ENV HOSTNAME=0.0.0.0` in the Dockerfile's runner stage is load-bearing.**
   Docker sets `HOSTNAME` to the container ID, and the standalone `server.js`
   reads that variable and would bind to it.
5. **The dev compose file needs anonymous volumes** for `/app/node_modules` and
   `/app/.next`. Without them the bind mount shadows the container's
   Linux-built `node_modules` with macOS-built ones.
6. **`next-app/AGENTS.md` is regenerated by `next dev`.** Commit it with your
   work; deleting it from a diff only recreates an uncommitted change.
