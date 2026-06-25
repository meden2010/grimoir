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
    const snakeKey = key.replace(/([A-Z])/g, '_$1').toUpperCase();
    const pattern = new RegExp(`__${snakeKey}__`, 'g');
    return result.replace(pattern, String(value));
  }, template);
};

interface Failure {
  type: 'Automated' | 'Performance';
  suite: string;
  test: string;
  error: string;
  duration: number;
}

const buildFailures = (playwright: PlaywrightReport, k6: K6Report): Failure[] => {
  const automatedFailures = playwright.suites.flatMap(suite =>
    suite.tests
      .filter(test => test.status === 'failed')
      .map(test => ({
        type: 'Automated' as const,
        suite: suite.title,
        test: test.title,
        error: test.error || 'Unknown error',
        duration: test.duration,
      }))
  );

  const performanceFailures = Object.entries(k6.scenarios)
    .filter(([, scenario]) => scenario.status === 'failed')
    .map(([name]) => ({
      type: 'Performance' as const,
      suite: name,
      test: name,
      error: 'Performance scenario failed',
      duration: 0,
    }));

  return [...automatedFailures, ...performanceFailures];
};

const generateFailureRows = (failures: Failure[]): string => {
  if (failures.length === 0) {
    return `
              <tr>
                <td colspan="4" class="p-gutter text-center text-on-surface-variant font-body-md text-sm">
                  <span class="material-symbols-outlined text-emerald-400 align-middle text-sm">check_circle</span>
                  No failures detected — all tests passed
                </td>
              </tr>`;
  }

  return failures.map(({ type, suite, test, error, duration }, index) => {
    const typeColor = type === 'Automated'
      ? 'bg-primary/10 text-primary border-primary/30'
      : 'bg-secondary/10 text-secondary border-secondary/30';
    const dotColor = type === 'Automated' ? 'bg-primary' : 'bg-secondary';
    const durationText = duration > 0 ? `${duration}ms` : '—';

    const typeLabel = type === 'Automated' ? 'Automated' : type;

    return `
              <tr class="hover:bg-error/5 transition-colors group border-l-4 border-l-error failure-row" data-index="${index}">
                <td class="p-gutter">
                  <span class="inline-flex items-center gap-1 px-2 py-0.5 ${typeColor} text-[10px] font-bold rounded-full border">
                    <span class="w-1 h-1 ${dotColor} rounded-full"></span> ${typeLabel}
                  </span>
                </td>
                <td class="p-gutter font-body-md text-on-surface font-semibold text-sm">${suite} — ${test}</td>
                <td class="p-gutter max-w-[320px]">
                  <div class="flex items-center gap-2 min-w-0">
                    <span class="font-mono text-sm text-error/80 truncate">${error}</span>
                    <button type="button" class="view-error-btn material-symbols-outlined text-outline hover:text-primary transition-colors text-sm shrink-0" data-error="${escapeHtml(error)}" aria-label="View full error">open_in_full</button>
                  </div>
                </td>
                <td class="p-gutter font-mono text-sm text-on-surface-variant text-right">${durationText}</td>
              </tr>`;
  }).join('');
};

