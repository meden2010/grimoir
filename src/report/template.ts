import { readFileSync } from 'fs';
import { join } from 'path';
import { PlaywrightReport, PlaywrightTest, PlaywrightSuite, normalizeStatus } from '../parsers/playwright.parser';
import { K6Report } from '../parsers/k6.parser';

interface Placeholders {
  [key: string]: string | number;
}

const loadTemplate = (): string => {
  const templatePath = join(__dirname, 'template.html');
  let template = readFileSync(templatePath, 'utf-8');
  
  try {
    const cssPath = join(__dirname, 'styles.css');
    const customStyles = readFileSync(cssPath, 'utf-8');
    template = template.replace('__CUSTOM_STYLES__', customStyles);
  } catch (e) {
    // Optional CSS missing
  }

  try {
    const jsPath = join(__dirname, 'script.js');
    const customScripts = readFileSync(jsPath, 'utf-8');
    template = template.replace('__CUSTOM_SCRIPTS__', customScripts);
  } catch (e) {
    // Optional JS missing
  }

  return template;
};

const replacePlaceholders = (template: string, placeholders: Placeholders): string => {
  return Object.entries(placeholders).reduce((result, [key, value]) => {
    const snakeKey = key.replace(/([A-Z])/g, '_$1').toUpperCase();
    const pattern = new RegExp(`__${snakeKey}__`, 'g');
    return result.replace(pattern, String(value));
  }, template);
};

