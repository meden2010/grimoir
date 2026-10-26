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
});
