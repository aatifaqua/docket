# Contributing

Thanks for helping. Docket is small on purpose; please keep it that way.

## Setup

```bash
nvm use            # Node 22, see .nvmrc
npm ci
cp server/.env.example server/.env
```

Set `DOCKET_AI_MODE=mock` in `server/.env` if you do not have a Gemini key. Everything, including tests, works in mock mode.

## Before you open a pull request

```bash
npm run verify
```

That runs the format check, lint (zero warnings), typecheck, tests with coverage, and the build. CI runs the same command, so if it is green locally it will be green there.

## Rules of the road

- Facts come from `packages/core`, never from the model. If you add an extractor, it needs a colocated `*.test.ts` and it must keep the core at 100 % coverage.
- Tests run offline. Do not add a test that needs a key or the network.
- Do not change `packages/core/src/types.ts` casually; it is the contract shared by the server and the web app.
- Text shown to users is plain language. Keep the `DISCLAIMER` constant where the design puts it.
- Respect the lint budgets (complexity 10, 60 lines per function, 250 per file). Split rather than suppress.
- Every exported function or component gets a short JSDoc that says what it is for and, where it matters, why it is built that way.
- Never commit `server/.env` or any key. The `.gitignore` already covers it; please do not work around it.

## Commit style

Short and plain, in the imperative: `add employment notice options`, `fix relative date off by one`. One change per commit where practical.

## Pull requests

Fill in the short template. Say what changed, why, and how you tested it. Screenshots help for UI changes; run the axe checks and try keyboard-only once.
