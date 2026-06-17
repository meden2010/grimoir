import { readFileSync } from 'fs';
import { join } from 'path';
import { PlaywrightReport } from '../parsers/playwright.parser';
import { K6Report } from '../parsers/k6.parser';

interface Placeholders {
  [key: string]: string | number;
}

const loadTemplate = (): string => {
  const templatePath = join(__dirname, 'template.html');
  return readFileSync(templatePath, 'utf-8');
};

const replacePlaceholders = (template: string, placeholders: Placeholders): string => {
  return Object.entries(placeholders).reduce((result, [key, value]) => {
    const pattern = new RegExp(`__${key.toUpperCase()}__`, 'g');
    return result.replace(pattern, String(value));
  }, template);
};

const generateFailedTestRows = (playwright: PlaywrightReport): string => {
  const failedTests = playwright.suites.flatMap(suite =>
    suite.tests.filter(test => test.status === 'failed').map(test => ({
      suite: suite.title,
      test: test.title,
      error: test.error || 'Unknown error',
      duration: test.duration,
    }))
  );

  if (failedTests.length === 0) {
    return '';
  }

  return failedTests.map(({ suite, test, error, duration }) => `
              <tr class="hover:bg-error/5 transition-colors group border-l-4 border-l-error">
                <td class="p-gutter">
                  <span class="inline-flex items-center gap-1 px-2 py-0.5 bg-primary/10 text-primary text-[10px] font-bold rounded-full border border-primary/30">
                    <span class="w-1 h-1 bg-primary rounded-full"></span> E2E
                  </span>
                </td>
                <td class="p-gutter font-body-md text-on-surface font-semibold text-sm">${suite} — ${test}</td>
                <td class="p-gutter font-mono text-sm text-error/80 hidden md:table-cell max-w-[300px] truncate">${error}</td>
                <td class="p-gutter font-mono text-sm text-on-surface-variant text-right">${duration}ms</td>
              </tr>`).join('');
};

const generateNoFailuresRow = (playwright: PlaywrightReport): string => {
  const hasFailures = playwright.suites.some(suite =>
    suite.tests.some(test => test.status === 'failed')
  );

  return hasFailures ? '' : `
              <tr>
                <td colspan="4" class="p-gutter text-center text-on-surface-variant font-body-md text-sm">
                  <span class="material-symbols-outlined text-emerald-400 align-middle text-sm">check_circle</span>
                  No failures detected — all tests passed
                </td>
              </tr>`;
};

const generateE2ETestRows = (playwright: PlaywrightReport): string => {
  return playwright.suites.flatMap(suite =>
    suite.tests.map(test => {
      const statusClass = test.status === 'passed'
        ? 'bg-primary/10 text-primary border-primary/30'
        : test.status === 'failed'
          ? 'bg-error/10 text-error border-error/30'
          : 'bg-surface-container text-outline border-outline-variant';
      const dotClass = test.status === 'passed'
        ? 'bg-primary'
        : test.status === 'failed'
          ? 'bg-error'
          : 'bg-outline';

      return `
                <tr class="hover:bg-surface-container transition-colors">
                  <td class="py-2 font-body-md text-on-surface font-medium text-xs">${suite.title}</td>
                  <td class="py-2 font-body-md text-on-surface text-xs">${test.title}</td>
                  <td class="py-2">
                    <span class="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded-full border ${statusClass}">
                      <span class="w-1 h-1 rounded-full ${dotClass}"></span>
                      ${test.status.toUpperCase()}
                    </span>
                  </td>
                  <td class="py-2 font-mono text-xs text-on-surface-variant text-right">${test.duration}ms</td>
                </tr>`;
    })
  ).join('');
};

