# Grimoir Rule: Parser Architecture & Data Contracts

## Purpose
Parsers ingest output from testing frameworks (Playwright, k6, Vitest, Jest, Cypress, etc.) and convert them into Grimoir's unified data model. Every parser must follow strict resilience and typing standards.

## Parser Standards

1. **Defensive Parsing & Fallbacks**:
   - Never assume raw test output contains all expected fields. Test runs can abort prematurely, produce malformed JSON, or lack metrics.
   - Guard against `null`, `undefined`, and unexpected property types.
   - Prevent division by zero when calculating ratios (e.g., `successRate = total > 0 ? Math.round((passed / total) * 100) : 100`).
   - If an error object is a string, handle it gracefully; if it has `{ message, location, snippet }`, extract those safely.

2. **Strict TypeScript Types**:
   - Each parser must export strongly typed interfaces for its output report (e.g., `PlaywrightReport`, `K6Report`).
   - Use discriminant unions or explicit `type: 'playwright' | 'k6'` fields.

3. **Status Normalization**:
   - Standardize all execution outcomes into Grimoir's core statuses:
     - `'passed'`
     - `'failed'`
     - `'flaky'`
     - `'skipped'`

4. **Testing & Fixture Conventions**:
   - Every parser must have comprehensive unit tests in `tests/unit/<tool>.parser.test.ts`.
   - Test suites must cover:
     - Standard successful runs.
     - Runs with failures and flakiness.
     - Empty inputs (`{}` or `{ suites: [] }`, `{ metrics: {} }`).
     - Partial / truncated outputs.
   - Reusable JSON fixtures must be stored under `tests/fixtures/<tool>/`.
