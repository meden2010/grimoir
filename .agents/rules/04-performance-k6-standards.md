# Grimoir Rule: Performance & k6 Metrics Standards

## Purpose
Governs how performance data from k6 (and future load testing tools) is ingested, normalized, and displayed in Grimoir's Performance tab.

## Metric Standardization

1. **Duration & Latencies**:
   - Primary metric: `http_req_duration`.
   - Required percentiles and aggregates:
     - `avg` (average latency in ms)
     - `min` (minimum latency in ms)
     - `max` (maximum latency in ms)
     - `p90` (90th percentile latency in ms)
     - `p95` (95th percentile latency in ms)
     - Optional / extended: `p50` (median), `p99`.
   - When reading k6 JSON metrics: map `'p(90)'` to `p90` and `'p(95)'` to `p95`.

2. **Throughput & Volume**:
   - `http_reqs`: total request count (`count`) and requests per second (`rate`).
   - `iterations`: total scenario cycles completed.
   - `vus`: virtual users (current and max).

3. **Error Rates & Health**:
   - `http_req_failed`: error rate (0.0 to 1.0).
   - `failedRequests`: `Math.round(totalRequests * failedRate)`.
   - `successRate`: `Math.round((1 - failedRate) * 100)`.

4. **Scenario Evaluation**:
   - Scenarios report status as `'passed'` or `'failed'`.
   - Scenario failure reason must be captured and reflected in the global Failures drawer in the visual report.

5. **Performance Tab UI Integration**:
   - Render metric summary cards (Total Requests, Success Rate, p95 Latency, Virtual Users).
   - Display latency distribution breakdown (min / avg / p90 / p95 / max).
   - Show table of scenario runs with status badges (sanctified emerald vs corrupted crimson).
