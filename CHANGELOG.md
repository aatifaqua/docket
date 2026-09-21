# Changelog

All notable changes to this project are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses [Semantic Versioning](https://semver.org/).

## [Unreleased]

## [0.1.0] - 2026-09-21

### Added

- `@docket/core`: document classifier for eviction notices, demand letters, court summonses, debt-collection letters, employment notices, and insurance denials, with `unknown` fallback.
- `@docket/core`: extraction of deadlines (absolute and relative), obligations, and money amounts with source sentences; severity-ranked timeline; options catalogue per document kind.
- `@docket/core`: input sanitiser, deterministic fallback briefing and answer, and three fictional sample notices.
- Server: Hono API with `GET /api/health`, `POST /api/analyze` (JSON or `.txt`/`.pdf` upload), `GET /api/analysis/:id`, and `POST /api/analysis/:id/ask`.
- Server: Gemini structured-output briefing with model chain, retry, timeout, zod validation, and deterministic fallback; `DOCKET_AI_MODE=mock` for offline use.
- Server: secure headers, CORS allowlist, rate limiting, body and file limits, SHA-256 content cache, bounded in-memory TTL store.
- Web: Svelte 5 app with intake (paste, keyboard-operable file drop, reference date, sample chips) and results (disclaimer, summary, timeline, options, checklist, prep sheet, glossary, grounded Ask panel).
- Web: demo mode that runs the core in the browser for GitHub Pages; light and dark themes; print stylesheet; reduced-motion support.
- Repository: CI workflow (format, lint, typecheck, test, build, audit), GitHub Pages workflow, Dependabot, design document, ADRs, security policy.

[Unreleased]: https://github.com/aatifaqua/docket/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/aatifaqua/docket/releases/tag/v0.1.0
