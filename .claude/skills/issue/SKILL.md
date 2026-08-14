---
name: issue
description: Work a GitHub issue end to end — select or look up the issue, branch from main, plan it, commit each step separately, then open a PR. Use when asked to work on an issue, pick up the next issue, or when given an issue number, title, or URL.
---

# Working an issue

Takes one GitHub issue from "not started" to "PR open". Every step below is
sequential; do not skip ahead to writing code.

**This skill carries commit authority.** Normally work stops for the user to
review and commit. Here you commit each plan item yourself. You still never
merge, never push to `main`, and never close the issue by hand.

## 1. Select the issue

**Given an argument:**

- A number or URL → `gh issue view <n> --comments`
- Text → `gh issue list --search "<text>" --state open` and match on title. If
  several match, ask which.

**Given nothing** — pick one:

```bash
gh issue list --state open --limit 20 \
  --json number,title,labels,assignees,createdAt,updatedAt
```

Prefer, in order: unassigned over assigned; `bug` over `enhancement` over the
rest; older over newer. Skip anything labelled `wontfix`, `duplicate`,
`invalid`, or `question` — those are not ready to build.

State which issue you chose and why, then **confirm with `AskUserQuestion`**
before creating a branch. Working the wrong issue wastes the whole run. If the
user has said to just take the next one, skip the confirmation.

If there are no open issues, say so and stop. Do not invent work.

## 2. Read it properly

```bash
gh issue view <n> --comments
```

- Pull out the **actual ask** and any acceptance criteria.
- **Read the comments.** They frequently narrow, expand, or overturn the
  original body, and the last word usually wins.
- Check whether a branch or PR already exists for it:
  `git branch -a --list "*<n>-*"` and `gh pr list --search "<n>"`.
- Read `CLAUDE.md`, `docs/architecture.md`, and `docs/decisions.md`. If the issue
  proposes something `decisions.md` already rejected, say so before building it.

If something genuinely ambiguous would change what you build, **ask now** — not
after three commits. If it is only a detail, pick the sensible default, state the
assumption, and carry on.

## 3. Branch

```bash
git fetch origin
git switch -c <type>/<number>-<slug> origin/main
```

Always branch from a freshly fetched `origin/main`. Never commit to `main` or
`dev` directly.

### Branch name

The format is fixed: **`<type>/<number>-<slug>`**. Derive it, do not invent one —
the same issue must always produce the same branch name.

**`<type>`** comes from the issue's labels:

| Label            | Type    |
| ---------------- | ------- |
| `bug`            | `fix`   |
| `enhancement`    | `feat`  |
| `documentation`  | `docs`  |
| anything else, or no labels | `chore` |

If an issue carries several of these, take the **first match reading down that
table** — `bug` wins over `enhancement`, which wins over `documentation`. A bug
fix that also improves docs is still a `fix`.

**`<number>`** is the bare issue number, no `#`.

**`<slug>`** is derived from the issue title:

1. Lowercase it.
2. Drop anything that is not a letter, digit, or space — including `'`, `"`,
   `/`, `:`, and emoji.
3. Collapse whitespace to single hyphens.
4. Drop leading filler that adds nothing: `the`, `a`, `an`, and a leading verb
   already implied by the type (`fix`, `add`, `update` on a `fix`/`feat` branch).
5. Keep the first **5 words or 40 characters**, whichever comes first, and never
   end on a hyphen.

Examples:

| Issue                                              | Branch                              |
| -------------------------------------------------- | ----------------------------------- |
| #42 `bug` — "Timer resets on refresh"               | `fix/42-timer-resets-on-refresh`    |
| #7 `enhancement` — "Add an export/import button"    | `feat/7-export-import-button`       |
| #13 `documentation` — "README: clarify Docker ports"| `docs/13-readme-clarify-docker-ports` |
| #58 no labels — "Bump Next.js to 16.4"              | `chore/58-bump-nextjs-to-164`       |

If that branch name already exists locally or on the remote, **do not invent a
variant** — the issue is already being worked. Check it out and continue, or stop
and ask.

## 4. Plan

Write the plan with `TodoWrite`. **One item = one commit = one reviewable unit.**

- Order items so the tree is working after each one. Pure logic before UI; a
  schema change before the code that depends on it.
- Documentation is **not** a separate item. Per `CLAUDE.md`, docs ship in the
  same commit as the change that made them stale.
- If an item turns out to be two things, or the plan is wrong, update the todo
  list rather than quietly absorbing the difference — the PR reports mid-flight
  changes, so they need to be visible.

## 5. Work the plan, committing each item

For each item, from `next-app/`:

```bash
npm test && npm run typecheck && npm run lint
```

`npm run build` too when routes, config, or content changed. On a clean checkout
`typecheck` fails with `Cannot find name 'LayoutProps'` until a build has
generated route types — run `npm run build` first, it is not a real failure.

Do not commit on a red check. Fix it, or revise the plan.

Commit message: imperative subject under ~70 characters, a body when the *why*
is not obvious, then:

```
Refs #<number>

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
```

Use `Refs #<n>` on individual commits and save `Closes #<n>` for the PR, so the
issue closes on merge rather than on the first commit.

## 6. Open the PR

```bash
git push -u origin <branch>
```

Fill in `.github/pull_request_template.md` — **`gh` will not apply it for you**;
`--body-file` bypasses it entirely. Write the filled body to the scratchpad, not
into the working tree.

```bash
gh pr create --base main --head <branch> \
  --title "<title>" --body-file <scratchpad>/pr-body.md
```

- Put `Closes #<number>` in the **Introduction** so merging closes the issue.
- **Build plan** is the ordered narrative of what you actually did, including
  steps added or dropped along the way.
- **Known issues and gaps** must state what you did *not* verify. An untested
  path that goes unmentioned is worse than one that is named.

Report the PR URL and a short summary of what changed and what was verified.

## Guardrails

- Never force-push, never merge, never close the issue manually.
- Stay inside the issue's scope. If you find unrelated problems, mention them in
  the PR's Notes or offer to file a follow-up issue — do not fix them here.
- If the work turns out to need a decision that is the user's to make, stop and
  ask rather than guessing across several commits.
