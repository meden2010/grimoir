export const K6_METRIC_KEYS = {
  HTTP_REQ_DURATION: 'http_req_duration',
  HTTP_REQ_FAILED: 'http_req_failed',
  HTTP_REQS: 'http_reqs',
} as const;

export const STANDARD_K6_METRICS = new Set<string>([
  'http_req_duration',
  'http_req_failed',
  'http_reqs',
  'http_req_blocked',
  'http_req_connecting',
  'http_req_tls_handshaking',
  'http_req_sending',
  'http_req_waiting',
  'http_req_receiving',
  'vus',
  'vus_max',
  'iterations',
  'iteration_duration',
  'group_duration',
  'data_sent',
  'data_received',
  'checks',
]);

const HTTP_PHASE_DEFINITIONS: ReadonlyArray<{ key: string; label: string }> = [
  { key: 'http_req_blocked', label: 'Blocked' },
  { key: 'http_req_connecting', label: 'Connecting' },
  { key: 'http_req_tls_handshaking', label: 'TLS Handshake' },
  { key: 'http_req_sending', label: 'Sending' },
  { key: 'http_req_waiting', label: 'Waiting (TTFB)' },
  { key: 'http_req_receiving', label: 'Receiving' },
];

export interface K6ThresholdStatus {
  name: string;
  metric: string;
  pass: boolean;
  actualValue: string;
  reason: string;
}

export interface K6ThresholdSummary {
  status: 'passed' | 'failed' | 'none';
  total: number;
  passed: number;
  failed: number;
  items: K6ThresholdStatus[];
}

export interface K6CheckItem {
  name: string;
  path: string;
  passes: number;
  fails: number;
  passRate: number;
  status: 'passed' | 'failed';
  reason: string;
}

export interface K6HttpPhaseMetric {
  key: string;
  label: string;
  avgMs: number;
  p95Ms: number;
  maxMs: number;
}

/**
 * Normalized custom k6 metric (Trend, Counter, Rate, or Gauge).
 * Note: For `type === 'rate'`, `values.rate` is normalized to a percentage (0..100)
 * rounded to 2 decimal places. For `type === 'counter'`, `values.rate` is per-second
 * throughput (ops/s) rounded to 2 decimal places.
 */
export interface K6CustomMetric {
  name: string;
  type: 'trend' | 'counter' | 'rate' | 'gauge';
  contains: 'time' | 'data' | 'default';
  values: {
    avg?: number | null;
    min?: number | null;
    med?: number | null;
    max?: number | null;
    p90?: number | null;
    p95?: number | null;
    count?: number | null;
    rate?: number | null;
    passes?: number | null;
    fails?: number | null;
    value?: number | null;
  };
}

export interface K6V1Metrics {
  p95LatencyMs: number | null;     // 1. Latencia p95 (http_req_duration) en ms
  errorRatePercent: number | null; // 2. Tasa de error (http_req_failed) en %
  throughputRps: number | null;    // 3. Throughput (http_reqs) en req/s
  avgLatencyMs?: number | null;
  minLatencyMs?: number | null;
  medLatencyMs?: number | null;
  maxLatencyMs?: number | null;
  p90LatencyMs?: number | null;
  vus?: number | null;
  vusMax?: number | null;
}

export interface K6Scenario {
  vus: number;
  iterations: number;
  status: 'passed' | 'failed';
  reason?: string;
}

