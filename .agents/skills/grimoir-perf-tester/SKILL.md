---
name: grimoir-perf-tester
description: >-
  Use when running performance tests with k6, generating mock performance fixtures,
  or testing the Performance tab rendering and percentile calculations in Grimoir.
---

# Grimoir Performance Tester Skill

Procedural runbook for generating, testing, and verifying performance test data in Grimoir.

## Standards & Schema
Metric definitions, percentile requirements (`p90`, `p95`), and status indicators are defined in:
👉 [04-performance-k6-standards.md](file:///Users/saul.sosa/Desktop/Proyectos/grimoir/.agents/rules/04-performance-k6-standards.md) (Do not redefine here).

## Procedures

### 1. Generating Mock k6 Fixtures
Generate realistic Playwright + k6 fixtures in `tests/fixtures/demo-output/`:
```bash
bun scripts/generate-demo-data.ts
```

### 2. Available Fixtures
- Real nested k6 summary: `tests/fixtures/k6/real-k6-summary.json`
- Threshold failure & failed scenarios: `tests/fixtures/k6/k6-threshold-failed.json`
- Empty input edge case: `tests/fixtures/k6/k6-empty.json`

### 3. Running Performance Parser Unit Tests
```bash
bun test tests/unit/k6.parser.test.ts
```

### 4. Inspecting the Performance Tab in the Browser
1. Build and generate the HTML report:
   ```bash
   bun run dev:demo
   ```
2. Open `output/index.html` in your browser.
3. Switch to the **Performance** tab to verify metrics, latency distribution cards, and scenario badges.
