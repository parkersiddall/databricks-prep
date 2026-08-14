@next-app/AGENTS.md

# databricks-prep

A Next.js app serving practice exams for Databricks certifications. No database,
no authentication — all user progress lives in browser `localStorage`.

**Read [`docs/architecture.md`](docs/architecture.md) before writing feature code.**
It defines the domain vocabulary, routing, data model, and persistence design.

- [`docs/decisions.md`](docs/decisions.md) — why the repo is laid out this way, and
  which alternatives were already rejected. Check it before proposing a
  restructure.
- [`next-app/README.md`](next-app/README.md) — the source directory map, plus how
  to verify a change in a browser.

The initial build is complete: browsing, sitting, grading, reviewing missed
questions, settings, and theming all work.

## Keeping documentation current

**Documentation is part of the change, not a follow-up.** These files are the
shared source of truth across sessions; stale ones are worse than missing ones,
because they get trusted. Before ending any turn that changed the things on the
left, update the file on the right **in the same turn and the same commit**:

| If you changed…                                              | Update                    |
| ------------------------------------------------------------ | ------------------------- |
| Routing, data model, persistence, grading, or a trade-off     | `docs/architecture.md`    |
| Repo layout, tooling, or rejected an approach                 | `docs/decisions.md`       |
| A source directory, or how to verify a change                 | `next-app/README.md`      |
| How to add content, or how to run the app                     | `README.md`               |
| What a pull request should contain                            | `.github/pull_request_template.md` |
| Commands, conventions, vocabulary, or hit a new gotcha        | `CLAUDE.md`               |

Specific triggers, all of which have already come up once:

- **A design detail changes during implementation** → fix
  `docs/architecture.md` immediately. When a doc and the code disagree, the code
  is right and the doc is a bug.
- **An approach is tried and abandoned, or the user rejects a proposal** → record
  it under the relevant heading in `docs/decisions.md`, with the reason. This is
  what stops it being re-proposed in a later session.
- **Something costs real debugging time** → add it to the gotchas list at the
  bottom of this file, phrased so the next session avoids it outright.
- **A new directory appears under `src/`** → add it to the tree and the "what
  belongs where" table in `next-app/README.md`.

Do not duplicate a fact across files — state it in the file that owns it and link
from the others. Two copies of the same fact drift, and then neither is
trustworthy.

## Working from issues

Isolated tasks — features, changes, bugs — live as GitHub issues in this repo.
[`/issue`](.claude/skills/issue/SKILL.md) works one end to end: select or look up
the issue, branch from `origin/main`, plan it, commit each plan item separately,
then open a PR that closes it.

```
/issue          # pick the next suitable open issue
/issue 42       # by number
/issue timer resets on refresh   # by title
```

That skill is the only context in which you commit without being asked, and it
still never merges, force-pushes, or closes an issue by hand.

## Opening a pull request

Use [`.github/pull_request_template.md`](.github/pull_request_template.md):
**Introduction** (what was built), **Build plan** (how it was built, in order),
then **Notes** (decisions, verification, known issues).

**`gh` will not apply the template for you.** There is no `--template` flag, and
passing `--body` or `--body-file` bypasses the template entirely — it is only
prefilled when `gh pr create` prompts interactively, which an agent never does.
So read the template, fill it in, and pass the result:

```bash
gh pr create --base main --head <branch> \
  --title "<title>" \
  --body-file <filled-in-body.md>
```

Write that body file outside the repo (the scratchpad), not into the working
tree.

Two things to get right:

- The **Build plan** section is a narrative of how *this* change was built. It is
  not a standing document — do not recreate `docs/build-plan.md`, which was
  deliberately deleted. See `docs/decisions.md`.
- Fill in **Known issues and gaps** honestly, including what was *not* verified.
  A PR that quietly omits an untested path is worse than one that names it.

## Repository layout

```
databricks-prep/
├── docker/       Dockerfile + compose files (build context is ../next-app)
├── docs/         architecture and decisions
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
  math take plain data and return plain data — no React, no `localStorage`. These
  unit tests are the primary safety net.
- **Tests live in `next-app/tests/`, never beside the source.** The tree mirrors
  `src/`, so `src/content/schema.ts` is tested by `tests/content/schema.test.ts`.
  Import through the `@/` alias, not relative paths. `src/` holds only shipping
  code.
- **Styling** uses the semantic Tailwind tokens defined in
  `next-app/src/app/globals.css` (`bg-surface`, `text-muted`, `border-border`,
  `text-danger`, …) rather than raw palette values, so the theme stays swappable.
  Light, system-dark, and explicit `[data-theme="dark"]` are all wired.
- **Commit cadence:** by default the user reviews and commits one unit of work at
  a time. Finish a piece, report what changed and what was verified, then stop
  rather than chaining several together. **The `/issue` skill is the exception** —
  it commits each plan item itself.

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
7. **The Vitest config must be `vitest.config.mts`,** not `.ts`. `package.json`
   has no `"type": "module"`, so Vite loads a `.ts` config as CommonJS and warns
   about its ESM syntax. The `.mts` extension is already covered by
   `tsconfig.json`'s `include`.
8. **Content is validated at module load, so a bad question file fails the
   build.** Error messages are prefixed `[content]` and name the offending id.
   Do not loosen `src/content/schema.ts` to make real data fit — normalize the
   data instead. The invariants are listed in `docs/architecture.md`.
9. **`<html>` carries `suppressHydrationWarning`, and it is load-bearing.** The
   inline theme script sets `data-theme` before React hydrates, so the server
   HTML deliberately differs. Removing the prop reintroduces a hydration error on
   every page; removing the script reintroduces a flash of the wrong theme.
10. **Anything rendering persisted state must be gated on `useHydrated`.** The
    status badges, start panel, runner, and results all do this. Rendering
    `localStorage` data unguarded is the fastest way to a hydration mismatch.
