import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { PlaywrightReport, PlaywrightSuite, PlaywrightSpec } from '../parsers/playwright.parser';
import { K6Report } from '../parsers/k6.parser';


class SafeString {
  constructor(public value: string) {}
  toString() { return this.value; }
}

const safe = (val: string) => new SafeString(val);

// ⚡ Bolt Optimization: Replaced sequential replace calls with a single regex and a map.
// Expected savings: Reduces O(5N) string allocations to O(N), saving memory and CPU on large reports.
const ESCAPE_MAP: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#039;'
};

const escapeHtml = (unsafe: string): string => {
  if (!unsafe) return "";
  return String(unsafe).replace(/[&<>"']/g, (m) => ESCAPE_MAP[m]);
};

interface Placeholders {
  [key: string]: string | number | SafeString;
}

// ⚡ Bolt Optimization:
// Caching the loaded template in memory after the first read.
// This eliminates repetitive file I/O operations (reading template.html, styles.css, script.js, and the logo)
// for each report generation, saving significant computational time and memory allocations on hot paths.
let cachedTemplate: string | null = null;

const loadTemplate = (): string => {
  if (cachedTemplate !== null) {
    return cachedTemplate;
  }

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

  try {
    let logoPath = join(__dirname, 'assets', 'grimoir-logo.png');
    if (!existsSync(logoPath)) {
      logoPath = join(__dirname, '..', '..', 'src', 'report', 'assets', 'grimoir-logo.png');
    }
    if (existsSync(logoPath)) {
      const logoBase64 = readFileSync(logoPath).toString('base64');
      template = template.replace('__GRIMOIR_LOGO_SRC__', `data:image/png;base64,${logoBase64}`);
    } else {
      template = template.replace('__GRIMOIR_LOGO_SRC__', '');
    }
  } catch (e) {
    template = template.replace('__GRIMOIR_LOGO_SRC__', '');
  }

  cachedTemplate = template;
  return template;
};

// ⚡ Bolt Optimization:
// Merged N regex replacements into a single pass over the HTML template string.
// Reduces time complexity from O(N * L) to O(L) where N is number of placeholders and L is template length.
const replacePlaceholders = (template: string, placeholders: Placeholders): string => {
  const map: Record<string, string> = {};
  for (const [key, value] of Object.entries(placeholders)) {
    const snakeKey = key.replace(/([A-Z])/g, '_$1').toUpperCase();
    if (value instanceof SafeString) {
      map[`__${snakeKey}__`] = value.toString();
    } else {
      map[`__${snakeKey}__`] = typeof value === 'string' ? escapeHtml(value) : String(value);
    }
  }
  return template.replace(/__[A-Z0-9_]+__/g, (match) => {
    return map[match] !== undefined ? map[match] : match;
  });
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

// ⚡ Bolt Optimization: Replaced chained .filter().map() with a single for loop to avoid intermediate array allocations.
const buildFailures = (playwright: PlaywrightReport, k6: K6Report | null): Failure[] => {
  const rows = extractAutomatedRows(playwright.suites);
  const automatedFailures: Failure[] = [];
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (row.status === 'failed') {
      const errObj = row.error || {};
      const errMsg = typeof errObj === 'string' ? errObj : errObj.message || 'Unknown error';
      automatedFailures.push({
        type: 'Automated' as const,
        suite: row.suite,
        test: row.test,
        error: stripAnsi(errMsg),
        location: errObj.location,
        snippet: errObj.snippet,
        duration: row.duration,
      });
    }
  }

  const performanceFailures: Failure[] = [];
  if (k6) {
    // 1. Threshold failures from k6 summary
    if (k6.thresholds && Array.isArray(k6.thresholds.items)) {
      for (const t of k6.thresholds.items) {
        if (!t.pass) {
          performanceFailures.push({
            type: 'Performance' as const,
            suite: 'k6 Thresholds',
            test: `${t.metric} (${t.name})`,
            error: t.reason
              ? `k6 threshold breached on metric '${t.metric}': '${t.name}' failed — ${t.reason}`
              : `k6 threshold breached on metric '${t.metric}': '${t.name}' failed`,
            snippet: t.actualValue
              ? `Rule: ${t.name} | Observed Value: ${t.actualValue} | Metric: ${t.metric}`
              : undefined,
            duration: k6.stats.duration || 0,
          });
        }
      }
    }
    // 2. Check failures from k6 summary
    if (Array.isArray(k6.checks)) {
      for (const c of k6.checks) {
        if (c.fails > 0 || c.status === 'failed') {
          performanceFailures.push({
            type: 'Performance' as const,
            suite: 'k6 Checks',
            test: c.path ? `${c.name} (${c.path})` : c.name,
            error: c.reason || `Check '${c.name}' failed ${c.fails} of ${c.passes + c.fails} assertions (${c.passRate}% pass rate)`,
            snippet: `Passes: ${c.passes} | Fails: ${c.fails} | Pass Rate: ${c.passRate}% | Path: ${c.path || '::'}`,
            duration: k6.stats.duration || 0,
          });
        }
      }
    }
    // 3. Scenario failures if any
    if (k6.scenarios) {
      for (const [name, scenario] of Object.entries(k6.scenarios)) {
        if (scenario && scenario.status === 'failed') {
          performanceFailures.push({
            type: 'Performance' as const,
            suite: 'k6 Load Test',
            test: name,
            error: scenario.reason ? `Performance scenario failed — ${scenario.reason}` : 'Performance scenario failed',
            snippet: `Scenario: ${name} | VUs: ${scenario.vus} | Iterations: ${scenario.iterations}`,
            duration: k6.stats.duration || 0,
          });
        }
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
      ? 'bg-primary/15 text-primary-container border-primary/35'
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
              <tr class="hover:bg-error/5 transition-colors duration-500 group failure-row relative" data-index="${index}">
                <td class="p-gutter pl-4 relative">
                  <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 ${typeColor} text-xs font-bold rounded-full border">
                    <span class="w-1.5 h-1.5 ${dotColor} rounded-full" aria-hidden="true"></span> ${typeLabel}
                  </span>
                </td>
                <td class="p-gutter font-body-md text-on-surface font-semibold text-sm">${escapeHtml(test)}</td>
                <td class="p-gutter max-w-[320px]">
                  <div class="flex items-center justify-between gap-2 min-w-0">
                    <span class="font-mono text-sm text-error/90 truncate hidden md:inline">${escapeHtml(firstLineError)}</span>
                    <button type="button" class="view-error-btn inline-flex items-center justify-center w-8 h-8 text-on-surface-variant hover:text-primary active:scale-[0.96] transition-[color,border-color,background-color,transform] duration-500 rounded-lg border border-outline-variant/40 hover:border-primary/50 bg-surface-container shrink-0" data-error-html="${escapeHtml(fullErrorHtml)}" aria-label="View full error for ${escapeHtml(test)}" title="View full diagnostic">
                      <span class="material-symbols-outlined text-base" aria-hidden="true">open_in_full</span>
                    </button>
                  </div>
                </td>
                <td class="p-gutter font-mono text-sm text-on-surface-variant text-right tabular-nums">${durationText}</td>
              </tr>`;
  }).join('');
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

// ⚡ Bolt Optimization:
// Replaced .some() and .every() with a single for loop to compute spec status in one pass.
// This avoids closure memory allocations and reduces redundant iterations over tests.
const determineSpecStatus = (spec: PlaywrightSpec): 'passed' | 'failed' | 'flaky' | 'skipped' => {
  if (!spec.ok) {
    return 'failed';
  }
  if (!spec.tests || spec.tests.length === 0) {
    return 'skipped';
  }
  let allSkipped = true;
  for (let i = 0; i < spec.tests.length; i++) {
    const status = spec.tests[i].status;
    if (status === 'flaky') return 'flaky';
    if (status !== 'skipped') allSkipped = false;
  }
  return allSkipped ? 'skipped' : 'passed';
};

// ⚡ Bolt Optimization:
// Replaced nested .reduce() calls with nested for loops to calculate total spec duration.
// This avoids closure memory allocations and function call overhead.
const calculateSpecDuration = (spec: PlaywrightSpec): number => {
  if (!spec.tests) return 0;
  let total = 0;
  for (let i = 0; i < spec.tests.length; i++) {
    const t = spec.tests[i];
    if (t.results) {
      for (let j = 0; j < t.results.length; j++) {
        total += t.results[j].duration || 0;
      }
    }
  }
  return total;
};

const getSpecError = (spec: PlaywrightSpec): any => {
  const lastTest = spec.tests?.[spec.tests.length - 1];
  const lastResult = lastTest?.results?.[lastTest.results.length - 1];
  return lastResult?.error || (lastResult?.errors && lastResult.errors[0]);
};

// ⚡ Bolt Optimization:
// Passing an accumulator array (`rows`) as an argument to mutate in-place rather than using `rows = rows.concat(recursiveCall())`.
// This prevents O(N^2) memory allocations and reduces garbage collection overhead when parsing deeply nested suites.
// ⚡ Bolt Optimization: Replaced for...of loops with standard for loops to avoid iterator allocation overhead.
const extractAutomatedRows = (suites: PlaywrightSuite[], parentTitle = '', rows: AutomatedRow[] = []): AutomatedRow[] => {
  for (let i = 0; i < suites.length; i++) {
    const suite = suites[i];
    const currentTitle = parentTitle ? `${parentTitle} > ${suite.title}` : suite.title;

    if (suite.specs) {
      for (let j = 0; j < suite.specs.length; j++) {
        const spec = suite.specs[j];
        rows.push({
          suite: currentTitle,
          test: spec.title,
          status: determineSpecStatus(spec),
          duration: calculateSpecDuration(spec),
          error: getSpecError(spec)
        });
      }
    }

    if (suite.suites) {
      extractAutomatedRows(suite.suites, currentTitle, rows);
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
        statusBadge = '<span class="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-950/40 text-emerald-400 text-xs font-bold rounded-full border border-emerald-500/30"><span class="w-1.5 h-1.5 bg-emerald-400 rounded-full" aria-hidden="true"></span><span class="visually-hidden">Status: </span>Passed</span>';
        break;
      case 'failed':
        statusBadge = '<span class="inline-flex items-center gap-1 px-2 py-0.5 bg-error/10 text-error text-xs font-bold rounded-full border border-error/30"><span class="w-1.5 h-1.5 bg-error rounded-full" aria-hidden="true"></span><span class="visually-hidden">Status: </span>Failed</span>';
        statusClass = 'hover:bg-error/5';
        break;
      case 'flaky':
        statusBadge = '<span class="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-950/40 text-amber-400 text-xs font-bold rounded-full border border-amber-500/30"><span class="w-1.5 h-1.5 bg-amber-400 rounded-full" aria-hidden="true"></span><span class="visually-hidden">Status: </span>Flaky</span>';
        break;
      case 'skipped':
        statusBadge = '<span class="inline-flex items-center gap-1 px-2 py-0.5 bg-surface-container text-outline text-xs font-bold rounded-full border border-outline-variant"><span class="w-1.5 h-1.5 bg-outline rounded-full" aria-hidden="true"></span><span class="visually-hidden">Status: </span>Skipped</span>';
        break;
    }

    return `
      <tr class="border-b border-outline-variant/30 hover:bg-surface-container/30 transition-colors duration-500 ${statusClass}">
        <td class="p-gutter font-mono text-xs text-outline max-w-[200px] truncate" title="${escapeHtml(row.suite)}">${escapeHtml(row.suite)}</td>
        <td class="p-gutter font-body-md text-sm text-on-surface font-medium">${escapeHtml(row.test)}</td>
        <td class="p-gutter">${statusBadge}</td>
        <td class="p-gutter font-mono text-sm text-on-surface-variant text-right">${formatDuration(row.duration)}</td>
      </tr>`;
  }).join('');
};


const generateTableWrapper = (title: string, ariaLabel: string, headersHtml: string, rowsHtml: string): string => {
  return `
      <div class="bg-surface-container-lowest border border-outline-variant rounded-xl p-gutter mt-base">
        <h3 class="font-display text-base font-semibold text-on-surface tracking-wide uppercase mb-base">${title}</h3>
        <div class="overflow-x-auto grimoir-table-wrapper" tabindex="0" role="region" aria-label="${ariaLabel}">
          <table class="w-full text-left grimoir-data-table">
            <thead>
              ${headersHtml}
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
        </div>
      </div>`;
};

const generateCoverageChips = (isAutomatedActive: boolean, isPerformanceActive: boolean): string => {
  const types = [
    { label: 'Automated', active: isAutomatedActive },
    { label: 'Performance', active: isPerformanceActive },
    { label: 'API', active: false },
    { label: 'Unit', active: false },
  ];

  return types.map(type => {
    const ledClass = type.active ? 'led-on-emerald' : 'led-off';
    const chipBorder = type.active
      ? 'border-primary/40 bg-surface-container/90 shadow-[inset_0_1px_0_0_rgba(229,197,131,0.18)]'
      : 'border-outline-variant/25 bg-surface-container-low/50 opacity-75';
    const textClass = type.active ? 'text-on-surface font-semibold' : 'text-outline font-medium';
    return `
            <div class="inline-flex items-center gap-2.5 px-3 py-1.5 rounded-lg border transition-colors duration-500 ${chipBorder}">
              <span class="led-indicator ${ledClass}" aria-hidden="true"></span>
              <span class="font-body-md ${textClass} text-xs tracking-wide">${type.label}</span>
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

  const isAutomatedActive: boolean = playwright.stats.total > 0;
  const isPerformanceActive: boolean = !!k6 && (
    k6.metrics.p95LatencyMs !== null ||
    k6.metrics.errorRatePercent !== null ||
    k6.metrics.throughputRps !== null ||
    k6.thresholds.total > 0 ||
    k6.stats.totalRequests > 0 ||
    k6.warnings.length > 0
  );

  const totalExecutionUnits: number = totalAutomatedCases + k6ThresholdsTotal;
  const passedExecutionUnits: number = passedAutomatedCases + k6ThresholdsPassed;
  const hasNoK6Thresholds: boolean = isPerformanceActive && k6ThresholdsTotal === 0;
  const executionSuccessRate: number = totalExecutionUnits > 0
    ? Math.round((passedExecutionUnits / totalExecutionUnits) * 100)
    : hasNoK6Thresholds ? 0 : 100;

  let healthStatus: string = executionSuccessRate >= 95 ? 'HEALTHY' : executionSuccessRate >= 85 ? 'DEGRADED' : 'CRITICAL';
  let healthColor: string = executionSuccessRate >= 95 ? 'bg-emerald-400' : executionSuccessRate >= 85 ? 'bg-amber-400' : 'bg-error';
  let healthScoreColorHex: string = executionSuccessRate >= 95 ? '#34d399' : executionSuccessRate >= 85 ? '#fbbf24' : '#ef4444';
  let healthLabel: string = executionSuccessRate >= 95 ? 'All systems operational — ready for release' :
    executionSuccessRate >= 85 ? 'Some tests need attention' : 'Multiple failures detected — investigate immediately';

  if (hasNoK6Thresholds && (totalExecutionUnits === 0 || executionSuccessRate >= 95)) {
    healthStatus = 'UNVERIFIED';
    healthColor = 'bg-amber-400';
    healthScoreColorHex = '#fbbf24';
    healthLabel = totalExecutionUnits === 0
      ? 'No k6 thresholds configured — SLA unverified'
      : 'Automated tests passed, but k6 thresholds are not configured';
  }
  const healthScoreArcLength: number = Math.round(Math.PI * 80 * 100) / 100;
  const healthScoreStrokeDashoffset: number = Math.round(healthScoreArcLength * (1 - executionSuccessRate / 100) * 100) / 100;

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

  // k6Stats.duration is documented and normalized in milliseconds by k6 parser
  const k6DurationMs: number = Math.round(k6Stats.duration || 0);

  // Convert durations to seconds with 1 decimal place for clear, proportional chart visualization
  const playwrightDurationSec: number = Number((playwrightDurationMs / 1000).toFixed(1));
  const k6DurationSec: number = Number((k6DurationMs / 1000).toFixed(1));

  const durationTypes = [
    { label: 'Automated', value: playwrightDurationSec, color: '#8B5CF6' },
    { label: 'Performance', value: k6DurationSec, color: '#FBBF24' },
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

  const avgVal = k6?.metrics?.avgLatencyMs;
  const k6AvgDisplay = avgVal !== null && avgVal !== undefined ? `${avgVal} ms` : 'N/A';
  const minVal = k6?.metrics?.minLatencyMs;
  const k6MinDisplay = minVal !== null && minVal !== undefined ? `${minVal} ms` : 'N/A';
  const medVal = k6?.metrics?.medLatencyMs;
  const k6MedDisplay = medVal !== null && medVal !== undefined ? `${medVal} ms` : 'N/A';
  const maxVal = k6?.metrics?.maxLatencyMs;
  const k6MaxDisplay = maxVal !== null && maxVal !== undefined ? `${maxVal} ms` : 'N/A';
  const p90Val = k6?.metrics?.p90LatencyMs;
  const k6P90Display = p90Val !== null && p90Val !== undefined ? `${p90Val} ms` : 'N/A';

  const vusVal = k6?.metrics?.vus ?? null;
  const vusMaxVal = k6?.metrics?.vusMax ?? null;
  const k6VusDisplay = vusVal !== null && vusVal !== undefined ? `${vusVal}` : 'N/A';
  const k6VusMaxDisplay = vusMaxVal !== null && vusMaxVal !== undefined ? `Peak: ${vusMaxVal} VUs` : 'N/A';

  const k6DataArray = JSON.stringify([
    avgVal ?? null,
    minVal ?? null,
    medVal ?? null,
    maxVal ?? null,
    p90Val ?? null,
    p95Val ?? null,
  ]);

  const trendsCatalog: Record<string, {
    label: string;
    unit: string;
    min: number | null;
    med: number | null;
    avg: number | null;
    p90: number | null;
    p95: number | null;
    max: number | null;
    data: Array<number | null>;
  }> = {
    http_req_duration: {
      label: 'http_req_duration (Standard HTTP)',
      unit: 'ms',
      min: minVal ?? null,
      med: medVal ?? null,
      avg: avgVal ?? null,
      p90: p90Val ?? null,
      p95: p95Val ?? null,
      max: maxVal ?? null,
      data: [avgVal ?? null, minVal ?? null, medVal ?? null, maxVal ?? null, p90Val ?? null, p95Val ?? null],
    },
  };

  const standardTrendOptions: string[] = [
    `<option value="http_req_duration">http_req_duration (Standard HTTP)</option>`,
  ];
  const customTrendOptions: string[] = [];

  for (const cm of k6?.customMetrics ?? []) {
    if (cm.type === 'trend') {
      trendsCatalog[cm.name] = {
        label: `${cm.name} (Custom Trend)`,
        unit: cm.contains === 'time' ? 'ms' : '',
        min: cm.values.min ?? null,
        med: cm.values.med ?? null,
        avg: cm.values.avg ?? null,
        p90: cm.values.p90 ?? null,
        p95: cm.values.p95 ?? null,
        max: cm.values.max ?? null,
        data: [
          cm.values.avg ?? null,
          cm.values.min ?? null,
          cm.values.med ?? null,
          cm.values.max ?? null,
          cm.values.p90 ?? null,
          cm.values.p95 ?? null,
        ],
      };
      customTrendOptions.push(
        `<option value="${escapeHtml(cm.name)}">${escapeHtml(cm.name)} (Custom Trend)</option>`
      );
    }
  }

  const k6TrendsCatalogJson = safe(JSON.stringify(trendsCatalog).replace(/</g, '\\u003c'));
  const trendSelectorMarkup = customTrendOptions.length > 0
    ? `<optgroup label="Standard HTTP">${standardTrendOptions.join('')}</optgroup><optgroup label="Custom Trends">${customTrendOptions.join('')}</optgroup>`
    : standardTrendOptions.join('');
  const k6TrendSelectorOptions = safe(trendSelectorMarkup);
  const k6TrendSelectorVisible = Object.keys(trendsCatalog).length > 1 ? '' : 'hidden';

  const httpPhases = k6?.httpPhases ?? [];
  const k6PhasesDataJson = safe(JSON.stringify(httpPhases).replace(/</g, '\\u003c'));
  const k6PhasesSectionVisible = httpPhases.length > 0 ? '' : 'hidden';

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
  let k6ThresholdsStatusBadge = `<span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold bg-surface-container text-on-surface-variant border border-outline-variant"><span class="visually-hidden">Status: </span>NO THRESHOLDS</span>`;
  if (threshStatus === 'passed') {
    k6ThresholdsStatusBadge = `<span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold bg-emerald-950/40 text-emerald-400 border border-emerald-500/30"><span class="w-2 h-2 rounded-full bg-emerald-400" aria-hidden="true"></span><span class="visually-hidden">Status: </span>PASSED</span>`;
  } else if (threshStatus === 'failed') {
    k6ThresholdsStatusBadge = `<span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold bg-error/10 text-error border border-error/30"><span class="w-2 h-2 rounded-full bg-error" aria-hidden="true"></span><span class="visually-hidden">Status: </span>FAILED</span>`;
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
      <div class="bg-amber-950/20 border border-amber-500/40 rounded-xl p-gutter mt-base" role="alert">
        <div class="flex items-center gap-2 text-amber-400 font-label-caps text-xs uppercase mb-2">
          <span class="material-symbols-outlined text-sm" aria-hidden="true">warning</span>
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
        ? `<span class="px-2 py-0.5 rounded text-xs font-mono font-bold bg-emerald-950/40 text-emerald-400 border border-emerald-500/30">PASS</span>`
        : `<span class="px-2 py-0.5 rounded text-xs font-mono font-bold bg-error/10 text-error border border-error/30">FAIL</span>`;
      const actualBadge = t.actualValue && t.actualValue !== 'N/A'
        ? `<span class="inline-block px-1.5 py-0.5 mr-2 rounded bg-surface-container text-on-surface font-mono font-bold text-xs border border-outline-variant/40">${escapeHtml(t.actualValue)}</span>`
        : '';
      const reasonText = escapeHtml(t.reason || (t.pass ? 'Threshold met' : 'Threshold breached'));
      return `
        <tr class="border-b border-outline-variant/30 hover:bg-surface-container/30 transition-colors perf-metric-row">
          <td class="p-gutter font-mono text-xs text-on-surface">${escapeHtml(t.name)}</td>
          <td class="p-gutter font-mono text-xs text-on-surface-variant">${escapeHtml(t.metric)}</td>
          <td class="p-gutter">
            <div class="flex flex-wrap items-center gap-1">
              ${actualBadge}
              <span class="text-xs font-mono ${t.pass ? 'text-on-surface-variant' : 'text-error/90'}">${reasonText}</span>
            </div>
          </td>
          <td class="p-gutter text-right">${badge}</td>
        </tr>`;
    }).join('');

    k6ThresholdsTable = generateTableWrapper(
      'Threshold Rule Details',
      'k6 Threshold Rules',
      `<tr class="bg-surface-container-low/50 border-b border-outline-variant text-xs font-label-caps uppercase text-on-surface-variant">
                <th scope="col" class="p-gutter">Rule / Threshold</th>
                <th scope="col" class="p-gutter">Metric Target</th>
                <th scope="col" class="p-gutter">Observed &amp; Reason</th>
                <th scope="col" class="p-gutter text-right">Status</th>
              </tr>`,
      rows
    );
  }

  let k6ScenariosTable = '';
  if (k6 && k6.scenarios && Object.keys(k6.scenarios).length > 0) {
    const sRows = Object.entries(k6.scenarios).map(([name, sc]) => {
      const isPassed = sc.status === 'passed';
      const badge = isPassed
        ? `<span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-emerald-950/40 text-emerald-400 border border-emerald-500/30"><span class="w-1.5 h-1.5 rounded-full bg-emerald-400" aria-hidden="true"></span><span class="visually-hidden">Status: </span>PASSED</span>`
        : `<span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-error/10 text-error border border-error/30"><span class="w-1.5 h-1.5 rounded-full bg-error" aria-hidden="true"></span><span class="visually-hidden">Status: </span>FAILED</span>`;
      const detailsText = escapeHtml(sc.reason || (isPassed ? `Completed ${sc.iterations} iterations` : 'Performance scenario failed'));
      return `
        <tr class="border-b border-outline-variant/30 hover:bg-surface-container/30 transition-colors perf-metric-row">
          <td class="p-gutter font-mono text-xs text-on-surface font-semibold">${escapeHtml(name)}</td>
          <td class="p-gutter font-mono text-xs text-on-surface-variant">${sc.vus} VUs</td>
          <td class="p-gutter font-mono text-xs text-on-surface-variant">${sc.iterations.toLocaleString()} iterations</td>
          <td class="p-gutter">
            <span class="text-xs font-mono ${isPassed ? 'text-on-surface-variant' : 'text-error/90'}">${detailsText}</span>
          </td>
          <td class="p-gutter text-right">${badge}</td>
        </tr>`;
    }).join('');

    k6ScenariosTable = generateTableWrapper(
      'Scenario Runs',
      'k6 Scenario Runs',
      `<tr class="bg-surface-container-low/50 border-b border-outline-variant text-xs font-label-caps uppercase text-on-surface-variant">
                <th scope="col" class="p-gutter">Scenario</th>
                <th scope="col" class="p-gutter">Virtual Users</th>
                <th scope="col" class="p-gutter">Iterations</th>
                <th scope="col" class="p-gutter">Execution Details / Why</th>
                <th scope="col" class="p-gutter text-right">Status</th>
              </tr>`,
      sRows
    );
  }

  let k6ChecksTable = '';
  if (k6?.checks && k6.checks.length > 0) {
    const checkRows = k6.checks.map(c => {
      const isPassed = c.fails === 0 && c.status === 'passed';
      const badge = isPassed
        ? `<span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-emerald-950/40 text-emerald-400 border border-emerald-500/30"><span class="w-1.5 h-1.5 rounded-full bg-emerald-400" aria-hidden="true"></span><span class="visually-hidden">Status: </span>PASSED</span>`
        : `<span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-error/10 text-error border border-error/30"><span class="w-1.5 h-1.5 rounded-full bg-error" aria-hidden="true"></span><span class="visually-hidden">Status: </span>FAILED</span>`;
      const barColor = c.fails > 0 ? 'bg-error' : 'bg-emerald-400';
      return `
        <tr class="border-b border-outline-variant/30 hover:bg-surface-container/30 transition-colors perf-metric-row">
          <td class="p-gutter font-mono text-xs text-on-surface font-semibold">${escapeHtml(c.name)}</td>
          <td class="p-gutter font-mono text-xs text-on-surface-variant">${escapeHtml(c.path || '::')}</td>
          <td class="p-gutter font-mono text-xs">
            <span class="text-emerald-400">${c.passes.toLocaleString()}</span> / <span class="${c.fails > 0 ? 'text-error font-bold' : 'text-on-surface-variant'}">${c.fails.toLocaleString()}</span>
          </td>
          <td class="p-gutter">
            <div class="flex items-center gap-2">
              <div class="w-16 h-1.5 bg-surface-container rounded-full overflow-hidden">
                <div class="h-full ${barColor}" style="width: ${Math.max(0, Math.min(100, c.passRate))}%"></div>
              </div>
              <span class="font-mono text-xs text-on-surface font-semibold">${c.passRate}%</span>
            </div>
            <div class="text-xs font-mono ${c.fails > 0 ? 'text-error/90' : 'text-on-surface-variant'} mt-0.5">${escapeHtml(c.reason)}</div>
          </td>
          <td class="p-gutter text-right">${badge}</td>
        </tr>`;
    }).join('');

    k6ChecksTable = generateTableWrapper(
      'k6 Check Assertions',
      'k6 Check Assertions',
      `<tr class="bg-surface-container-low/50 border-b border-outline-variant text-xs font-label-caps uppercase text-on-surface-variant">
                <th scope="col" class="p-gutter">Check Name</th>
                <th scope="col" class="p-gutter">Group Path</th>
                <th scope="col" class="p-gutter">Passes / Fails</th>
                <th scope="col" class="p-gutter">Pass Rate &amp; Why</th>
                <th scope="col" class="p-gutter text-right">Status</th>
              </tr>`,
      checkRows
    );
  }

  let k6CustomMetricsTable = '';
  if (k6?.customMetrics && k6.customMetrics.length > 0) {
    const cmRows = k6.customMetrics.map(cm => {
      const unit = cm.contains === 'time' ? 'ms' : '';
      let typeBadge = '';
      switch (cm.type) {
        case 'trend':
          typeBadge = `<span class="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-primary/15 text-primary border border-primary/30 uppercase">TREND</span>`;
          break;
        case 'rate':
          typeBadge = `<span class="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-emerald-950/40 text-emerald-400 border border-emerald-500/30 uppercase">RATE</span>`;
          break;
        case 'counter':
          typeBadge = `<span class="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-secondary/15 text-secondary border border-secondary/30 uppercase">COUNTER</span>`;
          break;
        case 'gauge':
          typeBadge = `<span class="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-surface-container text-on-surface-variant border border-outline-variant uppercase">GAUGE</span>`;
          break;
      }

      let primaryValue = '';
      let breakdown = '';
      if (cm.type === 'trend') {
        primaryValue = `p(95): ${cm.values.p95 ?? 'N/A'}${unit}`;
        breakdown = `min: ${cm.values.min ?? 'N/A'}${unit} · med: ${cm.values.med ?? 'N/A'}${unit} · avg: ${cm.values.avg ?? 'N/A'}${unit} · p90: ${cm.values.p90 ?? 'N/A'}${unit} · max: ${cm.values.max ?? 'N/A'}${unit}`;
      } else if (cm.type === 'rate') {
        const passesStr = cm.values.passes !== null && cm.values.passes !== undefined ? String(cm.values.passes) : 'N/A';
        const failsStr = cm.values.fails !== null && cm.values.fails !== undefined ? String(cm.values.fails) : 'N/A';
        primaryValue = `${cm.values.rate ?? 'N/A'}%`;
        breakdown = `passes: ${passesStr} · fails: ${failsStr}`;
      } else if (cm.type === 'counter') {
        const countStr = cm.values.count !== null && cm.values.count !== undefined ? cm.values.count.toLocaleString() : 'N/A';
        const rateStr = cm.values.rate !== null && cm.values.rate !== undefined ? `${cm.values.rate}/s` : 'N/A';
        primaryValue = countStr;
        breakdown = `throughput: ${rateStr}`;
      } else {
        primaryValue = `${cm.values.value ?? 'N/A'}`;
        breakdown = `min: ${cm.values.min ?? 'N/A'} · max: ${cm.values.max ?? 'N/A'}`;
      }

      return `
        <tr class="border-b border-outline-variant/30 hover:bg-surface-container/30 transition-colors perf-metric-row">
          <td class="p-gutter font-mono text-xs text-on-surface font-semibold">${escapeHtml(cm.name)}</td>
          <td class="p-gutter">${typeBadge}</td>
          <td class="p-gutter font-mono text-xs text-primary font-bold">${escapeHtml(primaryValue)}</td>
          <td class="p-gutter font-mono text-xs text-on-surface-variant">${escapeHtml(breakdown)}</td>
        </tr>`;
    }).join('');

    k6CustomMetricsTable = generateTableWrapper(
      'Custom k6 Metrics',
      'Custom k6 Metrics',
      `<tr class="bg-surface-container-low/50 border-b border-outline-variant text-xs font-label-caps uppercase text-on-surface-variant">
                <th scope="col" class="p-gutter">Metric Name</th>
                <th scope="col" class="p-gutter">Type</th>
                <th scope="col" class="p-gutter">Primary Value</th>
                <th scope="col" class="p-gutter">Distribution / Breakdown</th>
              </tr>`,
      cmRows
    );
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
    k6AvgDisplay,
    k6MinDisplay,
    k6MedDisplay,
    k6MaxDisplay,
    k6P90Display,
    k6VusDisplay,
    k6VusMaxDisplay,
    k6DataArray: safe(k6DataArray),
    k6TrendsCatalogJson,
    k6TrendSelectorOptions,
    k6TrendSelectorVisible,
    k6PhasesDataJson,
    k6PhasesSectionVisible,
    k6ErrorRateDisplay,
    k6ErrorRateColor,
    k6ThroughputDisplay,
    k6ThresholdsStatusBadge: safe(k6ThresholdsStatusBadge),
    k6ThresholdsSummary,
    k6WarningsContainer: safe(k6WarningsContainer),
    k6ThresholdsTable: safe(k6ThresholdsTable),
    k6ScenariosTable: safe(k6ScenariosTable),
    k6ChecksTable: safe(k6ChecksTable),
    k6CustomMetricsTable: safe(k6CustomMetricsTable),
    overallStatusArray: safe(overallStatusArray),
    durationLabels: safe(durationLabels),
    durationData: safe(durationData),
    durationColors: safe(durationColors),
    playwrightDataArray: safe(playwrightDataArray),
    failureRows: safe(generateFailureRows(buildFailures(playwright, k6))),
    automatedTestRows: safe(generateAutomatedTestRows(playwright)),
    playwrightSuitesJson: safe(JSON.stringify(playwright.suites).replace(/</g, '\\u003c')),
    coverageChips: safe(generateCoverageChips(isAutomatedActive, isPerformanceActive)),
    automatedCasesVisible: isAutomatedActive ? '' : 'hidden',
    performanceRequestsVisible: isPerformanceActive ? '' : 'hidden',
    automatedTabVisible: isAutomatedActive ? '' : 'hidden',
    performanceTabVisible: isPerformanceActive ? '' : 'hidden',
    historyData: safe(JSON.stringify(history).replace(/</g, '\\u003c')),
  });
};
