export interface K6ThresholdStatus {
  name: string;
  metric: string;
  pass: boolean;
}

export interface K6ThresholdSummary {
  status: 'passed' | 'failed' | 'none';
  total: number;
  passed: number;
  failed: number;
  items: K6ThresholdStatus[];
}

export interface K6V1Metrics {
  p95LatencyMs: number | null;     // 1. Latencia p95 (http_req_duration) en ms
  errorRatePercent: number | null; // 2. Tasa de error (http_req_failed) en %
  throughputRps: number | null;    // 3. Throughput (http_reqs) en req/s
  avgLatencyMs?: number | null;
  minLatencyMs?: number | null;
  maxLatencyMs?: number | null;
  p90LatencyMs?: number | null;
  vus?: number | null;
  vusMax?: number | null;
}

export interface K6Scenario {
  vus: number;
  iterations: number;
  status: 'passed' | 'failed';
}

export interface K6Report {
  type: 'k6';
  metrics: K6V1Metrics;
  thresholds: K6ThresholdSummary;
  warnings: string[];
  stats: {
    totalRequests: number;
    failedRequests: number;
    successRate: number;
    duration: number;
    totalScenarios: number;
    passedScenarios: number;
  };
  scenarios: Record<string, K6Scenario>;
}

function extractValues(metricObj: unknown): Record<string, unknown> | null {
  if (!metricObj || typeof metricObj !== 'object') {
    return null;
  }
  const obj = metricObj as Record<string, unknown>;
  if (obj['values'] && typeof obj['values'] === 'object') {
    return obj['values'] as Record<string, unknown>;
  }
  return obj;
}

