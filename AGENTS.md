# Service Management

A simple internal web app for managing the organization's services (IT, HR,
Office and similar). Through a GUI, staff list, create, update and retire
services.

The repo has no application code yet: the stack, framework and layout are
still to be chosen. Whoever scaffolds the app must update this file with the
real commands below and the location of the design tokens / theme and shared
components.

## Setup

A fresh checkout needs:

- TODO: install dependencies (e.g. `npm ci`)
- TODO: env files to copy (e.g. `cp .env.example .env`)

## Dev server

TODO: how to start it on a given port, e.g. `PORT=<port> npm run dev`.

## Validation

`bash factory/checks.sh` runs every check and must exit 0. Until the stack is
fixed it detects it: for Node, the `lint`, `typecheck`, `test` and `build`
package scripts (with a committed lockfile); for Python, `ruff`, `mypy` and
`pytest`. Any new project must expose its checks in one of those forms.

## Software factory

`/factory run` builds every open GitHub issue labeled `factory` through
intake → spec → build → gate → review → approve, one PR per issue. State is in
`factory/jobs/` (gitignored); `factory/bin/job` is its only writer. Checks:
`factory/checks.sh`. Dashboard: `cd factory && python3 -m http.server`, then
open http://localhost:8000/dashboard.html.

Each job works in its own git worktree, a full checkout of the repo at
`.worktrees/<job-id>` (gitignored). A tool run from the repo root that doesn't
read `.gitignore` sees those copies too; exclude `.worktrees/` in its config.
