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
      httpReqs: 100,
      httpReqFailed: 0.05,
      httpReqDuration: { avg: 200, min: 50, max: 800, p90: 300, p95: 400 }
    },
    scenarios: {
      'Scenario 1': { name: 'Scenario 1', duration: 10, status: 'passed' },
      'Scenario 2': { name: 'Scenario 2', duration: 10, status: 'failed' }
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
});