export interface K6Report {
  type: 'k6';
  metrics: K6V1Metrics;
  thresholds: K6ThresholdSummary;
  checks: K6CheckItem[];
  httpPhases: K6HttpPhaseMetric[];
  customMetrics: K6CustomMetric[];
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

function toValidNumber(val: unknown): number | null {
  if (typeof val === 'number' && !Number.isNaN(val) && Number.isFinite(val)) {
    return val;
  }
  return null;
}

function round2(val: unknown): number | null {
  const n = toValidNumber(val);
  return n !== null ? Number(n.toFixed(2)) : null;
}

function resolveThresholdActualValue(
  threshName: string,
  metricKey: string,
  mObj: Record<string, unknown>
): string {
  const values = extractValues(mObj);
  if (!values) {
    return 'N/A';
  }

  const baseKey = metricKey.split('{')[0].trim();
  const isTimeMetric =
    mObj['contains'] === 'time' ||
    (!mObj['contains'] &&
      (baseKey === 'http_req_duration' ||
        baseKey === 'iteration_duration' ||
        baseKey === 'group_duration' ||
        (baseKey.startsWith('http_req_') && baseKey !== 'http_req_failed' && baseKey !== 'http_reqs')));
  const isRateMetric = mObj['type'] === 'rate' || baseKey === 'http_req_failed';
  const isHttpReqs = mObj['Name'] === 'http_reqs' || baseKey === 'http_reqs';

  const unit = isTimeMetric ? 'ms' : isRateMetric ? '%' : isHttpReqs ? 'req/s' : '';

  let rawVal: unknown = undefined;
  let targetStat = '';

  if (threshName.includes('p(95)') || threshName.includes('p95')) {
    rawVal = values['p(95)'] ?? values['p95'];
    targetStat = 'p95';
  } else if (threshName.includes('p(90)') || threshName.includes('p90')) {
    rawVal = values['p(90)'] ?? values['p90'];
    targetStat = 'p90';
  } else if (threshName.includes('med') || threshName.includes('p(50)') || threshName.includes('p50')) {
    rawVal = values['med'] ?? values['p(50)'] ?? values['p50'];
    targetStat = 'med';
  } else if (threshName.includes('avg')) {
    rawVal = values['avg'];
    targetStat = 'avg';
  } else if (threshName.includes('max')) {
    rawVal = values['max'];
    targetStat = 'max';
  } else if (threshName.includes('min')) {
    rawVal = values['min'];
    targetStat = 'min';
  } else if (threshName.includes('rate')) {
    rawVal = values['rate'];
    targetStat = 'rate';
  } else if (threshName.includes('count')) {
    rawVal = values['count'];
    targetStat = 'count';
  } else if (threshName.includes('value')) {
    rawVal = values['value'];
    targetStat = 'value';
  }

  const numVal = toValidNumber(rawVal);
  if (numVal === null) {
    return 'N/A';
  }

  if (targetStat === 'rate' && isRateMetric) {
    const pct = Number((numVal * 100).toFixed(2));
    return `${pct}% (rate=${numVal})`;
  }

  const rounded = Number(numVal.toFixed(2));
  if (targetStat === 'count' || targetStat === 'value' || !unit) {
    return `${rounded}`;
  }
  return `${rounded} ${unit}`;
}

function extractChecksFromGroup(group: unknown, acc: K6CheckItem[]): void {
  if (!group || typeof group !== 'object') {
    return;
  }
  const gObj = group as Record<string, unknown>;

  const rawChecks = gObj['checks'];
  const checkList: unknown[] = Array.isArray(rawChecks)
    ? rawChecks
    : rawChecks && typeof rawChecks === 'object'
      ? Object.values(rawChecks as Record<string, unknown>)
      : [];

  for (let i = 0; i < checkList.length; i++) {
    const item = checkList[i];
    if (!item || typeof item !== 'object') continue;
    const c = item as Record<string, unknown>;
    const name = typeof c['name'] === 'string' && c['name'].trim() ? c['name'] : 'Unnamed check';
    const path = typeof c['path'] === 'string' ? c['path'] : '';
    const rawPasses = toValidNumber(c['passes']);
    const rawFails = toValidNumber(c['fails']);
    const passes = rawPasses !== null && rawPasses >= 0 ? Math.round(rawPasses) : 0;
    const fails = rawFails !== null && rawFails >= 0 ? Math.round(rawFails) : 0;
    const total = passes + fails;
    const passRate = total > 0 ? Number(((passes / total) * 100).toFixed(2)) : 100;
    const status: 'passed' | 'failed' = fails > 0 ? 'failed' : 'passed';
    const reason =
      fails > 0
        ? `Check '${name}' failed ${fails} of ${total} assertions (${passRate}% pass rate)`
        : `All ${total} assertions passed (100%)`;

    acc.push({
      name,
      path,
      passes,
      fails,
      passRate,
      status,
      reason,
    });
  }

  const rawGroups = gObj['groups'];
  const groupList: unknown[] = Array.isArray(rawGroups)
    ? rawGroups
    : rawGroups && typeof rawGroups === 'object'
      ? Object.values(rawGroups as Record<string, unknown>)
      : [];

  for (let i = 0; i < groupList.length; i++) {
    extractChecksFromGroup(groupList[i], acc);
  }
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
        medLatencyMs: null,
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
      checks: [],
      httpPhases: [],
      customMetrics: [],
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
  let medLatencyMs: number | null = null;
  let maxLatencyMs: number | null = null;
  let p90LatencyMs: number | null = null;
  const durationValues = extractValues(metricsObj[K6_METRIC_KEYS.HTTP_REQ_DURATION]);
  if (durationValues) {
    const p95 = durationValues['p(95)'] ?? durationValues['p95'];
    if (typeof p95 === 'number' && !Number.isNaN(p95)) {
      p95LatencyMs = Number(p95.toFixed(2));
    } else {
      warnings.push(`Missing metric: ${K6_METRIC_KEYS.HTTP_REQ_DURATION}.values['p(95)']`);
    }
    const avg = durationValues['avg'];
    if (typeof avg === 'number' && !Number.isNaN(avg)) avgLatencyMs = Number(avg.toFixed(2));
    const min = durationValues['min'];
    if (typeof min === 'number' && !Number.isNaN(min)) minLatencyMs = Number(min.toFixed(2));
    const med = durationValues['med'] ?? durationValues['p(50)'] ?? durationValues['p50'];
    if (typeof med === 'number' && !Number.isNaN(med)) medLatencyMs = Number(med.toFixed(2));
    const max = durationValues['max'];
    if (typeof max === 'number' && !Number.isNaN(max)) maxLatencyMs = Number(max.toFixed(2));
    const p90 = durationValues['p(90)'] ?? durationValues['p90'];
    if (typeof p90 === 'number' && !Number.isNaN(p90)) p90LatencyMs = Number(p90.toFixed(2));
  } else {
    warnings.push(`Missing metric: ${K6_METRIC_KEYS.HTTP_REQ_DURATION} (p95 latency is unavailable)`);
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
  const failedValues = extractValues(metricsObj[K6_METRIC_KEYS.HTTP_REQ_FAILED]);
  if (failedValues) {
    const rate = failedValues['rate'];
    if (typeof rate === 'number' && !Number.isNaN(rate)) {
      errorRatePercent = Number((rate * 100).toFixed(2));
    } else {
      warnings.push(`Missing metric: ${K6_METRIC_KEYS.HTTP_REQ_FAILED}.values.rate`);
    }
  } else {
    warnings.push(`Missing metric: ${K6_METRIC_KEYS.HTTP_REQ_FAILED} (error rate is unavailable)`);
  }

  // 3. Throughput (http_reqs) en req/s
  let throughputRps: number | null = null;
  const reqsValues = extractValues(metricsObj[K6_METRIC_KEYS.HTTP_REQS]);
  if (reqsValues) {
    const rate = reqsValues['rate'];
    if (typeof rate === 'number' && !Number.isNaN(rate)) {
      throughputRps = Number(rate.toFixed(2));
    } else {
      warnings.push(`Missing metric: ${K6_METRIC_KEYS.HTTP_REQS}.values.rate`);
    }
  } else {
    warnings.push(`Missing metric: ${K6_METRIC_KEYS.HTTP_REQS} (throughput req/s is unavailable)`);
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
          const actualValue = resolveThresholdActualValue(threshName, metricKey, mObj);
          const reason = isOk
            ? `Threshold '${threshName}' met on '${metricKey}' (observed: ${actualValue})`
            : `Threshold '${threshName}' breached on '${metricKey}' (observed: ${actualValue})`;
          thresholdItems.push({
            name: threshName,
            metric: metricKey,
            pass: isOk,
            actualValue,
            reason,
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

  // Checks extraction from root_group
  const checks: K6CheckItem[] = [];
  if (rawJson['root_group'] && typeof rawJson['root_group'] === 'object') {
    extractChecksFromGroup(rawJson['root_group'], checks);
  }

  // Standard HTTP timing phases extraction
  const httpPhases: K6HttpPhaseMetric[] = [];
  for (let i = 0; i < HTTP_PHASE_DEFINITIONS.length; i++) {
    const phaseDef = HTTP_PHASE_DEFINITIONS[i];
    const phaseValues = extractValues(metricsObj[phaseDef.key]);
    if (!phaseValues) continue;

    const avg = round2(phaseValues['avg']);
    const p95 = round2(phaseValues['p(95)'] ?? phaseValues['p95']);
    const max = round2(phaseValues['max']);

    if (avg !== null || p95 !== null) {
      httpPhases.push({
        key: phaseDef.key,
        label: phaseDef.label,
        avgMs: avg ?? 0,
        p95Ms: p95 ?? 0,
        maxMs: max ?? 0,
      });
    }
  }

  // Custom metrics extraction
  const customMetrics: K6CustomMetric[] = [];
  for (const [metricKey, metricValue] of Object.entries(metricsObj)) {
    const baseKey = metricKey.split('{')[0].trim();
    if (STANDARD_K6_METRICS.has(metricKey) || STANDARD_K6_METRICS.has(baseKey)) {
      continue;
    }
    if (!metricValue || typeof metricValue !== 'object') {
      continue;
    }
    const mObj = metricValue as Record<string, unknown>;
    const vals = extractValues(mObj);
    if (!vals) {
      continue;
    }

    const rawType = mObj['type'];
    let type: 'trend' | 'counter' | 'rate' | 'gauge';
    if (rawType === 'trend' || rawType === 'counter' || rawType === 'rate' || rawType === 'gauge') {
      type = rawType;
    } else if (toValidNumber(vals['p(95)'] ?? vals['p95']) !== null || toValidNumber(vals['avg']) !== null) {
      type = 'trend';
    } else if (toValidNumber(vals['passes']) !== null || toValidNumber(vals['fails']) !== null) {
      type = 'rate';
    } else if (toValidNumber(vals['count']) !== null) {
      type = 'counter';
    } else {
      type = 'gauge';
    }

    const rawContains = mObj['contains'];
    const contains: 'time' | 'data' | 'default' =
      rawContains === 'time' || rawContains === 'data' || rawContains === 'default'
        ? rawContains
        : 'default';

    const avg = round2(vals['avg']);
    const min = round2(vals['min']);
    const med = round2(vals['med'] ?? vals['p(50)'] ?? vals['p50']);
    const max = round2(vals['max']);
    const p90 = round2(vals['p(90)'] ?? vals['p90']);
    const p95 = round2(vals['p(95)'] ?? vals['p95']);
    const rawCount = toValidNumber(vals['count']);
    const count = rawCount !== null ? Math.round(rawCount) : null;
    const rawRate = toValidNumber(vals['rate']);
    const rate =
      rawRate !== null
        ? type === 'rate'
          ? Number((rawRate * 100).toFixed(2))
          : Number(rawRate.toFixed(2))
        : null;
    const rawPasses = toValidNumber(vals['passes']);
    const passes = rawPasses !== null ? Math.round(rawPasses) : null;
    const rawFails = toValidNumber(vals['fails']);
    const fails = rawFails !== null ? Math.round(rawFails) : null;
    const value = round2(vals['value']);

    const hasAnyValue =
      avg !== null ||
      min !== null ||
      med !== null ||
      max !== null ||
      p90 !== null ||
      p95 !== null ||
      count !== null ||
      rate !== null ||
      passes !== null ||
      fails !== null ||
      value !== null;

    if (!hasAnyValue) {
      continue;
    }

    customMetrics.push({
      name: metricKey,
      type,
      contains,
      values: {
        avg,
        min,
        med,
        max,
        p90,
        p95,
        count,
        rate,
        passes,
        fails,
        value,
      },
    });
  }

  // Scenarios extraction
  const scenarios: Record<string, K6Scenario> = {};
  const rawScenarios = rawJson['scenarios'];
  if (rawScenarios && typeof rawScenarios === 'object') {
    for (const [key, val] of Object.entries(rawScenarios as Record<string, unknown>)) {
      if (val && typeof val === 'object') {
        const s = val as Record<string, unknown>;
        const vusNum = Number(s['vus'] ?? 0);
        const iterationsNum = Number(s['iterations'] ?? 0);
        const scStatus: 'passed' | 'failed' = s['status'] === 'failed' ? 'failed' : 'passed';
        const explicitReason =
          typeof s['reason'] === 'string' && s['reason'].trim()
            ? s['reason'].trim()
            : typeof s['error'] === 'string' && s['error'].trim()
              ? s['error'].trim()
              : undefined;
        const defaultReason =
          scStatus === 'failed'
            ? `Scenario '${key}' failed during load execution (${vusNum} VUs, ${iterationsNum} iterations)`
            : `Completed ${iterationsNum} iterations with ${vusNum} VUs`;

        scenarios[key] = {
          vus: vusNum,
          iterations: iterationsNum,
          status: scStatus,
          reason: explicitReason ?? defaultReason,
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
      medLatencyMs,
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
    checks,
    httpPhases,
    customMetrics,
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