const generateK6MetricsList = (k6: K6Report): string => {
  const metrics = [
    { label: 'Requests', value: k6.metrics.httpReqs, color: 'text-on-surface' },
    { label: 'Failed Rate', value: `${(k6.metrics.httpReqFailed * 100).toFixed(1)}%`, color: 'text-error' },
    { label: 'Avg Response', value: `${k6.metrics.httpReqDuration.avg}ms`, color: 'text-on-surface' },
    { label: 'Min Response', value: `${k6.metrics.httpReqDuration.min}ms`, color: 'text-on-surface' },
    { label: 'Max Response', value: `${k6.metrics.httpReqDuration.max}ms`, color: 'text-on-surface' },
    { label: 'P90', value: `${k6.metrics.httpReqDuration.p90}ms`, color: 'text-on-surface' },
    { label: 'P95', value: `${k6.metrics.httpReqDuration.p95}ms`, color: 'text-tertiary font-semibold' },
  ];

  return metrics.map((metric, index) => `
            <div class="flex justify-between items-center py-1 ${index < metrics.length - 1 ? 'border-b border-outline-variant/20' : ''}">
              <span class="font-body-md text-on-surface-variant text-sm">${metric.label}</span>
              <span class="font-mono text-sm ${metric.color}">${metric.value}</span>
            </div>`).join('');
};

export const generateHTML = (playwright: PlaywrightReport, k6: K6Report): string => {
  // Test-case metrics are based on Playwright E2E test results.
  const totalTestCases: number = playwright.stats.total;
  const passedTestCases: number = playwright.stats.passed;
  const failedTestCases: number = playwright.stats.failed;
  const skippedTestCases: number = playwright.stats.skipped;
  const testCasePassRate: number = totalTestCases > 0 ? Math.round((passedTestCases / totalTestCases) * 100) : 0;

  // k6 metrics are performance/load test data, counted separately as requests.
  const totalRequests: number = k6.stats.totalRequests;
  const failedRequests: number = k6.stats.failedRequests;
  const requestSuccessRate: number = totalRequests > 0
    ? Math.round(((totalRequests - failedRequests) / totalRequests) * 100)
    : 0;

  // Health score is driven by test-case pass rate.
  const healthStatus: string = testCasePassRate >= 95 ? 'HEALTHY' : testCasePassRate >= 85 ? 'DEGRADED' : 'CRITICAL';
  const healthColor: string = testCasePassRate >= 95 ? 'bg-emerald-400' : testCasePassRate >= 85 ? 'bg-amber-400' : 'bg-error';
  const healthLabel: string = testCasePassRate >= 95 ? 'All systems operational — ready for release' :
    testCasePassRate >= 85 ? 'Some tests need attention' : 'Multiple failures detected — investigate immediately';

  const coverageTypes: number = 2; // playwright + k6
  const totalCoverage: number = 4; // playwright, k6, api, unit (future)
  const generatedAt: string = new Date().toLocaleString();

  const template = loadTemplate();

  return replacePlaceholders(template, {
    generatedAt,
    healthColor,
    healthStatus,
    healthLabel,
    testCasePassRate,
    totalTestCases,
    passedTestCases,
    failedTestCases,
    skippedTestCases,
    playwrightDuration: playwright.stats.duration,
    playwrightTotal: playwright.stats.total,
    playwrightPassed: playwright.stats.passed,
    playwrightFailed: playwright.stats.failed,
    playwrightSkipped: playwright.stats.skipped,
    coverageTypes,
    totalCoverage,
    totalRequests,
    successfulRequests: totalRequests - failedRequests,
    failedRequests,
    requestSuccessRate,
    k6AvgDuration: k6.stats.duration,
    k6TotalRequests: k6.stats.totalRequests,
    k6SuccessRate: k6.stats.successRate,
    k6FailedRequests: k6.stats.failedRequests,
    k6P95: k6.metrics.httpReqDuration.p95,
    k6Avg: k6.metrics.httpReqDuration.avg,
    k6Min: k6.metrics.httpReqDuration.min,
    k6Max: k6.metrics.httpReqDuration.max,
    k6P90: k6.metrics.httpReqDuration.p90,
    failedTestRows: generateFailedTestRows(playwright),
    noFailuresRow: generateNoFailuresRow(playwright),
    e2eTestRows: generateE2ETestRows(playwright),
    k6MetricsList: generateK6MetricsList(k6),
  });
};