const formatDuration = (ms: number | null | undefined): string => {
  if (ms == null) return "0ms";
  if (ms >= 60000) {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}.${seconds.toString().padStart(2, '0')}m`;
  }
  if (ms >= 1000) {
    const seconds = (ms / 1000).toFixed(1);
    return `${parseFloat(seconds)}s`;
  }
  return `${ms}ms`;
};

interface Failure {
  type: 'Automated' | 'Performance';
  suite: string;
  test: string;
  error: string;
  location?: { file: string; line: number; column: number };
  snippet?: string;
  duration: number;
}

const buildFailures = (playwright: PlaywrightReport, k6: K6Report | null): Failure[] => {
  const automatedFailures = extractAutomatedRows(playwright.suites)
    .filter(row => row.status === 'failed')
    .map(row => {
      const errObj = row.error || {};
      const errMsg = typeof errObj === 'string' ? errObj : errObj.message || 'Unknown error';
      return {
        type: 'Automated' as const,
        suite: row.suite,
        test: row.test,
        error: stripAnsi(errMsg),
        location: errObj.location,
        snippet: errObj.snippet,
        duration: row.duration,
      };
    });

  const performanceFailures = k6
    ? Object.entries(k6.scenarios)
        .filter(([, scenario]) => scenario.status === 'failed')
        .map(([name]) => ({
          type: 'Performance' as const,
          suite: name,
          test: name,
          error: 'Performance scenario failed',
          duration: 0,
        }))
    : [];

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

  return failures.map(({ type, suite, test, error, location, snippet, duration }, index) => {
    const typeColor = type === 'Automated'
      ? 'bg-primary/10 text-primary border-primary/30'
      : 'bg-secondary/10 text-secondary border-secondary/30';
    const dotColor = type === 'Automated' ? 'bg-primary' : 'bg-secondary';
    const durationText = duration > 0 ? formatDuration(duration) : '—';

    const typeLabel = type === 'Automated' ? 'Automated' : type;

    const firstLineError = error.split('\n')[0] || error;
    let fullErrorHtml = `<pre class="font-mono text-[11px] text-error/90 whitespace-pre-wrap leading-relaxed">${escapeHtml(error)}</pre>`;
    
    if (snippet || location) {
      fullErrorHtml += `<div class="mt-4 bg-surface-container-lowest/80 border border-error/10 rounded overflow-hidden"> `;
      
      if (location) {
        fullErrorHtml += `<div class="bg-surface-container-lowest/50 border-b border-error/10 px-3 py-2 flex items-center gap-2 text-outline-variant font-mono text-[11px]">
          <span class="material-symbols-outlined text-[14px]">description</span>
          <span>${escapeHtml(location.file)}:${location.line}:${location.column}</span>
        </div>`;
      }
      
      if (snippet) {
        fullErrorHtml += `<div class="p-3 overflow-x-auto custom-scrollbar">
          <pre class="font-mono text-[11.5px] text-on-surface-variant whitespace-pre-wrap leading-relaxed">${escapeHtml(snippet)}</pre>
        </div>`;
      }
      
      fullErrorHtml += `</div>`;
    }

    return `
              <tr class="hover:bg-error/5 transition-colors group failure-row relative" data-index="${index}">
                <td class="p-gutter pl-4 relative">
                  <div class="absolute left-0 top-0 bottom-0 w-1 bg-error"></div>
                  <span class="inline-flex items-center gap-1 px-2 py-0.5 ${typeColor} text-[10px] font-bold rounded-full border">
                    <span class="w-1 h-1 ${dotColor} rounded-full"></span> ${typeLabel}
                  </span>
                </td>
                <td class="p-gutter font-body-md text-on-surface font-semibold text-sm">${test}</td>
                <td class="p-gutter max-w-[320px]">
                  <div class="flex items-center gap-2 min-w-0">
                    <span class="font-mono text-sm text-error/80 truncate">${firstLineError}</span>
                    <button type="button" class="view-error-btn material-symbols-outlined text-outline hover:text-primary transition-colors text-sm shrink-0" data-error-html="${escapeHtml(fullErrorHtml)}" aria-label="View full error">open_in_full</button>
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

const stripAnsi = (text: string): string => {
  // eslint-disable-next-line no-control-regex
  return text.replace(/\x1B\[[0-9;]*m/g, '');
};

interface AutomatedRow {
  suite: string;
  test: string;
  status: PlaywrightTest['status'];
  duration: number;
  error?: any;
}

function extractAutomatedRows(suites: PlaywrightSuite[]): AutomatedRow[] {
  const rows: AutomatedRow[] = [];

  for (const suite of suites) {
    // Legacy direct tests format
    if (suite.tests) {
      for (const test of suite.tests) {
        rows.push({ suite: suite.title, test: test.title, status: test.status, duration: test.duration });
      }
    }

    // Playwright JSON reporter format: suite -> specs -> tests -> results
    if (suite.specs) {
      for (const spec of suite.specs) {
        if (!spec.tests) continue;
        for (const test of spec.tests) {
          if (!test.results) continue;
          for (const result of test.results) {
            rows.push({
              suite: suite.title,
              test: spec.title,
              status: normalizeStatus(result.status),
              duration: result.duration || 0,
              error: result.error || result.errors?.[0],
            });
          }
        }
      }
    }

    // Nested suites
    if (suite.suites) {
      rows.push(...extractAutomatedRows(suite.suites));
    }
  }

  return rows;
}

const generateAutomatedTestRows = (playwright: PlaywrightReport): string => {
  return extractAutomatedRows(playwright.suites).map(row => {
    const statusClass = row.status === 'passed'
      ? 'bg-primary/10 text-primary border-primary/30'
      : row.status === 'failed'
        ? 'bg-error/10 text-error border-error/30'
        : 'bg-surface-container text-outline border-outline-variant';
    const dotClass = row.status === 'passed'
      ? 'bg-primary'
      : row.status === 'failed'
        ? 'bg-error'
        : 'bg-outline';

    return `
                <tr class="automated-row hover:bg-surface-container transition-colors">
                  <td class="py-2 font-body-md text-on-surface font-medium text-xs">${row.suite}</td>
                  <td class="py-2 font-body-md text-on-surface text-xs">${row.test}</td>
                  <td class="py-2">
                    <span class="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded-full border ${statusClass}">
                      <span class="w-1 h-1 rounded-full ${dotClass}"></span>
                      ${row.status.toUpperCase()}
                    </span>
                  </td>
                  <td class="py-2 font-mono text-xs text-on-surface-variant text-right">${formatDuration(row.duration)}</td>
                </tr>`;
  }).join('');
};

const generateCoverageChips = (isAutomatedActive: boolean, isPerformanceActive: boolean): string => {
  const types = [
    { label: 'Automated', active: isAutomatedActive },
    { label: 'Performance', active: isPerformanceActive },
    { label: 'API', active: false },
    { label: 'Unit', active: false },
  ];

  return types.map(type => {
    const dotClass = type.active
      ? 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.6)] animate-pulse-glow'
      : 'bg-surface-bright border border-outline-variant';
    const textClass = type.active ? 'text-on-surface' : 'text-outline';
    return `
            <div class="flex items-center gap-1.5 px-2.5 py-1.5 bg-surface-container rounded-md border border-outline-variant/30">
              <span class="w-2 h-2 rounded-full ${dotClass}" aria-hidden="true"></span>
              <span class="font-body-md ${textClass} text-xs font-medium">${type.label}</span>
            </div>`;
  }).join('');
};

