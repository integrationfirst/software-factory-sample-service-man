#!/usr/bin/env bash
# The repo's checks. Exit 0 only when the branch is fit to review.
#
# The gate runs this script from the main checkout with the job's worktree as
# the working directory. Keep it fast, deterministic and non-interactive: no
# watch modes, no prompts, nothing that rewrites files.
#
# The project has no stack yet, so this script detects one and runs whatever
# checks it defines. Once the stack is settled, replace the detection with the
# project's exact commands (and keep AGENTS.md in sync).
set -euo pipefail

ran=0

# --- Node (package.json) -----------------------------------------------------
if [[ -f package.json ]]; then
  if   [[ -f pnpm-lock.yaml ]]; then pm=pnpm; corepack enable >/dev/null 2>&1 || true; pnpm install --frozen-lockfile
  elif [[ -f yarn.lock ]];      then pm=yarn; corepack enable >/dev/null 2>&1 || true; yarn install --immutable
  elif [[ -f package-lock.json ]]; then pm=npm; npm ci --prefer-offline --no-audit --no-fund
  else
    echo "package.json has no lockfile; commit one so installs are reproducible." >&2
    exit 1
  fi
  has_script() { node -e "process.exit((require('./package.json').scripts||{})['$1'] ? 0 : 1)"; }
  for s in lint typecheck test build; do
    if has_script "$s"; then
      echo "== $pm run $s"
      if [[ $s == test ]]; then CI=true "$pm" run test; else "$pm" run "$s"; fi
      ran=1
    fi
  done
fi

# --- Python (pyproject.toml / requirements.txt) -------------------------------
if [[ -f pyproject.toml || -f requirements.txt ]]; then
  venv=.venv-checks
  python3 -m venv "$venv"
  "$venv/bin/pip" install -q --upgrade pip
  if [[ -f requirements.txt ]]; then "$venv/bin/pip" install -q -r requirements.txt; fi
  if [[ -f requirements-dev.txt ]]; then "$venv/bin/pip" install -q -r requirements-dev.txt; fi
  if [[ -f pyproject.toml ]]; then "$venv/bin/pip" install -q -e ".[dev]" 2>/dev/null || "$venv/bin/pip" install -q -e .; fi
  if [[ -x $venv/bin/ruff ]]; then echo "== ruff"; "$venv/bin/ruff" check .; "$venv/bin/ruff" format --check .; ran=1; fi
  if [[ -x $venv/bin/mypy ]]; then echo "== mypy"; "$venv/bin/mypy" .; ran=1; fi
  if [[ -x $venv/bin/pytest ]]; then echo "== pytest"; "$venv/bin/pytest" -q; ran=1; fi
fi

if [[ $ran == 1 ]]; then
  echo "All checks passed."
  exit 0
fi

# Nothing ran. That is fine only while the repo holds no application code yet
# (just the factory, docs and config); otherwise the stack is unrecognised.
code=$(git ls-files --cached --others --exclude-standard \
  | grep -vE '^(\.claude/|factory/|\.github/|docs/|[^/]*\.md$|\.gitignore$|\.gitattributes$|\.editorconfig$|LICENSE)' || true)
if [[ -z $code ]]; then
  echo "No application code yet; nothing to check." >&2
  exit 0
fi
echo "Found application code but no recognised checks (Node scripts lint/typecheck/test/build, or ruff/mypy/pytest)." >&2
echo "Add test/build scripts the detection understands, or have a human update factory/checks.sh." >&2
exit 1