export function parseK6(rawJson: Record<string, unknown>): K6Report {
  const warnings: string[] = [];

  if (!rawJson || typeof rawJson !== 'object') {
    warnings.push('k6 summary is empty or malformed: metrics object missing');
    return {
      type: 'k6',
      metrics: {
        p95LatencyMs: null,
        errorRatePercent: null,
        throughputRps: null,
        avgLatencyMs: null,
        minLatencyMs: null,
        maxLatencyMs: null,
        p90LatencyMs: null,
        vus: null,
        vusMax: null,
      },
      thresholds: {
        status: 'none',
        total: 0,
        passed: 0,
        failed: 0,
        items: [],
      },
      warnings,
      stats: {
        totalRequests: 0,
        failedRequests: 0,
        successRate: 100,
        duration: 0,
        totalScenarios: 0,
        passedScenarios: 0,
      },
      scenarios: {},
    };
  }

  const rawMetrics = rawJson['metrics'];
  if (!rawMetrics || typeof rawMetrics !== 'object') {
    warnings.push('k6 summary is empty or malformed: metrics object missing');
  }

  const metricsObj = (rawMetrics && typeof rawMetrics === 'object')
    ? (rawMetrics as Record<string, unknown>)
    : {};

  // 1. Latencia p95 y distribución (http_req_duration) en ms
  let p95LatencyMs: number | null = null;
  let avgLatencyMs: number | null = null;
  let minLatencyMs: number | null = null;
  let maxLatencyMs: number | null = null;
  let p90LatencyMs: number | null = null;
  const durationValues = extractValues(metricsObj['http_req_duration']);
  if (durationValues) {
    const p95 = durationValues['p(95)'] ?? durationValues['p95'];
    if (typeof p95 === 'number' && !Number.isNaN(p95)) {
      p95LatencyMs = Number(p95.toFixed(2));
    } else {
      warnings.push("Missing metric: http_req_duration.values['p(95)']");
    }
    const avg = durationValues['avg'];
    if (typeof avg === 'number' && !Number.isNaN(avg)) avgLatencyMs = Number(avg.toFixed(2));
    const min = durationValues['min'];
    if (typeof min === 'number' && !Number.isNaN(min)) minLatencyMs = Number(min.toFixed(2));
    const max = durationValues['max'];
    if (typeof max === 'number' && !Number.isNaN(max)) maxLatencyMs = Number(max.toFixed(2));
    const p90 = durationValues['p(90)'] ?? durationValues['p90'];
    if (typeof p90 === 'number' && !Number.isNaN(p90)) p90LatencyMs = Number(p90.toFixed(2));
  } else {
    warnings.push('Missing metric: http_req_duration (p95 latency is unavailable)');
  }

  // Virtual Users (vus)
  let vus: number | null = null;
  let vusMax: number | null = null;
  const vusValues = extractValues(metricsObj['vus']);
  if (vusValues) {
    const val = vusValues['value'] ?? vusValues['vus'];
    if (typeof val === 'number' && !Number.isNaN(val)) vus = Math.round(val);
    const maxVal = vusValues['max'];
    if (typeof maxVal === 'number' && !Number.isNaN(maxVal)) vusMax = Math.round(maxVal);
  }

  // 2. Tasa de error (http_req_failed) en %
  let errorRatePercent: number | null = null;
  const failedValues = extractValues(metricsObj['http_req_failed']);
  if (failedValues) {
    const rate = failedValues['rate'];
    if (typeof rate === 'number' && !Number.isNaN(rate)) {
      errorRatePercent = Number((rate * 100).toFixed(2));
    } else {
      warnings.push('Missing metric: http_req_failed.values.rate');
    }
  } else {
    warnings.push('Missing metric: http_req_failed (error rate is unavailable)');
  }

  // 3. Throughput (http_reqs) en req/s
  let throughputRps: number | null = null;
  const reqsValues = extractValues(metricsObj['http_reqs']);
  if (reqsValues) {
    const rate = reqsValues['rate'];
    if (typeof rate === 'number' && !Number.isNaN(rate)) {
      throughputRps = Number(rate.toFixed(2));
    } else {
      warnings.push('Missing metric: http_reqs.values.rate');
    }
  } else {
    warnings.push('Missing metric: http_reqs (throughput req/s is unavailable)');
  }

  // Thresholds extraction
  const thresholdItems: K6ThresholdStatus[] = [];
  let passedThresholds = 0;
  let failedThresholds = 0;

  for (const [metricKey, metricValue] of Object.entries(metricsObj)) {
    if (metricValue && typeof metricValue === 'object') {
      const mObj = metricValue as Record<string, unknown>;
      const rawThresholds = mObj['thresholds'];
      if (rawThresholds && typeof rawThresholds === 'object') {
        for (const [threshName, threshVal] of Object.entries(rawThresholds as Record<string, unknown>)) {
          const isOk: boolean = Boolean(
            threshVal &&
            typeof threshVal === 'object' &&
            (threshVal as Record<string, unknown>)['ok'] === true
          );
          thresholdItems.push({
            name: threshName,
            metric: metricKey,
            pass: isOk,
          });
          if (isOk) {
            passedThresholds++;
          } else {
            failedThresholds++;
          }
        }
      }
    }
  }

  const totalThresholds = passedThresholds + failedThresholds;
  const thresholdStatus: 'passed' | 'failed' | 'none' =
    totalThresholds === 0 ? 'none' : failedThresholds > 0 ? 'failed' : 'passed';

  // Scenarios extraction
  const scenarios: Record<string, K6Scenario> = {};
  const rawScenarios = rawJson['scenarios'];
  if (rawScenarios && typeof rawScenarios === 'object') {
    for (const [key, val] of Object.entries(rawScenarios as Record<string, unknown>)) {
      if (val && typeof val === 'object') {
        const s = val as Record<string, unknown>;
        scenarios[key] = {
          vus: Number(s['vus'] ?? 0),
          iterations: Number(s['iterations'] ?? 0),
          status: s['status'] === 'failed' ? 'failed' : 'passed',
        };
      }
    }
  }

  const scenarioEntries = Object.entries(scenarios);
  const totalScenarios = scenarioEntries.length;
  const passedScenarios = scenarioEntries.filter(([, s]) => s.status === 'passed').length;

  const totalRequests = typeof reqsValues?.['count'] === 'number' ? Number(reqsValues['count']) : 0;
  const failedRate = typeof failedValues?.['rate'] === 'number' ? Number(failedValues['rate']) : 0;
  const failedRequests = Math.round(totalRequests * failedRate);
  const successRate = totalRequests > 0 ? Math.max(0, Math.min(100, Math.round((1 - failedRate) * 100))) : 100;
  const rawDuration = typeof rawJson['duration'] === 'number' ? rawJson['duration'] : (Number(durationValues?.['avg'] ?? 0));

  return {
    type: 'k6',
    metrics: {
      p95LatencyMs,
      errorRatePercent,
      throughputRps,
      avgLatencyMs,
      minLatencyMs,
      maxLatencyMs,
      p90LatencyMs,
      vus,
      vusMax,
    },
    thresholds: {
      status: thresholdStatus,
      total: totalThresholds,
      passed: passedThresholds,
      failed: failedThresholds,
      items: thresholdItems,
    },
    warnings,
    stats: {
      totalRequests,
      failedRequests,
      successRate,
      duration: rawDuration,
      totalScenarios,
      passedScenarios,
    },
    scenarios,
  };
}
