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

  const performanceFailures: Failure[] = [];
  if (k6) {
    // 1. Threshold failures from k6 summary
    for (const t of k6.thresholds.items) {
      if (!t.pass) {
        performanceFailures.push({
          type: 'Performance' as const,
          suite: t.metric,
          test: `Threshold: ${t.name}`,
          error: `k6 threshold breached on metric '${t.metric}': '${t.name}' failed`,
          duration: 0,
        });
      }
    }
    // 2. Scenario failures if any
    for (const [name, scenario] of Object.entries(k6.scenarios)) {
      if (scenario.status === 'failed') {
        performanceFailures.push({
          type: 'Performance' as const,
          suite: name,
          test: name,
          error: `k6 scenario '${name}' execution failed`,
          duration: 0,
        });
      }
    }
  }

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
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
};

const stripAnsi = (str: string): string => {
  return str.replace(/\x1B\[[0-9;]*[a-zA-Z]/g, '');
};

interface AutomatedRow {
  suite: string;
  test: string;
  status: 'passed' | 'failed' | 'flaky' | 'skipped';
  duration: number;
  error?: any;
}

const extractAutomatedRows = (suites: PlaywrightSuite[], parentTitle = ''): AutomatedRow[] => {
  let rows: AutomatedRow[] = [];

  for (const suite of suites) {
    const currentTitle = parentTitle ? `${parentTitle} > ${suite.title}` : suite.title;

    if (suite.specs) {
      for (const spec of suite.specs) {
        const lastTest = spec.tests?.[spec.tests.length - 1];
        const lastResult = lastTest?.results?.[lastTest.results.length - 1];
        
        let status: 'passed' | 'failed' | 'flaky' | 'skipped' = 'passed';
        if (!spec.ok) {
          status = 'failed';
        } else if (spec.tests?.some(t => t.status === 'flaky')) {
          status = 'flaky';
        } else if (spec.tests?.every(t => t.status === 'skipped')) {
          status = 'skipped';
        }

        const duration = spec.tests?.reduce((acc, t) => {
          return acc + (t.results?.reduce((rAcc, r) => rAcc + (r.duration || 0), 0) || 0);
        }, 0) || 0;

        rows.push({
          suite: currentTitle,
          test: spec.title,
          status,
          duration,
          error: lastResult?.error || (lastResult?.errors && lastResult.errors[0])
        });
      }
    }

    if (suite.suites) {
      rows = rows.concat(extractAutomatedRows(suite.suites, currentTitle));
    }
  }

  return rows;
};

const generateAutomatedTestRows = (playwright: PlaywrightReport): string => {
  const rows = extractAutomatedRows(playwright.suites);
  
  if (rows.length === 0) {
    return `
      <tr>
        <td colspan="4" class="p-gutter text-center text-on-surface-variant font-body-md text-sm">
          No automated tests executed
        </td>
      </tr>`;
  }

  return rows.map((row) => {
    let statusBadge = '';
    let statusClass = '';
    
    switch (row.status) {
      case 'passed':
        statusBadge = '<span class="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-950/40 text-emerald-400 text-[10px] font-bold rounded-full border border-emerald-500/30"><span class="w-1 h-1 bg-emerald-400 rounded-full"></span>Passed</span>';
        break;
      case 'failed':
        statusBadge = '<span class="inline-flex items-center gap-1 px-2 py-0.5 bg-error/10 text-error text-[10px] font-bold rounded-full border border-error/30"><span class="w-1 h-1 bg-error rounded-full"></span>Failed</span>';
        statusClass = 'hover:bg-error/5';
        break;
      case 'flaky':
        statusBadge = '<span class="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-950/40 text-amber-400 text-[10px] font-bold rounded-full border border-amber-500/30"><span class="w-1 h-1 bg-amber-400 rounded-full"></span>Flaky</span>';
        break;
      case 'skipped':
        statusBadge = '<span class="inline-flex items-center gap-1 px-2 py-0.5 bg-surface-container text-outline text-[10px] font-bold rounded-full border border-outline-variant"><span class="w-1 h-1 bg-outline rounded-full"></span>Skipped</span>';
        break;
    }

    return `
      <tr class="border-b border-outline-variant/30 hover:bg-surface-container/30 transition-colors ${statusClass}">
        <td class="p-gutter font-mono text-xs text-outline max-w-[200px] truncate" title="${escapeHtml(row.suite)}">${escapeHtml(row.suite)}</td>
        <td class="p-gutter font-body-md text-sm text-on-surface font-medium">${escapeHtml(row.test)}</td>
        <td class="p-gutter">${statusBadge}</td>
        <td class="p-gutter font-mono text-sm text-on-surface-variant text-right">${formatDuration(row.duration)}</td>
      </tr>`;
  }).join('');
};

const generateCoverageChips = (isAutomatedActive: boolean, isPerformanceActive: boolean): string => {
  const types = [
    { label: 'Automated', active: isAutomatedActive, dot: 'bg-primary' },
    { label: 'Performance', active: isPerformanceActive, dot: 'bg-secondary' },
    { label: 'API', active: false, dot: 'bg-outline' },
    { label: 'Unit', active: false, dot: 'bg-outline' },
  ];

  return types.map(type => {
    const dotClass = type.active ? type.dot : 'bg-outline-variant';
    const textClass = type.active ? 'text-on-surface' : 'text-outline';
    return `
            <div class="flex items-center gap-1.5 px-2.5 py-1.5 bg-surface-container rounded-md border border-outline-variant/30">
              <span class="w-2 h-2 rounded-full ${dotClass}" aria-hidden="true"></span>
              <span class="font-body-md ${textClass} text-xs font-medium">${type.label}</span>
            </div>`;
  }).join('');
};

export const generateHTML = (playwright: PlaywrightReport, k6: K6Report | null, history: any = { runs: [], tests: {} }): string => {
  const k6Stats = k6?.stats ?? {
    totalRequests: 0,
    failedRequests: 0,
    successRate: 100,
    totalScenarios: 0,
    passedScenarios: 0,
    duration: 0,
  };

  // Test-case metrics are based on Playwright Automated test results.
  const totalTestCases: number = playwright.stats.total;
  const passedTestCases: number = playwright.stats.passed;
  const failedTestCases: number = playwright.stats.failed;
  const skippedTestCases: number = playwright.stats.skipped;

  const totalAutomatedCases: number = totalTestCases;
  const passedAutomatedCases: number = passedTestCases;
  const testCasePassRate: number = totalAutomatedCases > 0
    ? Math.round((passedAutomatedCases / totalAutomatedCases) * 100)
    : 0;
  const failureRate: number = totalAutomatedCases > 0
    ? Math.round((failedTestCases / totalAutomatedCases) * 100)
    : 0;

  // Total requests
  const totalRequests: number = k6Stats.totalRequests;
  const failedRequests: number = k6Stats.failedRequests;
  const requestSuccessRate: number = totalRequests > 0
    ? Math.round(((totalRequests - failedRequests) / totalRequests) * 100)
    : 100;

  // -------------------------------------------------------------
  // Health Score Integration (v1):
  // Evaluated execution units are tests/thresholds with definite pass/fail outcomes.
  // - Automated test cases (Playwright)
  // - Performance thresholds from k6 summary (if present and evaluated)
  // RULE: If a k6 metric is null, or k6 has 0 thresholds, it contributes 0 units
  // to the Health Score (neither penalizes as failure nor inflates as pass).
  // -------------------------------------------------------------
  const k6ThresholdsTotal = k6?.thresholds ? k6.thresholds.total : 0;
  const k6ThresholdsPassed = k6?.thresholds ? k6.thresholds.passed : 0;
  const totalPerformanceScenarios = k6Stats.totalScenarios;
  const passedPerformanceScenariosValue = k6Stats.passedScenarios;
  const failedPerformanceScenarios = Math.max(0, totalPerformanceScenarios - passedPerformanceScenariosValue);

  const totalExecutionUnits: number = totalAutomatedCases + k6ThresholdsTotal;
  const passedExecutionUnits: number = passedAutomatedCases + k6ThresholdsPassed;
  const executionSuccessRate: number = totalExecutionUnits > 0
    ? Math.round((passedExecutionUnits / totalExecutionUnits) * 100)
    : 100;

  const healthStatus: string = executionSuccessRate >= 95 ? 'HEALTHY' : executionSuccessRate >= 85 ? 'DEGRADED' : 'CRITICAL';
  const healthColor: string = executionSuccessRate >= 95 ? 'bg-emerald-400' : executionSuccessRate >= 85 ? 'bg-amber-400' : 'bg-error';
  const healthScoreColorHex: string = executionSuccessRate >= 95 ? '#34d399' : executionSuccessRate >= 85 ? '#fbbf24' : '#ef4444';
  const healthLabel: string = executionSuccessRate >= 95 ? 'All systems operational — ready for release' :
    executionSuccessRate >= 85 ? 'Some tests need attention' : 'Multiple failures detected — investigate immediately';
  const healthScoreArcLength: number = Math.round(Math.PI * 80 * 100) / 100;
  const healthScoreStrokeDashoffset: number = Math.round(healthScoreArcLength * (1 - executionSuccessRate / 100) * 100) / 100;

  const isAutomatedActive: boolean = playwright.stats.total > 0;
  const isPerformanceActive: boolean = !!k6 && (
    k6.metrics.p95LatencyMs !== null ||
    k6.metrics.errorRatePercent !== null ||
    k6.metrics.throughputRps !== null ||
    k6.thresholds.total > 0 ||
    k6.stats.totalRequests > 0 ||
    k6.warnings.length > 0
  );

  const coverageTypes: number = Number(isAutomatedActive) + Number(isPerformanceActive);
  const totalCoverage: number = 4;
  const performanceFailureRate: number = totalPerformanceScenarios > 0
    ? Math.round((failedPerformanceScenarios / totalPerformanceScenarios) * 100)
    : 0;
  const scenarioSuccessRate: number = totalPerformanceScenarios > 0
    ? Math.round((passedPerformanceScenariosValue / totalPerformanceScenarios) * 100)
    : 100;
  const requestFailureRate: number = totalRequests > 0
    ? Math.round((failedRequests / totalRequests) * 100)
    : 0;
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

  // -------------------------------------------------------------
  // Performance Tab v1 Display Formatting:
  // -------------------------------------------------------------
  const p95Val = k6?.metrics?.p95LatencyMs;
  const k6P95Display = p95Val !== null && p95Val !== undefined
    ? `${p95Val} ms`
    : 'N/A';

  const errRateVal = k6?.metrics?.errorRatePercent;
  const k6ErrorRateDisplay = errRateVal !== null && errRateVal !== undefined
    ? `${errRateVal}%`
    : 'N/A';

  const k6ErrorRateColor = errRateVal === null || errRateVal === undefined
    ? 'text-on-surface-variant'
    : errRateVal === 0
      ? 'text-emerald-400'
      : errRateVal <= 5
        ? 'text-amber-400'
        : 'text-error';

  const throughputVal = k6?.metrics?.throughputRps;
  const k6ThroughputDisplay = throughputVal !== null && throughputVal !== undefined
    ? `${throughputVal} req/s`
    : 'N/A';

  const threshStatus = k6?.thresholds?.status ?? 'none';
  let k6ThresholdsStatusBadge = `<span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold bg-surface-container text-on-surface-variant border border-outline-variant">NO THRESHOLDS</span>`;
  if (threshStatus === 'passed') {
    k6ThresholdsStatusBadge = `<span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold bg-emerald-950/40 text-emerald-400 border border-emerald-500/30"><span class="w-2 h-2 rounded-full bg-emerald-400"></span>PASSED</span>`;
  } else if (threshStatus === 'failed') {
    k6ThresholdsStatusBadge = `<span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold bg-error/10 text-error border border-error/30"><span class="w-2 h-2 rounded-full bg-error"></span>FAILED</span>`;
  }

  const k6TotalThresholds = k6?.thresholds?.total ?? 0;
  const k6PassedThresholds = k6?.thresholds?.passed ?? 0;
  const k6ThresholdsSummary = k6TotalThresholds > 0
    ? `${k6PassedThresholds} of ${k6TotalThresholds} rules passed`
    : 'No threshold rules evaluated';

  let k6WarningsContainer = '';
  if (k6 && k6.warnings && k6.warnings.length > 0) {
    const items = k6.warnings.map(w => `<li class="text-xs font-mono text-amber-200/90 py-0.5">${escapeHtml(w)}</li>`).join('');
    k6WarningsContainer = `
      <div class="bg-amber-950/20 border border-amber-500/40 rounded-xl p-gutter mt-base">
        <div class="flex items-center gap-2 text-amber-400 font-label-caps text-xs uppercase mb-2">
          <span class="material-symbols-outlined text-sm">warning</span>
          <span>Performance Ingestion Warnings (${k6.warnings.length})</span>
        </div>
        <ul class="list-disc list-inside space-y-1">
          ${items}
        </ul>
      </div>`;
  }

  let k6ThresholdsTable = '';
  if (k6 && k6.thresholds && k6.thresholds.items.length > 0) {
    const rows = k6.thresholds.items.map(t => {
      const badge = t.pass
        ? `<span class="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-950/40 text-emerald-400 border border-emerald-500/30">PASS</span>`
        : `<span class="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-error/10 text-error border border-error/30">FAIL</span>`;
      return `
        <tr class="border-b border-outline-variant/30 hover:bg-surface-container/30 transition-colors">
          <td class="p-gutter font-mono text-xs text-on-surface">${escapeHtml(t.name)}</td>
          <td class="p-gutter font-mono text-xs text-outline">${escapeHtml(t.metric)}</td>
          <td class="p-gutter text-right">${badge}</td>
        </tr>`;
    }).join('');

    k6ThresholdsTable = `
      <div class="bg-surface-container-lowest border border-outline-variant rounded-xl p-gutter mt-base">
        <h3 class="font-label-caps text-on-surface-variant text-[11px] uppercase mb-base">Threshold Rule Details</h3>
        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse">
            <thead>
              <tr class="bg-surface-container-low/50 border-b border-outline-variant text-[10px] font-label-caps uppercase text-on-surface-variant">
                <th class="p-gutter">Rule / Threshold</th>
                <th class="p-gutter">Metric Target</th>
                <th class="p-gutter text-right">Status</th>
              </tr>
            </thead>
            <tbody>
              ${rows}
            </tbody>
          </table>
        </div>
      </div>`;
  }

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
    passedPerformanceScenarios: passedPerformanceScenariosValue,
    failedPerformanceScenarios,
    performanceFailureRate,
    scenarioSuccessRate,
    requestFailureRate,
    successfulRequests: Math.max(0, totalRequests - failedRequests),
    failedRequests,
    requestSuccessRate,
    k6P95Display,
    k6ErrorRateDisplay,
    k6ErrorRateColor,
    k6ThroughputDisplay,
    k6ThresholdsStatusBadge,
    k6ThresholdsSummary,
    k6WarningsContainer,
    k6ThresholdsTable,
    overallStatusArray,
    durationLabels,
    durationData,
    durationColors,
    playwrightDataArray,
    failureRows: generateFailureRows(buildFailures(playwright, k6)),
    automatedTestRows: generateAutomatedTestRows(playwright),
    playwrightSuitesJson: JSON.stringify(playwright.suites).replace(/</g, '\\u003c'),
    coverageChips: generateCoverageChips(isAutomatedActive, isPerformanceActive),
    automatedCasesVisible: isAutomatedActive ? '' : 'hidden',
    performanceRequestsVisible: isPerformanceActive ? '' : 'hidden',
    automatedTabVisible: isAutomatedActive ? '' : 'hidden',
    performanceTabVisible: isPerformanceActive ? '' : 'hidden',
    historyData: JSON.stringify(history).replace(/</g, '\\u003c'),
  });
};