const generateK6MetricsList = (k6: K6Report | null): string => {
  if (!k6) return '';

  const metrics = [
    { label: 'Requests', value: k6.metrics.httpReqs, color: 'text-on-surface' },
    { label: 'Failed Rate', value: `${(k6.metrics.httpReqFailed * 100).toFixed(1)}%`, color: 'text-error' },
    { label: 'Avg Response', value: formatDuration(k6.metrics.httpReqDuration.avg), color: 'text-on-surface' },
    { label: 'Min Response', value: formatDuration(k6.metrics.httpReqDuration.min), color: 'text-on-surface' },
    { label: 'Max Response', value: formatDuration(k6.metrics.httpReqDuration.max), color: 'text-on-surface' },
    { label: 'P90', value: formatDuration(k6.metrics.httpReqDuration.p90), color: 'text-on-surface' },
    { label: 'P95', value: formatDuration(k6.metrics.httpReqDuration.p95), color: 'text-tertiary font-semibold' },
  ];

  return metrics.map((metric, index) => `
            <div class="perf-metric-row flex justify-between items-center py-1 ${index < metrics.length - 1 ? 'border-b border-outline-variant/20' : ''}">
              <span class="font-body-md text-on-surface-variant text-sm">${metric.label}</span>
              <span class="font-mono text-sm ${metric.color}">${metric.value}</span>
            </div>`).join('');
};

