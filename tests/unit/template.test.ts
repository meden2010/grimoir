import { describe, test, expect, mock } from 'bun:test';
import { generateHTML } from '../../src/report/template';
import type { PlaywrightReport } from '../../src/parsers/playwright.parser';
import type { K6Report } from '../../src/parsers/k6.parser';

// Let's mock loadTemplate since we are not directly exposing it and
// readFileSync will fail if the files are not built, or we can just mock it.
// Instead of mocking, since the files should exist (or fail gracefully with optional CSS/JS), let's try calling it normally first.

describe('generateHTML', () => {
  const emptyPlaywrightReport: PlaywrightReport = {
    type: 'playwright',
    stats: { total: 0, passed: 0, failed: 0, skipped: 0, duration: 0 },
    suites: []
  };

  const samplePlaywrightReport: PlaywrightReport = {
    type: 'playwright',
    stats: { total: 2, passed: 1, failed: 1, skipped: 0, duration: 1500 },
    suites: [
      {
        title: 'E2E Suite',
        specs: [
          {
            title: 'Test 1',
            tests: [{
              results: [{
                status: 'passed',
                duration: 500,
                errors: []
              }]
            }]
          },
          {
            title: 'Test 2',
            tests: [{
              results: [{
                status: 'failed',
                duration: 1000,
                error: { message: 'Failed assertion' },
                errors: [{ message: 'Failed assertion' }]
              }]
            }]
          }
        ]
      }
    ]
  };

  const sampleK6Report: K6Report = {
    type: 'k6',
    stats: {
      totalRequests: 100,
      failedRequests: 5,
      successRate: 0.95,
      totalScenarios: 2,
      passedScenarios: 1,
      duration: 10
    },
    metrics: {
      p95LatencyMs: 400,
      errorRatePercent: 5.0,
      throughputRps: 100,
    },
    thresholds: {
      status: 'passed',
      total: 1,
      passed: 1,
      failed: 0,
      items: [{ name: 'p(95)<500', metric: 'http_req_duration', pass: true }]
    },
    warnings: [],
    scenarios: {
      'Scenario 1': { vus: 10, iterations: 100, status: 'passed' },
      'Scenario 2': { vus: 10, iterations: 100, status: 'failed' }
    }
  };

  test('should generate HTML with Playwright report only', () => {
    const html = generateHTML(samplePlaywrightReport, null);

    // Check if HTML contains injected stats
    expect(html).toContain('E2E Suite');
    expect(html).toContain('Test 1');
    expect(html).toContain('Test 2');
    expect(html).toContain('Failed assertion');

    // K6 section should be hidden/empty
    expect(html).toContain('hidden'); // performanceTabVisible should be 'hidden'
  });

  test('should generate HTML with Playwright and k6 combined', () => {
    const html = generateHTML(samplePlaywrightReport, sampleK6Report);

    // Check Playwright contents
    expect(html).toContain('E2E Suite');
    expect(html).toContain('Test 2');

    // Check k6 contents
    expect(html).toContain('Scenario 2');
    expect(html).toContain('Performance scenario failed');
  });

  test('should generate HTML with historical data injected', () => {
    const history = {
      runs: [{ id: 1, date: '2025-01-01' }],
      tests: { 'E2E Suite': { passes: 1 } }
    };

    const html = generateHTML(emptyPlaywrightReport, null, history);

    // Check for history data stringification
    expect(html).toContain('2025-01-01');
    expect(html).toContain('E2E Suite');
  });
  test('should format duration >= 60000ms correctly', () => {
    const longPlaywrightReport: PlaywrightReport = {
      type: 'playwright',
      stats: { total: 1, passed: 1, failed: 0, skipped: 0, duration: 65000 },
      suites: [
        {
          title: 'Long Suite',
          specs: [
            {
              title: 'Long Test',
              tests: [{
                results: [{
                  status: 'passed',
                  duration: 65000,
                  errors: []
                }]
              }]
            }
          ]
        }
      ]
    };

    const html = generateHTML(longPlaywrightReport, null);

    // Check if the duration is formatted properly as "1.05m" (65000ms = 1m 5s)
    expect(html).toContain('1.05m');
  });
  test('should format HTML with flaky and skipped tests, and nested suites', () => {
    const report: PlaywrightReport = {
      type: 'playwright',
      stats: { total: 2, passed: 0, failed: 0, skipped: 1, duration: 1000 },
      suites: [
        {
          title: 'Parent Suite',
          suites: [
            {
              title: 'Nested Suite',
              specs: [
                {
                  title: 'Flaky Test',
                  tests: [{
                    status: 'flaky',
                    results: [{
                      status: 'failed',
                      duration: 500,
                      errors: [{ message: 'Flaky failure' }]
                    }, {
                      status: 'passed',
                      duration: 500,
                      errors: []
                    }]
                  }]
                },
                {
                  title: 'Skipped Test',
                  tests: [{
                    status: 'skipped',
                    results: []
                  }]
                }
              ]
            }
          ]
        }
      ]
    };

    const html = generateHTML(report, null);

    // Check if the nested suite, flaky, and skipped status badges exist in the HTML
    expect(html).toContain('Nested Suite');
    expect(html).toContain('Flaky Test');
    expect(html).toContain('Flaky');
    expect(html).toContain('Skipped Test');
    expect(html).toContain('Skipped');
  });
  test('should generate HTML for errors with snippet and location', () => {
    const report: PlaywrightReport = {
      type: 'playwright',
      stats: { total: 1, passed: 0, failed: 1, skipped: 0, duration: 100 },
      suites: [
        {
          title: 'Error Suite',
          specs: [
            {
              title: 'Error Test',
              tests: [{
                results: [{
                  status: 'failed',
                  duration: 100,
                  error: {
                    message: 'Main error message',
                    snippet: 'expect(true).toBe(false);',
                    location: { file: 'test.ts', line: 10, column: 5 }
                  },
                  errors: [{
                    message: 'Main error message',
                    snippet: 'expect(true).toBe(false);',
                    location: { file: 'test.ts', line: 10, column: 5 }
                  }]
                }]
              }]
            }
          ]
        }
      ]
    };

    const html = generateHTML(report, null);

    // Check if the snippet and location are properly escaped and present in the HTML
    expect(html).toContain('Main error message');
    expect(html).toContain('expect(true).toBe(false);');
    expect(html).toContain('test.ts:10:5');
  });
  test('should generate HTML for k6 report with threshold failures and warnings', () => {
    const k6Report: K6Report = {
      type: 'k6',
      stats: {
        totalRequests: 100,
        failedRequests: 5,
        successRate: 0.95,
        totalScenarios: 1,
        passedScenarios: 1,
        duration: 10
      },
      metrics: {
        p95LatencyMs: 400,
        errorRatePercent: 5.0,
        throughputRps: 100,
      },
      thresholds: {
        status: 'failed',
        total: 2,
        passed: 1,
        failed: 1,
        items: [
          { name: 'p(95)<500', metric: 'http_req_duration', pass: true },
          { name: 'rate<0.01', metric: 'http_req_failed', pass: false }
        ]
      },
      warnings: ['Test warning 1', 'Test warning 2'],
      scenarios: {}
    };

    const emptyPlaywright: PlaywrightReport = {
      type: 'playwright',
      stats: { total: 0, passed: 0, failed: 0, skipped: 0, duration: 0 },
      suites: []
    };

    const html = generateHTML(emptyPlaywright, k6Report);

    // Check for threshold status and failures
    expect(html).toContain('FAILED');
    expect(html).toContain('1 of 2 rules passed');
    expect(html).toContain('http_req_failed');
    expect(html).toContain('rate&lt;0.01'); // Escaped form

    // Check for warnings
    expect(html).toContain('Performance Ingestion Warnings (2)');
    expect(html).toContain('Test warning 1');
    expect(html).toContain('Test warning 2');
  });
});