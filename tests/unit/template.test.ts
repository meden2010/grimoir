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
      medLatencyMs: 130.4,
      errorRatePercent: 5.0,
      throughputRps: 100,
    },
    thresholds: {
      status: 'passed',
      total: 1,
      passed: 1,
      failed: 0,
      items: [{
        name: 'p(95)<500',
        metric: 'http_req_duration',
        pass: true,
        actualValue: '400 ms',
        reason: "Threshold 'p(95)<500' met on 'http_req_duration' (observed: 400 ms)"
      }]
    },
    checks: [],
    httpPhases: [],
    customMetrics: [],
    warnings: [],
    scenarios: {
      'Scenario 1': { vus: 10, iterations: 100, status: 'passed', reason: 'Completed 100 iterations with 10 VUs' },
      'Scenario 2': { vus: 10, iterations: 100, status: 'failed', reason: "Scenario 'Scenario 2' failed during load execution" }
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
        medLatencyMs: 120.5,
        errorRatePercent: 5.0,
        throughputRps: 100,
      },
      thresholds: {
        status: 'failed',
        total: 2,
        passed: 1,
        failed: 1,
        items: [
          {
            name: 'p(95)<500',
            metric: 'http_req_duration',
            pass: true,
            actualValue: '400 ms',
            reason: "Threshold 'p(95)<500' met on 'http_req_duration' (observed: 400 ms)"
          },
          {
            name: 'rate<0.01',
            metric: 'http_req_failed',
            pass: false,
            actualValue: '5% (rate=0.05)',
            reason: "Threshold 'rate<0.01' breached on 'http_req_failed' (observed: 5% (rate=0.05))"
          }
        ]
      },
      checks: [],
      httpPhases: [],
      customMetrics: [],
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
    expect(html).toContain('5% (rate=0.05)');
    expect(html).toContain("Threshold &#039;rate&lt;0.01&#039; breached on &#039;http_req_failed&#039; (observed: 5% (rate=0.05))");

    // Check for warnings
    expect(html).toContain('Performance Ingestion Warnings (2)');
    expect(html).toContain('Test warning 1');
    expect(html).toContain('Test warning 2');
  });

  test('should render medLatencyMs, httpPhases, checks, thresholds, customMetrics, and scenarios with failure drawer integration', () => {
    const richK6Report: K6Report = {
      type: 'k6',
      stats: {
        totalRequests: 14200,
        failedRequests: 90,
        successRate: 99,
        totalScenarios: 2,
        passedScenarios: 1,
        duration: 45000,
      },
      metrics: {
        avgLatencyMs: 142.3,
        minLatencyMs: 18.5,
        medLatencyMs: 128.75,
        maxLatencyMs: 890.2,
        p90LatencyMs: 280.4,
        p95LatencyMs: 345.6,
        errorRatePercent: 0.63,
        throughputRps: 315.55,
        vus: 25,
        vusMax: 50,
      },
      thresholds: {
        status: 'failed',
        total: 2,
        passed: 1,
        failed: 1,
        items: [
          {
            name: 'p(95)<500',
            metric: 'http_req_duration',
            pass: true,
            actualValue: '345.6 ms',
            reason: "Threshold 'p(95)<500' met on 'http_req_duration' (observed: 345.6 ms)",
          },
          {
            name: 'p(95)<500',
            metric: 'ritual_checkout_duration',
            pass: false,
            actualValue: '620.4 ms',
            reason: "Threshold 'p(95)<500' breached on 'ritual_checkout_duration' (observed: 620.4 ms)",
          },
        ],
      },
      checks: [
        {
          name: 'portal status is 200',
          path: '::portal status is 200',
          passes: 14120,
          fails: 80,
          passRate: 99.44,
          status: 'failed',
          reason: "Check 'portal status is 200' failed 80 of 14200 assertions (99.44% pass rate)",
        },
        {
          name: 'sanctuary payload schema valid',
          path: '::sanctuary payload schema valid',
          passes: 14200,
          fails: 0,
          passRate: 100,
          status: 'passed',
          reason: 'All 14200 assertions passed (100%)',
        },
      ],
      httpPhases: [
        { key: 'http_req_blocked', label: 'Blocked', avgMs: 1.8, p95Ms: 5.2, maxMs: 24.5 },
        { key: 'http_req_waiting', label: 'Waiting (TTFB)', avgMs: 138.2, p95Ms: 312.8, maxMs: 840.5 },
        { key: 'http_req_receiving', label: 'Receiving', avgMs: 12.5, p95Ms: 31.7, maxMs: 95.4 },
      ],
      customMetrics: [
        {
          name: 'ritual_checkout_duration',
          type: 'trend',
          contains: 'time',
          values: {
            min: 85.2,
            med: 260.0,
            avg: 295.4,
            p90: 480.1,
            p95: 620.4,
            max: 1420.0,
          },
        },
        {
          name: 'spells_cast_total',
          type: 'counter',
          contains: 'default',
          values: { count: 9420, rate: 209.33 },
        },
        {
          name: 'mana_sync_success',
          type: 'rate',
          contains: 'default',
          values: { rate: 98.5, passes: 9279, fails: 141 },
        },
        {
          name: 'active_leyline_channels',
          type: 'gauge',
          contains: 'default',
          values: { value: 48, min: 12, max: 64 },
        },
      ],
      warnings: [],
      scenarios: {
        steady_sanctuary_load: {
          vus: 30,
          iterations: 9200,
          status: 'passed',
          reason: 'Completed 9200 iterations with 30 VUs',
        },
        spike_ritual_checkout: {
          vus: 20,
          iterations: 5000,
          status: 'failed',
          reason: "Scenario 'spike_ritual_checkout' failed during load execution (20 VUs, 5000 iterations)",
        },
      },
    };

    const html = generateHTML(emptyPlaywrightReport, richK6Report);

    // 1. medLatencyMs (__K6_MED_DISPLAY__) & 6-point k6DataArray
    expect(html).toContain('128.75 ms');
    expect(html).toContain('[142.3,18.5,128.75,890.2,280.4,345.6]');

    // 2. httpPhases (__K6_PHASES_DATA_JSON__)
    expect(html).toContain('"key":"http_req_blocked","label":"Blocked","avgMs":1.8,"p95Ms":5.2,"maxMs":24.5');
    expect(html).toContain('"key":"http_req_waiting","label":"Waiting (TTFB)","avgMs":138.2,"p95Ms":312.8,"maxMs":840.5');

    // 3. checks table (k6 Check Assertions) + failed checks in Global Failure Drawer with reason
    expect(html).toContain('k6 Check Assertions');
    expect(html).toContain('portal status is 200');
    expect(html).toContain('::portal status is 200');
    expect(html).toContain('99.44%');
    expect(html).toContain("Check &#039;portal status is 200&#039; failed 80 of 14200 assertions (99.44% pass rate)");
    expect(html).toContain('All 14200 assertions passed (100%)');
    // Check failure drawer entry
    expect(html).toContain('portal status is 200 (::portal status is 200)');
    expect(html).toContain('Passes: 14120 | Fails: 80 | Pass Rate: 99.44% | Path: ::portal status is 200');

    // 4. thresholds table (observed actualValue + reason) + Failure Drawer entry
    expect(html).toContain('Threshold Rule Details');
    expect(html).toContain('345.6 ms');
    expect(html).toContain('620.4 ms');
    expect(html).toContain("Threshold &#039;p(95)&lt;500&#039; breached on &#039;ritual_checkout_duration&#039; (observed: 620.4 ms)");
    expect(html).toContain('Rule: p(95)&amp;lt;500 | Observed Value: 620.4 ms | Metric: ritual_checkout_duration');

    // 5. customMetrics table (TREND, COUNTER, RATE, GAUGE badges) + custom trend <option> in #perfTrendSelector
    expect(html).toContain('Custom k6 Metrics');
    expect(html).toContain('>TREND<');
    expect(html).toContain('>COUNTER<');
    expect(html).toContain('>RATE<');
    expect(html).toContain('>GAUGE<');
    expect(html).toContain('p(95): 620.4ms');
    expect(html).toContain('min: 85.2ms · med: 260ms · avg: 295.4ms · p90: 480.1ms · max: 1420ms');
    expect(html).toContain('throughput: 209.33/s');
    expect(html).toContain('98.5%');
    expect(html).toContain('passes: 9279 · fails: 141');
    expect(html).toContain('min: 12 · max: 64');
    expect(html).toContain('<option value="ritual_checkout_duration">ritual_checkout_duration (Custom Trend)</option>');
    expect(html).toContain('"ritual_checkout_duration":{"label":"ritual_checkout_duration (Custom Trend)"');

    // 6. scenarios table (reason) + Failure Drawer entry
    expect(html).toContain('Scenario Runs');
    expect(html).toContain('Completed 9200 iterations with 30 VUs');
    expect(html).toContain("Scenario &#039;spike_ritual_checkout&#039; failed during load execution (20 VUs, 5000 iterations)");
    expect(html).toContain("Performance scenario failed — Scenario &#039;spike_ritual_checkout&#039; failed during load execution (20 VUs, 5000 iterations)");
  });

  test('should defensively escape XSS payloads in custom metric names, check names/paths, and threshold rules', () => {
    const xssK6Report: K6Report = {
      type: 'k6',
      stats: {
        totalRequests: 10,
        failedRequests: 1,
        successRate: 90,
        totalScenarios: 1,
        passedScenarios: 0,
        duration: 1000,
      },
      metrics: {
        p95LatencyMs: 100,
        medLatencyMs: 50,
        errorRatePercent: 10,
        throughputRps: 10,
      },
      thresholds: {
        status: 'failed',
        total: 1,
        passed: 0,
        failed: 1,
        items: [
          {
            name: 'p(95)<500"><script>alert("xss-thresh")</script>',
            metric: 'http_req_duration',
            pass: false,
            actualValue: '100 ms <img src=x onerror=alert(1)>',
            reason: 'Breached <script>evilThresh()</script>',
          },
        ],
      },
      checks: [
        {
          name: '<img src=x onerror="alert(\'xss-check\')">',
          path: '::<script>alert("xss-path")</script>',
          passes: 0,
          fails: 1,
          passRate: 0,
          status: 'failed',
          reason: 'Check failed <svg onload=alert(1)>',
        },
      ],
      httpPhases: [
        {
          key: 'http_req_blocked',
          label: '</script><script>alert("xss-phase")</script>',
          avgMs: 1,
          p95Ms: 2,
          maxMs: 3,
        },
      ],
      customMetrics: [
        {
          name: '</script><script>alert("xss-cm")</script>',
          type: 'trend',
          contains: 'time',
          values: { min: 1, med: 2, avg: 3, p90: 4, p95: 5, max: 6 },
        },
      ],
      warnings: [],
      scenarios: {
        '<script>alert("xss-scenario")</script>': {
          vus: 5,
          iterations: 10,
          status: 'failed',
          reason: 'Scenario error <iframe src="javascript:alert(1)">',
        },
      },
    };

    const html = generateHTML(emptyPlaywrightReport, xssK6Report);

    // Raw unescaped XSS tags must NEVER appear in the output HTML
    expect(html).not.toContain('<script>alert("xss-thresh")</script>');
    expect(html).not.toContain('<img src=x onerror=alert(1)>');
    expect(html).not.toContain('<script>evilThresh()</script>');
    expect(html).not.toContain('<img src=x onerror="alert(\'xss-check\')">');
    expect(html).not.toContain('<script>alert("xss-path")</script>');
    expect(html).not.toContain('<svg onload=alert(1)>');
    expect(html).not.toContain('</script><script>alert("xss-phase")</script>');
    expect(html).not.toContain('</script><script>alert("xss-cm")</script>');
    expect(html).not.toContain('<script>alert("xss-scenario")</script>');
    expect(html).not.toContain('<iframe src="javascript:alert(1)">');

    // Escaped HTML entities and Unicode JSON escapes (\u003c) must be present
    expect(html).toContain('&lt;script&gt;alert(&quot;xss-thresh&quot;)&lt;/script&gt;');
    expect(html).toContain('&lt;img src=x onerror=&quot;alert(&#039;xss-check&#039;)&quot;&gt;');
    expect(html).toContain('::&lt;script&gt;alert(&quot;xss-path&quot;)&lt;/script&gt;');
    expect(html).toContain('&lt;/script&gt;&lt;script&gt;alert(&quot;xss-cm&quot;)&lt;/script&gt;');
    expect(html).toContain('\\u003c/script>\\u003cscript>alert(\\"xss-cm\\")\\u003c/script>');
    expect(html).toContain('\\u003c/script>\\u003cscript>alert(\\"xss-phase\\")\\u003c/script>');
  });

  test('should leave no unreplaced __K6_*__ or template placeholders in generated HTML', () => {
    const htmlWithoutK6 = generateHTML(samplePlaywrightReport, null);
    expect(htmlWithoutK6).not.toMatch(/__K6_[A-Z0-9_]+__/);
    expect(htmlWithoutK6).not.toMatch(/__[A-Z0-9_]+__/);

    const htmlWithK6 = generateHTML(samplePlaywrightReport, sampleK6Report);
    expect(htmlWithK6).not.toMatch(/__K6_[A-Z0-9_]+__/);
    expect(htmlWithK6).not.toMatch(/__[A-Z0-9_]+__/);
  });

  test('should mark Health Score as UNVERIFIED when k6 has NO THRESHOLDS and group custom trends in optgroup', () => {
    const k6NoThresholds: K6Report = {
      type: 'k6',
      stats: {
        totalRequests: 500,
        failedRequests: 0,
        successRate: 100,
        totalScenarios: 1,
        passedScenarios: 1,
        duration: 5000,
      },
      metrics: {
        p95LatencyMs: 210,
        errorRatePercent: 0,
        throughputRps: 100,
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
      customMetrics: [
        {
          name: 'custom_checkout_ms',
          type: 'trend',
          contains: 'time',
          values: { min: 10, med: 50, avg: 55, p90: 90, p95: 120, max: 200 },
        },
      ],
      warnings: [],
      scenarios: {
        baseline: { vus: 10, iterations: 500, status: 'passed' },
      },
    };

    const html = generateHTML(emptyPlaywrightReport, k6NoThresholds);
    expect(html).toContain('UNVERIFIED');
    expect(html).toContain('No k6 thresholds configured — SLA unverified');
    expect(html).not.toContain('All systems operational — ready for release');
    expect(html).toContain('<optgroup label="Standard HTTP">');
    expect(html).toContain('<optgroup label="Custom Trends">');
  });
});