export const generateHTML = (playwright: PlaywrightReport, k6: K6Report | null, history: any[] = []): string => {
  const k6Stats = k6?.stats ?? {
    totalRequests: 0,
    failedRequests: 0,
    successRate: 0,
    totalScenarios: 0,
    passedScenarios: 0,
    duration: 0,
  };
  const k6Metrics = k6?.metrics ?? {
    httpReqs: 0,
    httpReqFailed: 0,
    httpReqDuration: { avg: 0, min: 0, max: 0, p90: 0, p95: 0 },
  };

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
  const totalRequests: number = k6Stats.totalRequests;
  const failedRequests: number = k6Stats.failedRequests;
  const requestSuccessRate: number = totalRequests > 0
    ? Math.round(((totalRequests - failedRequests) / totalRequests) * 100)
    : 0;

  // Overall execution success rate combines automated cases and performance scenarios.
  const totalExecutionUnits: number = totalAutomatedCases + k6Stats.totalScenarios;
  const passedExecutionUnits: number = passedAutomatedCases + k6Stats.passedScenarios;
  const executionSuccessRate: number = totalExecutionUnits > 0
    ? Math.round((passedExecutionUnits / totalExecutionUnits) * 100)
    : 0;

  // Health score is driven by the overall execution success rate.
  const healthStatus: string = executionSuccessRate >= 95 ? 'HEALTHY' : executionSuccessRate >= 85 ? 'DEGRADED' : 'CRITICAL';
  const healthColor: string = executionSuccessRate >= 95 ? 'bg-emerald-400' : executionSuccessRate >= 85 ? 'bg-amber-400' : 'bg-error';
  const healthScoreColorHex: string = executionSuccessRate >= 95 ? '#34d399' : executionSuccessRate >= 85 ? '#fbbf24' : '#ef4444';
  const healthLabel: string = executionSuccessRate >= 95 ? 'All systems operational — ready for release' :
    executionSuccessRate >= 85 ? 'Some tests need attention' : 'Multiple failures detected — investigate immediately';
  const healthScoreArcLength: number = Math.round(Math.PI * 80 * 100) / 100;
  const healthScoreStrokeDashoffset: number = Math.round(healthScoreArcLength * (1 - executionSuccessRate / 100) * 100) / 100;

  const isAutomatedActive: boolean = playwright.stats.total > 0;
  const isPerformanceActive: boolean = k6Stats.totalScenarios > 0 || k6Stats.totalRequests > 0;
  const coverageTypes: number = Number(isAutomatedActive) + Number(isPerformanceActive);
  const totalCoverage: number = 4; // playwright, k6, api, unit (future)
  const totalPerformanceScenarios: number = k6Stats.totalScenarios;
  const passedPerformanceScenariosValue: number = k6Stats.passedScenarios;
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
  const playwrightDurationMs: number = playwright.stats.duration;
  const generatedAt: string = new Date().toLocaleString();

  const totalPassed: number = passedAutomatedCases + passedPerformanceScenariosValue;
  const totalFailed: number = failedTestCases + failedPerformanceScenarios;
  const totalSkipped: number = skippedTestCases;
  const overallStatusArray: string = JSON.stringify([
    totalPassed,
    totalFailed,
    totalSkipped,
  ]);

  const k6DurationMs: number = k6Stats.duration * 1000;
  const durationTypes = [
    { label: 'Automated', value: playwrightDurationMs, color: '#8B5CF6' },
    { label: 'Performance', value: k6DurationMs, color: '#FBBF24' },
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
    k6Metrics.httpReqDuration.avg,
    k6Metrics.httpReqDuration.min,
    k6Metrics.httpReqDuration.max,
    k6Metrics.httpReqDuration.p90,
    k6Metrics.httpReqDuration.p95,
  ]);

  const template = loadTemplate();

  return replacePlaceholders(template, {
    generatedAt,
    healthColor,
    healthScoreColorHex,
    healthScore: executionSuccessRate,
    healthScoreArcLength,
    healthScoreStrokeDashoffset,
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
    playwrightDurationMs,
    playwrightTotal: playwright.stats.total,
    playwrightPassed: playwright.stats.passed,
    playwrightFailed: playwright.stats.failed,
    playwrightSkipped: playwright.stats.skipped,
    coverageTypes,
    totalCoverage,
    totalRequests,
    totalPerformanceScenarios,
    passedPerformanceScenarios: k6Stats.passedScenarios,
    failedPerformanceScenarios,
    performanceFailureRate,
    scenarioSuccessRate,
    requestFailureRate,
    successfulRequests: totalRequests - failedRequests,
    failedRequests,
    requestSuccessRate,
    k6AvgDuration: k6Metrics.httpReqDuration.avg,
    k6TotalRequests: k6Stats.totalRequests,
    k6SuccessRate: k6Stats.successRate,
    k6FailedRequests: k6Stats.failedRequests,
    k6P95: k6Metrics.httpReqDuration.p95,
    k6Avg: k6Metrics.httpReqDuration.avg,
    k6Min: k6Metrics.httpReqDuration.min,
    k6Max: k6Metrics.httpReqDuration.max,
    k6P90: k6Metrics.httpReqDuration.p90,
    overallStatusArray,
    durationLabels,
    durationData,
    durationColors,
    playwrightDataArray,
    k6DataArray,
    failureRows: generateFailureRows(buildFailures(playwright, k6)),
    automatedTestRows: generateAutomatedTestRows(playwright),
    playwrightSuitesJson: JSON.stringify(playwright.suites).replace(/</g, '\\u003c'),
    k6MetricsList: generateK6MetricsList(k6),
    coverageChips: generateCoverageChips(isAutomatedActive, isPerformanceActive),
    automatedCasesVisible: isAutomatedActive ? '' : 'hidden',
    performanceRequestsVisible: isPerformanceActive ? '' : 'hidden',
    automatedTabVisible: isAutomatedActive ? '' : 'hidden',
    performanceTabVisible: isPerformanceActive ? '' : 'hidden',
    historyData: JSON.stringify(history).replace(/</g, '\\u003c'),
  });
};
