import { describe, test, expect } from 'bun:test';
import { readFileSync } from 'fs';
import { join } from 'path';
import { parseK6 } from '../../src/parsers/k6.parser';

describe('k6 Parser (v1 Scope: 3 Metrics + Thresholds + Warnings)', () => {
  const fixturesDir = join(__dirname, '../fixtures/k6');

  test('Caso normal: parsea exactamente las 3 métricas de k6 y thresholds exitosos', () => {
    const rawJson = JSON.parse(readFileSync(join(fixturesDir, 'real-k6-summary.json'), 'utf-8'));
    const report = parseK6(rawJson);

    expect(report.type).toBe('k6');
    // 1. Latencia p95 (http_req_duration) en ms
    expect(report.metrics.p95LatencyMs).toBe(345.60);
    // 2. Tasa de error (http_req_failed) en % (0.01 * 100 = 1%)
    expect(report.metrics.errorRatePercent).toBe(1.0);
    // 3. Throughput (http_reqs rate) en req/s
    expect(report.metrics.throughputRps).toBe(166.66);

    // Thresholds
    expect(report.thresholds.status).toBe('passed');
    expect(report.thresholds.total).toBe(1);
    expect(report.thresholds.passed).toBe(1);
    expect(report.thresholds.failed).toBe(0);
    expect(report.thresholds.items[0].name).toBe('p(95)<500');
    expect(report.thresholds.items[0].pass).toBe(true);

    // Sin warnings en caso limpio y completo
    expect(report.warnings).toEqual([]);
  });

  test('Caso threshold fallido: detecta threshold status failed y extrae métricas de estrés', () => {
    const rawJson = JSON.parse(readFileSync(join(fixturesDir, 'k6-threshold-failed.json'), 'utf-8'));
    const report = parseK6(rawJson);

    expect(report.type).toBe('k6');
    expect(report.metrics.p95LatencyMs).toBe(2800.0);
    expect(report.metrics.errorRatePercent).toBe(35.0);
    expect(report.metrics.throughputRps).toBe(33.33);

    expect(report.thresholds.status).toBe('failed');
    expect(report.thresholds.total).toBe(2);
    expect(report.thresholds.passed).toBe(0);
    expect(report.thresholds.failed).toBe(2);

    expect(report.warnings).toEqual([]);
  });

  test('Caso vacío: devuelve null en métricas (NO 0 ni 100%) y genera warnings', () => {
    const rawJson = JSON.parse(readFileSync(join(fixturesDir, 'k6-empty.json'), 'utf-8'));
    const report = parseK6(rawJson);

    expect(report.type).toBe('k6');
    // NO debe devolver 0 ni 100%: debe ser null
    expect(report.metrics.p95LatencyMs).toBeNull();
    expect(report.metrics.errorRatePercent).toBeNull();
    expect(report.metrics.throughputRps).toBeNull();

    expect(report.thresholds.status).toBe('none');
    expect(report.thresholds.total).toBe(0);

    // Debe contener warnings explicando la ausencia de datos
    expect(report.warnings.length).toBeGreaterThan(0);
    expect(report.warnings.some(w => w.includes('http_req_duration') || w.includes('metrics'))).toBe(true);
  });

  test('Caso truncado o corrupto: nunca lanza excepción y devuelve null con warnings', () => {
    // Objeto corrupto con métricas inválidas
    const truncatedPayloads = [
      null,
      undefined,
      {},
      { metrics: "not-an-object" },
      { metrics: { http_req_duration: null } },
    ];

    for (const payload of truncatedPayloads) {
      expect(() => {
        const report = parseK6(payload as any);
        expect(report.type).toBe('k6');
        expect(report.metrics.p95LatencyMs).toBeNull();
        expect(report.metrics.errorRatePercent).toBeNull();
        expect(report.metrics.throughputRps).toBeNull();
        expect(report.thresholds.status).toBe('none');
        expect(report.warnings.length).toBeGreaterThan(0);
      }).not.toThrow();
    }
  });

  test('Caso métrica faltante: devuelve null solo en la métrica faltante y agrega warning específico', () => {
    const rawJson = JSON.parse(readFileSync(join(fixturesDir, 'k6-missing-metrics.json'), 'utf-8'));
    const report = parseK6(rawJson);

    // p95 está presente
    expect(report.metrics.p95LatencyMs).toBe(210.5);

    // http_req_failed y http_reqs están ausentes -> deben ser null (NO 0 ni 100%)
    expect(report.metrics.errorRatePercent).toBeNull();
    expect(report.metrics.throughputRps).toBeNull();

    // Debe haber warnings para las métricas que faltan
    expect(report.warnings.some(w => w.includes('http_req_failed'))).toBe(true);
    expect(report.warnings.some(w => w.includes('http_reqs'))).toBe(true);

    // Thresholds de la métrica presente se procesan correctamente
    expect(report.thresholds.status).toBe('passed');
    expect(report.thresholds.total).toBe(1);
    expect(report.thresholds.passed).toBe(1);
  });

  test('Extrae medLatencyMs, actualValue y reason en thresholds (exitosos y fallidos)', () => {
    const normalJson = JSON.parse(readFileSync(join(fixturesDir, 'real-k6-summary.json'), 'utf-8'));
    const normalReport = parseK6(normalJson);

    expect(normalReport.metrics.medLatencyMs).toBe(130.4);
    expect(normalReport.thresholds.items[0]).toEqual({
      name: 'p(95)<500',
      metric: 'http_req_duration',
      pass: true,
      actualValue: '345.6 ms',
      reason: "Threshold 'p(95)<500' met on 'http_req_duration' (observed: 345.6 ms)",
    });

    const failedJson = JSON.parse(readFileSync(join(fixturesDir, 'k6-threshold-failed.json'), 'utf-8'));
    const failedReport = parseK6(failedJson);

    expect(failedReport.metrics.medLatencyMs).toBeNull();
    expect(failedReport.thresholds.items).toEqual([
      {
        name: 'p(95)<1000',
        metric: 'http_req_duration',
        pass: false,
        actualValue: '2800 ms',
        reason: "Threshold 'p(95)<1000' breached on 'http_req_duration' (observed: 2800 ms)",
      },
      {
        name: 'rate<0.05',
        metric: 'http_req_failed',
        pass: false,
        actualValue: '35% (rate=0.35)',
        reason: "Threshold 'rate<0.05' breached on 'http_req_failed' (observed: 35% (rate=0.35))",
      },
    ]);
    expect(failedReport.scenarios['stress_payment_gateway'].reason).toBe(
      "Scenario 'stress_payment_gateway' failed during load execution (100 VUs, 2000 iterations)"
    );
  });

  test('Extrae checks recursivamente desde root_group y groups anidados con passRate y reason', () => {
    const rawJson = {
      root_group: {
        name: '',
        path: '',
        checks: [
          {
            name: 'portal status is 200',
            path: '::portal status is 200',
            passes: 14120,
            fails: 80,
          },
          {
            name: 'sanctuary payload schema valid',
            path: '::sanctuary payload schema valid',
            passes: 14200,
            fails: 0,
          },
        ],
        groups: [
          {
            name: 'Auth Ritual Group',
            path: '::Auth Ritual Group',
            checks: [
              {
                name: 'arcane token signature verified',
                path: '::Auth Ritual Group::arcane token signature verified',
                passes: 4990,
                fails: 10,
              },
            ],
            groups: [],
          },
        ],
      },
      metrics: {},
    };

    const report = parseK6(rawJson);
    expect(report.checks).toHaveLength(3);
    expect(report.checks[0]).toEqual({
      name: 'portal status is 200',
      path: '::portal status is 200',
      passes: 14120,
      fails: 80,
      passRate: 99.44,
      status: 'failed',
      reason: "Check 'portal status is 200' failed 80 of 14200 assertions (99.44% pass rate)",
    });
    expect(report.checks[1]).toEqual({
      name: 'sanctuary payload schema valid',
      path: '::sanctuary payload schema valid',
      passes: 14200,
      fails: 0,
      passRate: 100,
      status: 'passed',
      reason: 'All 14200 assertions passed (100%)',
    });
    expect(report.checks[2]).toEqual({
      name: 'arcane token signature verified',
      path: '::Auth Ritual Group::arcane token signature verified',
      passes: 4990,
      fails: 10,
      passRate: 99.8,
      status: 'failed',
      reason: "Check 'arcane token signature verified' failed 10 of 5000 assertions (99.8% pass rate)",
    });
  });

  test('Extrae httpPhases en orden estándar para las 6 fases de tiempo HTTP', () => {
    const rawJson = {
      metrics: {
        http_req_receiving: {
          type: 'trend',
          contains: 'time',
          values: { avg: 12.5, 'p(95)': 31.7, max: 95.4 },
        },
        http_req_blocked: {
          type: 'trend',
          contains: 'time',
          values: { avg: 1.8, 'p(95)': 5.2, max: 24.5 },
        },
        http_req_waiting: {
          type: 'trend',
          contains: 'time',
          values: { avg: 138.2, 'p(95)': 312.8, max: 840.5 },
        },
      },
    };

    const report = parseK6(rawJson);
    expect(report.httpPhases).toEqual([
      { key: 'http_req_blocked', label: 'Blocked', avgMs: 1.8, p95Ms: 5.2, maxMs: 24.5 },
      { key: 'http_req_waiting', label: 'Waiting (TTFB)', avgMs: 138.2, p95Ms: 312.8, maxMs: 840.5 },
      { key: 'http_req_receiving', label: 'Receiving', avgMs: 12.5, p95Ms: 31.7, maxMs: 95.4 },
    ]);
  });

  test('Extrae customMetrics (trend, counter, rate, gauge) e ignora métricas estándar y sub-métricas etiquetadas', () => {
    const rawJson = {
      metrics: {
        http_req_duration: {
          type: 'trend',
          contains: 'time',
          values: { avg: 100, 'p(95)': 200 },
        },
        'http_req_duration{expected_response:true}': {
          type: 'trend',
          contains: 'time',
          values: { avg: 95, 'p(95)': 190 },
        },
        data_sent: {
          type: 'counter',
          contains: 'data',
          values: { count: 102400, rate: 2048 },
        },
        ritual_checkout_duration: {
          type: 'trend',
          contains: 'time',
          values: { min: 85.2, med: 260.0, avg: 295.4, 'p(90)': 480.1, 'p(95)': 620.4, max: 1420.0 },
          thresholds: { 'p(95)<500': { ok: false } },
        },
        spells_cast_total: {
          type: 'counter',
          contains: 'default',
          values: { count: 9420, rate: 209.33 },
        },
        mana_sync_success: {
          type: 'rate',
          contains: 'default',
          values: { rate: 0.985, passes: 9279, fails: 141 },
        },
        active_leyline_channels: {
          type: 'gauge',
          contains: 'default',
          values: { value: 48, min: 12, max: 64 },
        },
      },
    };

    const report = parseK6(rawJson);
    expect(report.customMetrics.map(m => m.name)).toEqual([
      'ritual_checkout_duration',
      'spells_cast_total',
      'mana_sync_success',
      'active_leyline_channels',
    ]);

    expect(report.customMetrics[0]).toEqual({
      name: 'ritual_checkout_duration',
      type: 'trend',
      contains: 'time',
      values: {
        avg: 295.4,
        min: 85.2,
        med: 260,
        max: 1420,
        p90: 480.1,
        p95: 620.4,
        count: null,
        rate: null,
        passes: null,
        fails: null,
        value: null,
      },
    });

    expect(report.customMetrics[1].type).toBe('counter');
    expect(report.customMetrics[1].values.count).toBe(9420);
    expect(report.customMetrics[1].values.rate).toBe(209.33);

    expect(report.customMetrics[2].type).toBe('rate');
    expect(report.customMetrics[2].values.rate).toBe(98.5);
    expect(report.customMetrics[2].values.passes).toBe(9279);
    expect(report.customMetrics[2].values.fails).toBe(141);

    expect(report.customMetrics[3].type).toBe('gauge');
    expect(report.customMetrics[3].values.value).toBe(48);
    expect(report.customMetrics[3].values.min).toBe(12);
    expect(report.customMetrics[3].values.max).toBe(64);

    // Verifica también el threshold sobre la custom metric
    expect(report.thresholds.items[0]).toEqual({
      name: 'p(95)<500',
      metric: 'ritual_checkout_duration',
      pass: false,
      actualValue: '620.4 ms',
      reason: "Threshold 'p(95)<500' breached on 'ritual_checkout_duration' (observed: 620.4 ms)",
    });
  });
});
