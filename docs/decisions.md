# Architecture decision records

Short records of the choices that shape Docket. Each one states the context, the decision, and what it costs or buys us. See [DESIGN.md](DESIGN.md) for the full design.

## ADR-001: Deterministic core, language model as a language layer

**Context.** The product surfaces dates, dollar amounts, and options to people under time pressure. A hallucinated deadline is worse than no deadline. Language models are excellent at explanation and poor at being a reliable source of facts pulled from a document.

**Decision.** Every fact (document kind, deadlines, obligations, amounts, options) is produced by typed, unit-tested TypeScript in `packages/core`. Gemini receives that structured result together with the document and is asked only to explain it, under a JSON schema whose fields are prose, option notes keyed by existing option ids, checklist items keyed by existing deadline ids, and glossary entries.

**Consequences.** No date, amount, or option can be invented by the model. Extraction quality is bounded by our parsers, so unusual phrasing can be missed; the UI compensates by showing the source sentence for every extracted item and by telling the user to confirm with the issuing body. Core logic is testable to 100 % coverage offline.

## ADR-002: Svelte 5 + Hono + a shared core workspace

**Context.** We need a small browser app, a small API, and one place for the domain logic that both can use.

**Decision.** An npm workspace with three packages: `@docket/core` (pure TypeScript, zero dependencies, no I/O), `server` (Hono on `@hono/node-server`), and `web` (Svelte 5 with Vite and one hand-written CSS file). No UI library.

**Consequences.** The browser can import the core directly, which is what makes the GitHub Pages demo possible without a backend. Hono keeps the server dependency tree tiny and testable through `app.request()`. Svelte 5 runes give a small bundle and plain HTML output that is easy to make accessible. The cost is that three packages need three test setups and consistent lint configuration, which the root ESLint and Prettier config provides.

## ADR-003: No database; a bounded in-memory TTL store

**Context.** Analyses must survive long enough for the follow-up Ask feature, but the documents people paste are sensitive and the product has no accounts.

**Decision.** A `Map` bounded to 200 analyses with a 24-hour TTL, oldest evicted first. Document text is kept only in that entry and dies with it. Nothing is written to disk.

**Consequences.** Zero persistence to secure, back up, or wipe on request; a restart clears everything, which is acceptable because every result is reproducible from the text. It does not scale across processes, which is fine for a single-instance tool and is an explicit non-goal. If multi-instance deployment is ever needed, the store interface is the seam to replace.

## ADR-004: Gemini structured output with zod post-validation and a model chain

**Context.** The briefing is rendered into typed UI components. A malformed or partial response must never reach them, and single-model availability is not something we control.

**Decision.** Call `generateContent` with `responseMimeType: application/json`, a `responseSchema`, `temperature 0.2`, and a 20-second abort timeout. Parse the result with zod. Try `gemini-3.8-flash`, then `gemini-3.6-flash`, then `gemini-3.5-flash`, with one retry and backoff on 429 or 503 before moving down the chain. Any failure after the chain falls back to the deterministic briefing with `source: 'fallback'`.

**Consequences.** The UI can trust the shape of every briefing. Responses are honest about their origin, so a user sees when the model was not involved. Latency is bounded even during an outage. After validation, option notes and checklist links that reference ids the model did not receive are dropped, which is a second guard against invented content.

## ADR-005: The deterministic fallback briefing is a first-class path

**Context.** Tests and CI cannot depend on a paid network service, and a product that turns blank during a model outage is not trustworthy.

**Decision.** `buildFallbackBriefing(core)` produces a complete `Briefing` from the structured analysis alone. `DOCKET_AI_MODE=mock` routes every request through it and never opens a socket. The same function is the outage path in live mode. It is tested to the same standard as the extractors.

**Consequences.** Every test runs offline and deterministically. The fallback prose is plainer and less tailored than a model briefing, and the response marks it as `fallback` so the UI can say so. Because the fallback exists, no code path can end without a briefing.

## ADR-006: One disclaimer, four surfaces

**Context.** The product must assist rather than replace professional advice, and that boundary must be impossible to lose in a refactor.

**Decision.** A single `DISCLAIMER` constant in `packages/core/src/types.ts` is rendered at the top of every view, returned in every `Analysis`, embedded in every prompt, and included by every fallback path. The system prompt also instructs the model to recommend a licensed professional for decisions.

**Consequences.** There is exactly one string to review and translate. API consumers other than our UI still receive the boundary. A test can grep for it on all four surfaces.

## ADR-007: Demo mode on GitHub Pages runs the core in the browser

**Context.** A public demo should not expose a Gemini key or run an unauthenticated model endpoint for the world, but a demo that does nothing is useless.

**Decision.** When `VITE_API_BASE` is empty the web client imports `@docket/core` and runs the full deterministic analysis in the browser. Three sample notices ship with pre-generated Gemini briefings; pasted text gets the deterministic fallback briefing and a visible demo-mode note. Ask is disabled with an explanation. PDF upload is server-only.

**Consequences.** The demo is static, free, and safe to leave online. Visitors see real Gemini prose for the samples and real extraction for their own text. Differences from the full product are stated on screen rather than hidden.

## ADR-008: Severity by calendar-day proximity and deadline kind

**Context.** Users need to know what to do first. Legal timing rules vary by jurisdiction and are out of scope.

**Decision.** `buildTimeline` sorts deadlines soonest first (undated last) and assigns `critical` when the deadline is within 7 calendar days of the reference date or its kind is `appear` or `vacate`, `important` within 30 days, otherwise `info`. Severity is always shown as icon plus text.

**Consequences.** Simple, explainable, and testable. It can be conservative or generous relative to actual court rules, so the UI states that the maths is calendar days and tells the user to confirm with the issuing body or a professional.

## ADR-009: In-process rate limiting

**Context.** The analyse endpoint costs a model call. The product is a single-instance tool with no accounts.

**Decision.** A fixed-window limiter, 60 requests per minute per IP, kept in memory alongside the analysis store. Combined with the SHA-256 content cache, repeated submissions of the same document cost nothing.

**Consequences.** No external dependency and no configuration beyond one env var. Limits reset on restart and are not shared across processes, which matches the deployment model. A reverse proxy can add a second layer without code changes.

## ADR-010: Complexity budgets enforced by lint

**Context.** A small codebase stays maintainable only if size and branching are kept in check by a tool rather than by reviewers' patience.

**Decision.** ESLint with `typescript-eslint` `strictTypeChecked` and `stylistic`, plus `complexity: 10`, `max-lines-per-function: 60`, `max-lines: 250`, `max-depth: 3`, `max-params: 4`, and `--max-warnings 0`. TypeScript strict with `noUncheckedIndexedAccess` and `exactOptionalPropertyTypes`. CI fails on any violation.

**Consequences.** Modules stay small and single-purpose, which is why the core is split into one file per extractor. Occasionally a natural function must be split to satisfy the budget; that split has so far produced clearer names rather than worse code.
