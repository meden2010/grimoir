import { describe, test, expect } from 'bun:test';
import { parseK6 } from '../../src/parsers/k6.parser';

describe('k6 Parser', () => {
  test('parseK6 should process metrics and scenarios correctly', () => {
    const mockK6Json = {
      duration: 30000,
      metrics: {
        http_req_duration: {
          avg: 145.2,
          min: 80.1,
          max: 820.5,
          'p(90)': 210.0,
          'p(95)': 315.4,
        },
        http_req_failed: {
          rate: 0.05,
        },
        http_reqs: {
          count: 1000,
        },
      },
      scenarios: {
        default: {
          vus: 50,
          iterations: 1000,
          status: 'passed',
        },
      },
    };

    const report = parseK6(mockK6Json);

    expect(report.type).toBe('k6');
    expect(report.stats.totalRequests).toBe(1000);
    expect(report.stats.failedRequests).toBe(50);
    expect(report.stats.successRate).toBe(95);
    expect(report.stats.duration).toBe(30000);
    expect(report.stats.totalScenarios).toBe(1);
    expect(report.stats.passedScenarios).toBe(1);

    expect(report.metrics.httpReqDuration.avg).toBe(145.2);
    expect(report.metrics.httpReqDuration.p95).toBe(315.4);
    expect(report.metrics.httpReqFailed).toBe(0.05);
    expect(report.metrics.httpReqs).toBe(1000);
  });

  test('parseK6 handles empty metrics with sensible defaults', () => {
    const report = parseK6({ metrics: {} });

    expect(report.type).toBe('k6');
    expect(report.stats.totalRequests).toBe(0);
    expect(report.stats.failedRequests).toBe(0);
    expect(report.stats.successRate).toBe(100);
    expect(report.stats.totalScenarios).toBe(0);
    expect(report.stats.passedScenarios).toBe(0);
  });
});
