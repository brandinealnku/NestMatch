# AGENTS.md — NestMatch Contributor Instructions

## Source of truth

Before collaborative work, read:

- `NESTMATCH_V2_COLLABORATIVE_SPEC.md`
- `README.md`
- Existing source, tests, and Pages workflow

Treat the Version 2 specification as the product source of truth.

## Work by phase

Do not implement all four phases in one task. When the user names a phase:

1. Implement only that phase.
2. Preserve earlier completed phases.
3. Do not partially implement later phases.
4. Open one focused pull request.

## Guardrails

- Do not rebuild NestMatch from scratch.
- Preserve React, TypeScript, Vite, HashRouter, Demo Mode, scoring, filtering, property details, accessibility, tests, and GitHub Pages.
- Only Love + Love creates a House Match.
- Partner unmatched decisions remain private.
- Never expose or commit service-role keys, API keys, tokens, secrets, or `.env` values.
- Never bypass lint, tests, TypeScript, build, or deployment safeguards.
- Never remove tests merely to make CI pass.
- Avoid unrelated repository-wide rewrites.

## Validation

Run:

```bash
npm install
npm run lint
npm run test
npm run build
```

If a command cannot run, report the exact reason and do not claim success.

Verify `dist/index.html` exists, references compiled assets, does not reference `/src/main.tsx`, and works under `/NestMatch/`.

## Pull request

Use a dedicated branch. The PR body must include the phase, behavior, architecture, files changed, test/lint/build results, privacy/security verification, setup still required, and known limitations.
