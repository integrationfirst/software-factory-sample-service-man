# Service Management

A simple internal web app for managing the organization's services (IT, HR,
Office and similar). Through a GUI, staff list, create, update and retire
services.

The app is a single-page app built with Vite, React and TypeScript (strict
mode), styled with Tailwind CSS v4 and tested with Vitest and React Testing
Library. Dependencies are managed with npm.

## Layout

- Theme (design tokens): the `@theme` block in `src/index.css`. Use its tokens
  (`bg-brand-700`, `text-text-muted`, `font-sans`, ...) instead of raw values.
- Shared components: `src/components/`.
- Pages: `src/pages/`.
- Tests sit next to the code they cover, as `*.test.tsx`. The test setup is
  `src/test/setup.ts`.
- Section registry: `src/sections.ts`. Its `sections` array drives both the
  sidebar links and the routes in `src/App.tsx`.
- App frame: `src/components/AppLayout.tsx` (header, sidebar and `<main>`),
  `src/components/Sidebar.tsx` (the `<nav aria-label="Main">`) and
  `src/components/Header.tsx` (top bar with the phone menu button).
- Unknown URLs render `src/pages/NotFoundPage.tsx` inside the frame.
- `src/main.tsx` wraps `App` in `BrowserRouter`; tests render `App` under a
  `MemoryRouter` with `initialEntries`.

### Adding a section

1. Create the page in `src/pages/`.
2. Add one entry to `sections` in `src/sections.ts`: `label`, `path`,
   `component` and an optional `icon`. The sidebar link and the route follow
   from it; don't hard-code the label, path or page anywhere else.
3. Add a test for the page next to it.

The first entry is where `/` redirects, and where the not-found page links.

## Setup

A fresh checkout needs:

- `npm ci`

No env files are needed.

## Dev server

`npm run dev -- --port <port>`. It uses a strict port: when the port is busy
it exits with an error instead of moving to another port.

## Validation

- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run build`

`bash factory/checks.sh` runs every check and must exit 0.

## Software factory

`/factory run` builds every open GitHub issue labeled `factory` through
intake → spec → build → gate → review → approve, one PR per issue. State is in
`factory/jobs/` (gitignored); `factory/bin/job` is its only writer. Checks:
`factory/checks.sh`. Dashboard: `cd factory && python3 -m http.server`, then
open http://localhost:8000/dashboard.html.

When a job needs input (`needs-info`) or a human decision (`needs-human`),
`factory/bin/notify` sends a Telegram message. It uses
`FACTORY_TELEGRAM_BOT_TOKEN` and `FACTORY_TELEGRAM_CHAT_ID`, or falls back to
the Claude Code Telegram plugin's bot and its single allowlisted user. Test it
with `factory/bin/notify --test`; turn it off with `notify.telegram` in
`factory/config.json`.

Each job works in its own git worktree, a full checkout of the repo at
`.worktrees/<job-id>` (gitignored). A tool run from the repo root that doesn't
read `.gitignore` sees those copies too; exclude `.worktrees/` in its config.
