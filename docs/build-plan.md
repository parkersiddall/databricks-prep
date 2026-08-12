# Build plan

Execution status for the design in [`architecture.md`](architecture.md).
The user reviews and commits **one step at a time** — finish a step, report, stop.

Keep this file current: tick a step when it lands, and record anything a future
session would otherwise have to rediscover.

## Status

- [x] **1. Scaffold** — Next.js 16 + React 19, App Router, `src/`, TS strict,
      Tailwind v4 semantic tokens, Zod + Zustand + Vitest, `test` / `typecheck`
      scripts.
- [x] **1a. Containerization** *(added mid-flight)* — multi-stage
      `docker/Dockerfile` (`dev` and `runner` targets), dev + prod compose files,
      `output: "standalone"`.
- [x] **1b. Repo restructure** *(added mid-flight)* — app moved into `next-app/`,
      Docker into `docker/`, `.gitignore` unanchored, VSCode excludes.
- [x] **2. Content layer** — `schema.ts`, `registry.ts`, `queries.ts` under
      `next-app/src/content/`, seeded with **two** practice exams (6 questions
      each) so the one-to-many is exercised from the start. 27 tests cover the
      schema validators and the registry invariants listed in
      `architecture.md`.
- [x] **3. Navigation pages** — `/`, `/[category]`, `/[category]/[test]`, all
      prerendered via `generateStaticParams`; unknown slugs `notFound()`. Added
      `components/ui/` (badge, card, breadcrumbs), `components/layout/`
      (page container + section), `lib/format.ts`, and a site header in the root
      layout. The practice-exam and `review` links render but 404 until steps
      6 and 8 create those routes.
- [x] **4. Pure logic + tests** — `lib/grading.ts`, `lib/missed-pool.ts`,
      `lib/timer.ts`, plus `formatDuration` / `formatPercent` in `lib/format.ts`.
      80 tests total. Verified separately that adding a question type to the
      `Question` union is a **compile error** until a grader is added
      (`TS2741: Property 'multi' is missing … required in type 'Graders'`).
- [x] **5. Stores + hydration** — three persisted Zustand stores
      (`sessions`, `missed`, `prefs`), `use-hydrated`, `use-session-runner`.
      108 tests, including reload-survival against a memory storage shim.
      - [x] **5a. `lib/session.ts`** *(new sub-step)* — the session operations were
            extracted as pure functions so the store stays a thin wrapper and the
            logic is testable without `localStorage`.
- [x] **5b. Hydration verified under real SSR** — driven in headless Chrome
      during step 6. No hydration warnings and no console errors across the start
      screen, runner, reload, and submit.
- [x] **6. Runner** — `[practiceExam]/take`: question card, code block, nav grid,
      countdown with auto-submit, flagging, study-mode instant feedback, submit
      dialog warning on blanks. Verified end to end in headless Chrome
      (see "Driving the app" below).
      - [x] **6a. Start / resume screen** *(new sub-step)* — `[practiceExam]/page.tsx`
            plus `StartPanel`. The runner needs a session to exist, so this was a
            prerequisite rather than optional: it offers mode and timer choice,
            Resume vs Start over, and Retake after completion.
      - [x] **6b. `useSessionRunner` returns a discriminated union** — `loading` /
            `missing` / `ready`, because the runner must show a skeleton while
            hydrating but a "start the exam" prompt when no session exists. It
            previously returned `null` for both.
      - [ ] **6c. Submitted state in the runner is temporary.** It shows the score
            inline with a link to `…/results`, which **404s until step 7**.
- [ ] **7. Results** — score summary, per-domain breakdown, full answer review
      with explanations; wire missed-pool updates on submit.
- [ ] **8. Review flow** — `review` overview + `take` + `results`, reusing the
      runner via the `review:<testId>` source key.
- [ ] **9. Polish** — resume badges per practice exam, reset progress, empty
      states, responsive nav grid (drawer on mobile).
      - Explanations are rendered as plain text, so Markdown backticks in the
        seed content show up literally (`` `availableNow=True` ``). Either strip
        them from the content or render inline code. Visible in study mode and on
        the results page.
      - The prefs store only writes to `localStorage` once a preference is
        changed, so `dbp:prefs:v1` is absent for a new user. Harmless — defaults
        live in code — but do not treat its absence as a bug.

## Open questions

- **Question JSON hand-off — still outstanding.** The user has an existing
  collection in JSON but has not handed it over yet. Step 2 went ahead with the
  schema defined first and seeded with 12 written questions, so nothing is
  blocked. When the real file arrives: if its shape differs, write a one-off
  `scripts/normalize-questions.ts` to convert it rather than loosening the
  schema, and delete or keep the seed questions as the user prefers. Their ids
  use the `dea-pe1-001` convention, which the real content should follow.

## Verification checklist

Run before calling the feature complete. Most of these catch bugs that only
appear across a reload or a tab close.

- Walk home → Databricks → DEA → Practice Exam 1, answer a few, then
  **hard-refresh mid-exam**: answers, flags, current index, and remaining time
  all survive.
- Start Practice Exam 1, leave partway, start Practice Exam 2: sessions are
  independent, and both show correct per-row status on the test page.
- Close the tab for a minute and reopen: the timer **paused**, it did not
  advance.
- Submit with deliberate wrong answers: score and per-question marks are right,
  and missed questions appear in `dbp:missed:v1` (DevTools → Application →
  Local Storage).
- Miss a question in Practice Exam 1 and another in Practice Exam 2: the
  test-level review session contains **both**.
- Answer a pooled question correctly **twice** → it leaves the pool. Answer
  another incorrectly → `correctStreak` resets to 0.
- Set a short time limit and let it expire → auto-submit lands on results.
- Study mode: feedback appears per answer, and grading still reaches the pool.
- `npm test`, `npm run lint`, and `npm run build` pass. Build confirms all routes
  prerender and no client-only API leaked into a server component.

## Driving the app in a browser

There is no browser automation in the repo and `chromium-cli` is not available on
this machine. What worked for step 6 was installing `playwright-core` **outside
the repo** (in a scratch directory, so no dependency is added) and driving the
Chrome already installed on the machine via `channel: "chrome"`, which avoids
Playwright's browser download entirely.

```js
const browser = await chromium.launch({ channel: "chrome", args: ["--no-sandbox"] });
```

Two selector traps cost time and will recur:

- `getByRole("button", { name: "Next" })` also matches Next.js's **dev-tools
  button**. Use `{ exact: true }`.
- `innerText` reflects CSS `text-transform`, so the question heading reads
  `QUESTION 3 OF 6`. Compare case-insensitively.
- A bare text match for `Correct` hits the answer-key marker inside `OptionList`
  before the feedback panel. Scope the locator to the panel.

If this becomes routine, `/run-skill-generator` would capture it as a project
skill.

## Docker verification

Both stacks were smoke-tested end to end when added, and are worth re-running
after any change to `docker/` or `next.config.ts`:

```bash
cd docker
docker compose -f compose.prod.yaml up --build   # expect HTTP 200, non-root, healthy
docker compose up --build                        # expect hot reload through the bind mount
```

Hot reload was measured at ~1s on macOS through the `../next-app` bind mount.
Next's own docs still recommend plain `npm run dev` for daily work on
macOS/Windows; the dev container is for parity checks and Linux hosts.