const escapeHtml = (unsafe: string): string => {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

const generateAutomatedTestRows = (playwright: PlaywrightReport): string => {
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
                <tr class="automated-row hover:bg-surface-container transition-colors">
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
            <div class="perf-metric-row flex justify-between items-center py-1 ${index < metrics.length - 1 ? 'border-b border-outline-variant/20' : ''}">
              <span class="font-body-md text-on-surface-variant text-sm">${metric.label}</span>
              <span class="font-mono text-sm ${metric.color}">${metric.value}</span>
            </div>`).join('');
};

export const generateHTML = (playwright: PlaywrightReport, k6: K6Report): string => {
  // Test-case metrics are based on Playwright Automated test results.
  const totalTestCases: number = playwright.stats.total;
  const passedTestCases: number = playwright.stats.passed;
  const failedTestCases: number = playwright.stats.failed;
  const skippedTestCases: number = playwright.stats.skipped;

  // Total automated cases: currently Automated only; will aggregate API and Unit cases in the future.
  const totalAutomatedCases: number = totalTestCases;
  const passedAutomatedCases: number = passedTestCases;
  const testCasePassRate: number = totalAutomatedCases > 0
    ? Math.round((passedAutomatedCases / totalAutomatedCases) * 100)
    : 0;
  const failureRate: number = totalAutomatedCases > 0
    ? Math.round((failedTestCases / totalAutomatedCases) * 100)
    : 0;

  // k6 metrics are performance/load test data, counted separately as requests.
  const totalRequests: number = k6.stats.totalRequests;
  const failedRequests: number = k6.stats.failedRequests;
  const requestSuccessRate: number = totalRequests > 0
    ? Math.round(((totalRequests - failedRequests) / totalRequests) * 100)
    : 0;

  // Overall execution success rate combines automated cases and performance scenarios.
  const totalExecutionUnits: number = totalAutomatedCases + k6.stats.totalScenarios;
  const passedExecutionUnits: number = passedAutomatedCases + k6.stats.passedScenarios;
  const executionSuccessRate: number = totalExecutionUnits > 0
    ? Math.round((passedExecutionUnits / totalExecutionUnits) * 100)
    : 0;

  // Health score is driven by the overall execution success rate.
  const healthStatus: string = executionSuccessRate >= 95 ? 'HEALTHY' : executionSuccessRate >= 85 ? 'DEGRADED' : 'CRITICAL';
  const healthColor: string = executionSuccessRate >= 95 ? 'bg-emerald-400' : executionSuccessRate >= 85 ? 'bg-amber-400' : 'bg-error';
  const healthLabel: string = executionSuccessRate >= 95 ? 'All systems operational — ready for release' :
    executionSuccessRate >= 85 ? 'Some tests need attention' : 'Multiple failures detected — investigate immediately';

  const isAutomatedActive: boolean = playwright.stats.total > 0;
  const isPerformanceActive: boolean = k6.stats.totalScenarios > 0 || k6.stats.totalRequests > 0;
  const coverageTypes: number = Number(isAutomatedActive) + Number(isPerformanceActive);
  const totalCoverage: number = 4; // playwright, k6, api, unit (future)
  const totalPerformanceScenarios: number = k6.stats.totalScenarios;
  const passedPerformanceScenariosValue: number = k6.stats.passedScenarios;
  const failedPerformanceScenarios: number = totalPerformanceScenarios - passedPerformanceScenariosValue;
  const performanceFailureRate: number = totalPerformanceScenarios > 0
    ? Math.round((failedPerformanceScenarios / totalPerformanceScenarios) * 100)
    : 0;
  const scenarioSuccessRate: number = totalPerformanceScenarios > 0
    ? Math.round((passedPerformanceScenariosValue / totalPerformanceScenarios) * 100)
    : 0;
  const requestFailureRate: number = totalRequests > 0
    ? Math.round((failedRequests / totalRequests) * 100)
    : 0;
  // Total execution units: automated cases + performance scenarios; will include API/unit counts in the future.
  const totalExecution: number = totalAutomatedCases + totalPerformanceScenarios;
  const playwrightDurationMinutes: number = Math.round((playwright.stats.duration / 60000) * 100) / 100;
  const generatedAt: string = new Date().toLocaleString();

  const totalPassed: number = passedAutomatedCases + passedPerformanceScenariosValue;
  const totalFailed: number = failedTestCases + failedPerformanceScenarios;
  const totalSkipped: number = skippedTestCases;
  const overallStatusArray: string = JSON.stringify([
    totalPassed,
    totalFailed,
    totalSkipped,
  ]);

  const k6DurationMinutes: number = Math.round((k6.stats.duration / 60) * 100) / 100;
  const durationTypes = [
    { label: 'Automated', value: playwrightDurationMinutes, color: '#8B5CF6' },
    { label: 'Performance', value: k6DurationMinutes, color: '#FBBF24' },
    { label: 'API', value: 0, color: '#7A7580' },
    { label: 'Unit', value: 0, color: '#3b3742' },
  ].filter(type => type.value > 0);
  const durationLabels: string = JSON.stringify(durationTypes.map(t => t.label));
  const durationData: string = JSON.stringify(durationTypes.map(t => t.value));
  const durationColors: string = JSON.stringify(durationTypes.map(t => t.color));

  const playwrightDataArray: string = JSON.stringify([
    playwright.stats.passed,
    playwright.stats.failed,
    playwright.stats.skipped,
  ]);
  const k6DataArray: string = JSON.stringify([
    k6.metrics.httpReqDuration.avg,
    k6.metrics.httpReqDuration.min,
    k6.metrics.httpReqDuration.max,
    k6.metrics.httpReqDuration.p90,
    k6.metrics.httpReqDuration.p95,
  ]);

  const template = loadTemplate();

  return replacePlaceholders(template, {
    generatedAt,
    healthColor,
    healthStatus,
    healthLabel,
    testCasePassRate,
    failureRate,
    executionSuccessRate,
    totalAutomatedCases,
    totalExecution,
    totalTestCases,
    passedTestCases,
    failedTestCases,
    skippedTestCases,
    playwrightDuration: playwright.stats.duration,
    playwrightDurationMinutes,
    playwrightTotal: playwright.stats.total,
    playwrightPassed: playwright.stats.passed,
    playwrightFailed: playwright.stats.failed,
    playwrightSkipped: playwright.stats.skipped,
    coverageTypes,
    totalCoverage,
    totalRequests,
    totalPerformanceScenarios,
    passedPerformanceScenarios: k6.stats.passedScenarios,
    failedPerformanceScenarios,
    performanceFailureRate,
    scenarioSuccessRate,
    requestFailureRate,
    successfulRequests: totalRequests - failedRequests,
    failedRequests,
    requestSuccessRate,
    k6AvgDuration: k6.metrics.httpReqDuration.avg,
    k6TotalRequests: k6.stats.totalRequests,
    k6SuccessRate: k6.stats.successRate,
    k6FailedRequests: k6.stats.failedRequests,
    k6P95: k6.metrics.httpReqDuration.p95,
    k6Avg: k6.metrics.httpReqDuration.avg,
    k6Min: k6.metrics.httpReqDuration.min,
    k6Max: k6.metrics.httpReqDuration.max,
    k6P90: k6.metrics.httpReqDuration.p90,
    overallStatusArray,
    durationLabels,
    durationData,
    durationColors,
    playwrightDataArray,
    k6DataArray,
    failureRows: generateFailureRows(buildFailures(playwright, k6)),
    automatedTestRows: generateAutomatedTestRows(playwright),
    k6MetricsList: generateK6MetricsList(k6),
    automatedCasesVisible: isAutomatedActive ? '' : 'hidden',
    performanceRequestsVisible: isPerformanceActive ? '' : 'hidden',
    automatedTabVisible: isAutomatedActive ? '' : 'hidden',
    performanceTabVisible: isPerformanceActive ? '' : 'hidden',
  });
};
