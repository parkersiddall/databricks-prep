# Decisions

Structural and process decisions, with the alternatives that were rejected and
why. [`architecture.md`](architecture.md) covers runtime design decisions; this
file covers how the repo and the work are organized.

Recording the rejected options matters more than recording the chosen one — it
stops a future session from re-proposing something already turned down.

---

## The Next app is nested in `next-app/` with stock packaging

The repo root holds only `docs/`, `docker/`, `next-app/`, and a few dotfiles.
Everything Next needs — `package.json`, `next.config.ts`, `tsconfig.json`,
`eslint.config.mjs`, `postcss.config.mjs`, `vitest.config.ts`, `public/`, `src/` —
sits at `next-app/`, laid out exactly as `create-next-app` produces it.

There is no root `package.json`. All npm commands run from `next-app/`.

**Rejected: splitting tool configs into a `config/` directory at root.** npm,
Next, ESLint, and PostCSS each resolve their config from the project root.
Relocating them requires `--config` flags and custom resolution, trading a
convention every tool understands for a shorter `ls`. The clutter is better
solved by the directory boundary.

**Consequence to remember:** `.gitignore` patterns must stay **unanchored**
(`node_modules`, not `/node_modules`). A leading slash anchors to the repo root
and silently stops matching inside `next-app/`.

---

## Source structure is grown, not scaffolded

`next-app/src/` currently holds only `app/`. Directories from the target layout
in `architecture.md` (`lib/`, `stores/`, `hooks/`, `components/`, `content/`) are
created when code actually lands in them.

**Rejected: pre-creating a feature-first `src/modules/` skeleton** (`catalog/`,
`exam-session/`, `grading/`, `missed-questions/`, `shared/`) with placeholder
files. It committed to module boundaries before any code existed to justify them,
and filled the tree with `.gitkeep` files. Layer-based organization, grown
incrementally, was preferred.

---

## Tests live in `next-app/tests/`, mirroring `src/`

`src/content/schema.ts` is tested by `tests/content/schema.test.ts`. Tests import
through the `@/` alias rather than relative paths, and Vitest's `include` is
`tests/**/*.test.ts`. `src/` therefore contains only code that ships.

**Rejected: colocating tests as `src/**/*.test.ts`.** It was the original
convention and briefly in use, but mixing tests into the source tree was not
wanted. **Also rejected: `__tests__/` directories**, which is still colocation
with extra nesting.

**Known trade-off:** a mirrored tree can drift — renaming or moving a source file
does not move its test, and nothing enforces the correspondence. Keep the mirror
accurate by hand when moving files.

---

## Docker lives in `docker/`, building `next-app/` as context

`docker/` holds one multi-stage `Dockerfile` with a `dev` target (hot reload) and
a `runner` target (standalone production image), plus `compose.yaml` and
`compose.prod.yaml`. The build context is `../next-app`, so the image never sees
`docker/` or the repo root. `.dockerignore` therefore lives in `next-app/`,
alongside the context it applies to.

**Rejected: Docker files at the repo root**, which was the original layout and
contributed to root clutter. **Also rejected: everything inside `next-app/`**,
which couples orchestration to a single service and makes adding a second
service awkward later.

**Consequences to remember:**

- `ENV HOSTNAME=0.0.0.0` in the runner stage is load-bearing. Docker sets
  `HOSTNAME` to the container ID, and the standalone `server.js` reads that
  variable and would try to bind to it.
- The dev compose file needs anonymous volumes for `/app/node_modules` and
  `/app/.next`, or the bind mount shadows the container's Linux-built
  `node_modules` with macOS-built ones.
- `next-app/public/.gitkeep` must exist. `public/` is otherwise empty, git does
  not track empty directories, and `COPY /app/public` fails on a fresh clone.

---

## Editor excludes are committed, not gitignored

`.vscode/settings.json` excludes `node_modules`, `.next`, and `*.tsbuildinfo`
from the Explorer, search, and the file watcher. It is committed so the excludes
apply to anyone who clones.

This exists because `.gitignore` alone does not stop VSCode from displaying and
indexing ~23k dependency files — a distinct problem with a distinct fix. Git
itself was never tracking them.

---

## Work proceeds one build-plan step at a time

Each step in [`build-plan.md`](build-plan.md) is finished, reported, and
committed before the next begins. Claude should stop after each step rather than
chaining several together, and should not commit on the user's behalf unless
asked.

**Why:** a large multi-step change is hard to review and collapses into one
oversized commit.

---

## Project knowledge lives in this repo

Architecture, conventions, decisions, and status are documented here rather than
carried in any single session's context, so the knowledge is shared and
reviewable. Prefer correcting these files over answering from memory; keep
`build-plan.md` ticked as steps land.

Documentation is kept current by **instruction, not automation**. `CLAUDE.md` has
a "Keeping documentation current" section with a trigger table mapping change
types to the file that must be updated in the same turn and commit.

**Rejected: a Claude Code `Stop` hook** that blocks the end of a turn when source
files changed but no documentation did. It would enforce the rule mechanically,
but produces false positives on changes that genuinely need no doc update, and
the resulting noise was judged worse than the occasional missed update.
**Also rejected: a git `pre-commit` hook**, which would additionally interrupt
hand-made commits.

If documentation does start drifting in practice, the `Stop` hook is the first
thing to reconsider.
