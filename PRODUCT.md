# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

QA engineers, SDETs, frontend/backend developers, and performance engineers reviewing automated test runs (Playwright E2E, Vitest/Jest unit, Postman/Newman API) alongside load and performance test executions (k6) in local development or CI/CD pipelines. Their primary job is to quickly assess release health, isolate failing tests or breached performance thresholds, inspect stack traces/steps/artifacts, and compare historical execution trends without switching between multiple separate reporting tools.

## Product Purpose

Grimoir is a unified testing report CLI and static HTML generator that consolidates E2E, unit, API, and k6 performance test outputs into a single, self-contained, offline-capable visual report with an illuminated "Arcane Dark" aesthetic. Success means a developer or QA engineer can open one standalone HTML artifact and immediately understand overall build health, drill into failure root causes (steps, retries, traces, screenshots), and evaluate latency percentiles (`avg`, `min`, `max`, `p90`, `p95`), throughput (`req/s`), and error rates.

## Positioning

Unlike single-framework reporters (Playwright HTML report, Allure, or k6 cloud dashboards) that isolate functional tests from load testing or require a running server/multi-file directory, Grimoir ingests heterogeneous JSON test summaries and bundles them into a single portable HTML file (`src/report/template.ts`) with zero runtime server dependencies and a cohesive Arcane Dark visual identity.

## Operating Context

- Generated via CLI (`grimoir` / `bun src/cli/index.ts`) locally or inside GitHub Actions / CI pipelines across Node.js 18, 20, and 22.
- Viewed as a standalone HTML file (`output/index.html`) in desktop or mobile browsers, either locally (`file://` or preview server) or downloaded from CI build artifacts.
- Operates across three primary analytical views:
  1. **Overview**: Global Health Score gauge, total execution count, framework coverage chips, status & duration charts, global Failures table, historical trends (last 20 runs), and collapsible KPI summaries.
  2. **Automated**: Split-pane explorer (tree navigation with search/tag/status filters on the left; step-by-step execution details, retries, and full-screen Allure-style inspection modal on the right).
  3. **Performance**: k6 load testing dashboard featuring core KPIs (`p95` latency, `http_req_failed` error rate, `http_reqs` throughput, threshold compliance), ingestion warnings, and scenario/threshold detail tables.

## Capabilities and Constraints

- **Universal Node.js Compatibility (Rule 1)**: Compiled distribution (`dist/`) must run on Node.js >= 18 without Bun runtime APIs (`Bun.*` or `bun:*`).
- **Single-File Bundling Contract (Rule 2)**: `src/report/template.html`, `src/report/styles.css`, and `src/report/script.js` are inlined by `src/report/template.ts` into one standalone HTML file.
- **Parser Resilience (Rule 3)**: Defensive ingestion of Playwright, k6, Postman, and Vitest outputs, normalizing all statuses to `'passed' | 'failed' | 'flaky' | 'skipped'`.
- **Performance Metrics Standard (Rule 4)**: Must surface `avg`, `min`, `max`, `p90`, `p95`, total requests, rate (`req/s`), `http_req_failed`, success rate (`%`), and `vus`, bubbling failed scenarios into the global failure view.

## Brand Commitments

- **Arcane Dark Identity (Rule 2)**: Mystical, illuminated diagnostic grimoire aesthetic using obsidian/slate surfaces (`#0B0C10`, `#13171F`, `#1F2833` / `#15121b`, `#0f0d15`, `#211e27`), Arcane Gold (`#C5A059` / `#FBBF24`), Sorcery Violet (`#8A4FFF` / `#8B5CF6`), Ether Cyan (`#45A29E`), and semantic status colors (`#2ECC71` passed, `#E74C3C` failed, `#F39C12` flaky, `#7F8C8D` skipped).
- **Four Fixed Font Families**: `Cinzel` (display/monumental titles & counters), `Playfair Display` (editorial titles), `Inter` (UI body & controls), and `JetBrains Mono` (code, stack traces, durations, and numeric metrics).
- **Motion Library**: Subtle, non-blocking micro-animations powered by **Anime.js** and CSS transitions.

## Evidence on Hand

- Report source files: `src/report/template.html`, `src/report/styles.css`, `src/report/script.js`, and bundler `src/report/template.ts`.
- Real test fixtures in `tests/fixtures/` (`playwright`, `k6`, `postman`, `vitest`) and demo generator (`bun run dev:demo` -> `output/index.html`).

## Product Principles

1. **Diagnostic Clarity First**: Mystical atmosphere must elevate—never obscure—test failures, stack traces, and latency percentiles.
2. **Zero-Server Portability**: Every report must work as a self-contained artifact that can be shared, archived, or opened directly from CI.
3. **Cross-Discipline Unity**: Functional E2E/unit/API results and k6 performance metrics belong in one unified health narrative, with all failures surfacing in the global triage view.
4. **Defensive Precision**: Never crash or render `NaN`/`undefined` on malformed or partial test outputs; guard every calculation and escape all untrusted test strings.

## Accessibility & Inclusion

- Semantic HTML landmarks, keyboard-dismissible modals (`Esc`), sufficient text contrast against dark obsidian surfaces (WCAG AA 4.5:1 target), and respect for `prefers-reduced-motion` when animating counters and tab transitions.
