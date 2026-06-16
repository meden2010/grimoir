import { PlaywrightReport } from '../parsers/playwright.parser';
import { K6Report } from '../parsers/k6.parser';

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

  return `<!DOCTYPE html>
<html class="dark" lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Grimoir — Test Report</title>
  <script src="https://cdn.tailwindcss.com?plugins=forms,container-queries"></script>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&family=Playfair+Display:wght@500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet"/>
  <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet"/>
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  <script id="tailwind-config">
    tailwind.config = {
      darkMode: "class",
      theme: {
        extend: {
          colors: {
            surface: "#15121b",
            "surface-dim": "#15121b",
            "surface-container-lowest": "#0f0d15",
            "surface-container-low": "#1d1a23",
            "surface-container": "#211e27",
            "surface-container-high": "#2c2832",
            "surface-bright": "#3b3742",
            "on-surface": "#e7e0ed",
            "on-surface-variant": "#cbc3d7",
            primary: "#8B5CF6",
            "on-primary": "#ffffff",
            "primary-container": "#8B5CF6",
            "on-primary-container": "#ffffff",
            secondary: "#FBBF24",
            "on-secondary": "#1a1a1a",
            "secondary-container": "#FBBF24",
            tertiary: "#B06B00",
            error: "#ef4444",
            "error-container": "#7f1d1d",
            "on-error": "#ffffff",
            "on-error-container": "#fecaca",
            outline: "#7A7580",
            "outline-variant": "#3d3a40",
            background: "#15121b",
            "on-background": "#e7e0ed",
          },
          borderRadius: { DEFAULT: "0.5rem", lg: "0.75rem", xl: "1rem", full: "9999px" },
          spacing: { gutter: "16px", base: "8px", section: "48px" },
          fontFamily: {
            display: ["Playfair Display", "serif"],
            body: ["Inter", "sans-serif"],
            mono: ["JetBrains Mono", "monospace"],
          },
          fontSize: {
            "display-lg": ["48px", { lineHeight: "1.2", letterSpacing: "-0.02em", fontWeight: "700" }],
            "headline-lg": ["32px", { lineHeight: "1.3", fontWeight: "600" }],
            "headline-md": ["24px", { lineHeight: "1.4", fontWeight: "500" }],
            "body-lg": ["18px", { lineHeight: "1.6", fontWeight: "400" }],
            "body-md": ["16px", { lineHeight: "1.5", fontWeight: "400" }],
            "code-sm": ["13px", { lineHeight: "1.5", fontWeight: "400" }],
            "label-caps": ["12px", { lineHeight: "1.2", letterSpacing: "0.1em", fontWeight: "600" }],
          },
        },
      },
    }
  </script>
  <style>
    .material-symbols-outlined {
      font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
    }
    .arcane-glow {
      box-shadow: 0 0 15px rgba(139, 92, 246, 0.1);
    }
    .mystic-border {
      border-image: linear-gradient(to right, #8B5CF6, #FBBF24) 1;
    }
    .chart-wrap { position: relative; height: 320px; }
    .chart-wrap canvas { max-height: 320px; }
    .custom-scrollbar::-webkit-scrollbar { width: 4px; }
    .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
    .custom-scrollbar::-webkit-scrollbar-thumb { background: #494454; border-radius: 10px; }
    .tab-active { border-bottom: 2px solid #8B5CF6 !important; color: #8B5CF6 !important; }
  </style>
</head>
<body class="bg-surface text-on-surface font-body font-body-md">

  <!-- Main Content -->
  <main class="max-w-[1440px] mx-auto px-gutter py-12">

    <!-- Header -->
    <div class="flex items-center justify-between mb-gutter">
      <div>
        <h1 class="font-display text-display-lg text-primary tracking-tight">Grimoir</h1>
        <p class="font-label-caps text-outline text-[10px] uppercase mt-base">Unified Test Report — ${new Date().toLocaleString()}</p>
      </div>
      <div class="flex items-center gap-base">
        <span class="material-symbols-outlined text-outline">download</span>
        <span class="material-symbols-outlined text-outline">share</span>
      </div>
    </div>

    <!-- Tab Navigation -->
    <nav class="flex items-center gap-gutter border-b border-outline-variant mb-section" id="tabNav">
      <button class="font-label-caps text-sm pb-gutter tab-active" data-tab="overview">
        <span class="material-symbols-outlined text-sm align-middle">auto_awesome</span> Overview
      </button>
      <button class="font-label-caps text-sm pb-gutter text-on-surface-variant hover:text-[#8B5CF6] transition-colors" data-tab="e2e">
        <span class="material-symbols-outlined text-sm align-middle">bolt</span> E2E
      </button>
      <button class="font-label-caps text-sm pb-gutter text-on-surface-variant hover:text-[#8B5CF6] transition-colors" data-tab="perf">
        <span class="material-symbols-outlined text-sm align-middle">insights</span> Performance
      </button>
    </nav>

    <!-- ==================== OVERVIEW TAB ==================== -->
    <div id="tab-overview" class="flex flex-col gap-section">

      <!-- Health Score Banner -->
      <section class="bg-surface-container-lowest border border-outline-variant rounded-xl p-gutter arcane-glow">
        <div class="flex flex-col md:flex-row items-start md:items-center justify-between gap-base">
          <div class="flex items-center gap-gutter">
            <div class="flex items-center gap-2">
              <span class="w-3 h-3 ${healthColor} rounded-full shadow-[0_0_8px_rgba(139,92,246,0.5)]"></span>
              <span class="font-label-caps text-sm text-primary">${healthStatus}</span>
            </div>
            <div>
              <p class="font-body-md text-on-surface-variant">${healthLabel}</p>
              <p class="font-label-caps text-outline text-[10px] uppercase mt-1">Last run — ${new Date().toLocaleString()}</p>
            </div>
          </div>
          <div class="flex items-baseline gap-1">
            <span class="font-display text-5xl text-primary">${testCasePassRate}</span>
            <span class="font-display text-3xl text-primary/60">%</span>
          </div>
        </div>
      </section>

      <!-- E2E Test Case KPIs -->
      <section class="flex flex-col gap-base">
        <h2 class="font-label-caps text-outline text-[10px] uppercase">Test Cases (E2E)</h2>
        <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-gutter">
          <div class="bg-surface-container-lowest border border-outline-variant rounded-xl p-gutter flex flex-col gap-2 hover:bg-surface-container transition-colors">
            <span class="material-symbols-outlined text-primary">science</span>
            <p class="font-label-caps text-outline text-[10px] uppercase">Total Test Cases</p>
            <p class="font-display text-headline-lg text-on-surface">${totalTestCases}</p>
            <p class="font-body-md text-on-surface-variant text-sm">${passedTestCases} passed · ${failedTestCases} failed · ${skippedTestCases} skipped</p>
          </div>
          <div class="bg-surface-container-lowest border border-outline-variant rounded-xl p-gutter flex flex-col gap-2 hover:bg-surface-container transition-colors">
            <span class="material-symbols-outlined text-emerald-400">check_circle</span>
            <p class="font-label-caps text-outline text-[10px] uppercase">Pass Rate</p>
            <p class="font-display text-headline-lg text-emerald-400">${testCasePassRate}%</p>
            <p class="font-body-md text-on-surface-variant text-sm">Test case pass rate</p>
          </div>
          <div class="bg-surface-container-lowest border border-outline-variant rounded-xl p-gutter flex flex-col gap-2 hover:bg-surface-container transition-colors">
            <span class="material-symbols-outlined text-tertiary">timer</span>
            <p class="font-label-caps text-outline text-[10px] uppercase">Duration</p>
            <p class="font-display text-headline-lg text-on-surface">${playwright.stats.duration}ms</p>
            <p class="font-body-md text-on-surface-variant text-sm">Total E2E execution time</p>
          </div>
          <div class="bg-surface-container-lowest border border-outline-variant rounded-xl p-gutter flex flex-col gap-2 hover:bg-surface-container transition-colors">
            <span class="material-symbols-outlined text-primary-container">layers</span>
            <p class="font-label-caps text-outline text-[10px] uppercase">Coverage</p>
            <p class="font-display text-headline-lg text-on-surface">${coverageTypes}/${totalCoverage}</p>
            <p class="font-body-md text-on-surface-variant text-sm">E2E ✓ · Perf ✓ · API ✗ · Unit ✗</p>
          </div>
        </div>
      </section>

      <!-- Performance Request KPIs -->
      <section class="flex flex-col gap-base">
        <h2 class="font-label-caps text-outline text-[10px] uppercase">Performance Requests</h2>
        <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-gutter">
          <div class="bg-surface-container-lowest border border-outline-variant rounded-xl p-gutter flex flex-col gap-2 hover:bg-surface-container transition-colors">
            <span class="material-symbols-outlined text-secondary">insights</span>
            <p class="font-label-caps text-outline text-[10px] uppercase">Total Requests</p>
            <p class="font-display text-headline-lg text-on-surface">${totalRequests}</p>
            <p class="font-body-md text-on-surface-variant text-sm">k6 requests executed</p>
          </div>
          <div class="bg-surface-container-lowest border border-outline-variant rounded-xl p-gutter flex flex-col gap-2 hover:bg-surface-container transition-colors">
            <span class="material-symbols-outlined text-emerald-400">check_circle</span>
            <p class="font-label-caps text-outline text-[10px] uppercase">Request Success</p>
            <p class="font-display text-headline-lg text-emerald-400">${requestSuccessRate}%</p>
            <p class="font-body-md text-on-surface-variant text-sm">${totalRequests - failedRequests} succeeded · ${failedRequests} failed</p>
          </div>
          <div class="bg-surface-container-lowest border border-outline-variant rounded-xl p-gutter flex flex-col gap-2 hover:bg-surface-container transition-colors">
            <span class="material-symbols-outlined text-secondary">timer</span>
            <p class="font-label-caps text-outline text-[10px] uppercase">Avg Response</p>
            <p class="font-display text-headline-lg text-on-surface">${k6.stats.duration}ms</p>
            <p class="font-body-md text-on-surface-variant text-sm">Average response time</p>
          </div>
          <div class="bg-surface-container-lowest border border-outline-variant rounded-xl p-gutter flex flex-col gap-2 hover:bg-surface-container transition-colors">
            <span class="material-symbols-outlined text-tertiary">speed</span>
            <p class="font-label-caps text-outline text-[10px] uppercase">P95 Response</p>
            <p class="font-display text-headline-lg text-on-surface">${k6.metrics.httpReqDuration.p95}ms</p>
            <p class="font-body-md text-on-surface-variant text-sm">95th percentile latency</p>
          </div>
        </div>
      </section>

      <!-- Charts Row -->
      <section class="grid grid-cols-1 md:grid-cols-2 gap-gutter">
        <div class="bg-surface-container-lowest border border-outline-variant rounded-xl p-gutter">
          <h3 class="font-label-caps text-on-surface-variant text-[11px] uppercase mb-base">E2E Distribution</h3>
          <div class="chart-wrap"><canvas id="overviewE2eChart"></canvas></div>
        </div>
        <div class="bg-surface-container-lowest border border-outline-variant rounded-xl p-gutter">
          <h3 class="font-label-caps text-on-surface-variant text-[11px] uppercase mb-base">Response Times</h3>
          <div class="chart-wrap"><canvas id="overviewK6Chart"></canvas></div>
        </div>
      </section>

      <!-- Quick Failures Table -->
      <section class="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden arcane-glow">
        <div class="p-gutter border-b border-outline-variant">
          <h3 class="font-label-caps text-on-surface-variant text-[11px] uppercase">Recent Failures</h3>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse">
            <thead>
              <tr class="bg-surface-container-low/50 border-b border-outline-variant">
                <th class="p-gutter font-label-caps text-on-surface-variant text-[10px] uppercase">Type</th>
                <th class="p-gutter font-label-caps text-on-surface-variant text-[10px] uppercase">Test</th>
                <th class="p-gutter font-label-caps text-on-surface-variant text-[10px] uppercase hidden md:table-cell">Error</th>
                <th class="p-gutter font-label-caps text-on-surface-variant text-[10px] uppercase text-right">Duration</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-outline-variant/30">
              ${playwright.suites.flatMap(suite => suite.tests
                .filter(test => test.status === 'failed')
                .map(test => `
              <tr class="hover:bg-error/5 transition-colors group border-l-4 border-l-error">
                <td class="p-gutter">
                  <span class="inline-flex items-center gap-1 px-2 py-0.5 bg-primary/10 text-primary text-[10px] font-bold rounded-full border border-primary/30">
                    <span class="w-1 h-1 bg-primary rounded-full"></span> E2E
                  </span>
                </td>
                <td class="p-gutter font-body-md text-on-surface font-semibold text-sm">${suite.title} — ${test.title}</td>
                <td class="p-gutter font-mono text-sm text-error/80 hidden md:table-cell max-w-[300px] truncate">${test.error || 'Unknown error'}</td>
                <td class="p-gutter font-mono text-sm text-on-surface-variant text-right">${test.duration}ms</td>
              </tr>`)).join('')}
              ${playwright.suites.flatMap(suite => suite.tests.filter(t => t.status === 'failed')).length === 0 ? `
              <tr>
                <td colspan="4" class="p-gutter text-center text-on-surface-variant font-body-md text-sm">
                  <span class="material-symbols-outlined text-emerald-400 align-middle text-sm">check_circle</span>
                  No failures detected — all tests passed
                </td>
              </tr>` : ''}
            </tbody>
          </table>
        </div>
      </section>

    </div>

    <!-- ==================== E2E TAB ==================== -->
    <div id="tab-e2e" class="hidden flex flex-col gap-gutter">

      <!-- E2E Stats -->
      <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-base">
        <div class="bg-surface-container-lowest border border-outline-variant rounded-lg p-base text-center">
          <p class="font-label-caps text-outline text-[10px] uppercase">Total</p>
          <p class="font-display text-headline-md text-on-surface mt-1">${playwright.stats.total}</p>
        </div>
        <div class="bg-surface-container-lowest border border-outline-variant rounded-lg p-base text-center">
          <p class="font-label-caps text-outline text-[10px] uppercase">Passed</p>
          <p class="font-display text-headline-md text-emerald-400 mt-1">${playwright.stats.passed}</p>
        </div>
        <div class="bg-surface-container-lowest border border-outline-variant rounded-lg p-base text-center">
          <p class="font-label-caps text-outline text-[10px] uppercase">Failed</p>
          <p class="font-display text-headline-md text-error mt-1">${playwright.stats.failed}</p>
        </div>
        <div class="bg-surface-container-lowest border border-outline-variant rounded-lg p-base text-center">
          <p class="font-label-caps text-outline text-[10px] uppercase">Skipped</p>
          <p class="font-display text-headline-md text-outline mt-1">${playwright.stats.skipped}</p>
        </div>
        <div class="bg-surface-container-lowest border border-outline-variant rounded-lg p-base text-center">
          <p class="font-label-caps text-outline text-[10px] uppercase">Duration</p>
          <p class="font-display text-headline-md text-primary mt-1">${playwright.stats.duration}ms</p>
        </div>
      </div>

      <!-- E2E Chart + Table -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-gutter">
        <div class="bg-surface-container-lowest border border-outline-variant rounded-xl p-gutter">
          <h3 class="font-label-caps text-on-surface-variant text-[11px] uppercase mb-base">Distribution</h3>
          <div class="chart-wrap"><canvas id="e2eChart"></canvas></div>
        </div>
        <div class="bg-surface-container-lowest border border-outline-variant rounded-xl p-gutter overflow-hidden">
          <h3 class="font-label-caps text-on-surface-variant text-[11px] uppercase mb-base">Test Details</h3>
          <div class="overflow-y-auto custom-scrollbar" style="max-height:320px">
            <table class="w-full text-left border-collapse text-sm">
              <thead>
                <tr class="border-b border-outline-variant">
                  <th class="py-2 font-label-caps text-outline text-[10px] uppercase">Suite</th>
                  <th class="py-2 font-label-caps text-outline text-[10px] uppercase">Test</th>
                  <th class="py-2 font-label-caps text-outline text-[10px] uppercase">Status</th>
                  <th class="py-2 font-label-caps text-outline text-[10px] uppercase text-right">Duration</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-outline-variant/20">
                ${playwright.suites.map(suite => suite.tests.map(test => `
                <tr class="hover:bg-surface-container transition-colors">
                  <td class="py-2 font-body-md text-on-surface font-medium text-xs">${suite.title}</td>
                  <td class="py-2 font-body-md text-on-surface text-xs">${test.title}</td>
                  <td class="py-2">
                    <span class="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded-full border ${test.status === 'passed' ? 'bg-primary/10 text-primary border-primary/30' : test.status === 'failed' ? 'bg-error/10 text-error border-error/30' : 'bg-surface-container text-outline border-outline-variant'}">
                      <span class="w-1 h-1 rounded-full ${test.status === 'passed' ? 'bg-primary' : test.status === 'failed' ? 'bg-error' : 'bg-outline'}"></span>
                      ${test.status.toUpperCase()}
                    </span>
                  </td>
                  <td class="py-2 font-mono text-xs text-on-surface-variant text-right">${test.duration}ms</td>
                </tr>`).join('')).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>

    <!-- ==================== PERFORMANCE TAB ==================== -->
    <div id="tab-perf" class="hidden flex flex-col gap-gutter">

      <!-- Perf Stats -->
      <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-base">
        <div class="bg-surface-container-lowest border border-outline-variant rounded-lg p-base text-center">
          <p class="font-label-caps text-outline text-[10px] uppercase">Requests</p>
          <p class="font-display text-headline-md text-on-surface mt-1">${k6.stats.totalRequests}</p>
        </div>
        <div class="bg-surface-container-lowest border border-outline-variant rounded-lg p-base text-center">
          <p class="font-label-caps text-outline text-[10px] uppercase">Success</p>
          <p class="font-display text-headline-md text-emerald-400 mt-1">${k6.stats.successRate}%</p>
        </div>
        <div class="bg-surface-container-lowest border border-outline-variant rounded-lg p-base text-center">
          <p class="font-label-caps text-outline text-[10px] uppercase">Failed</p>
          <p class="font-display text-headline-md text-error mt-1">${k6.stats.failedRequests}</p>
        </div>
        <div class="bg-surface-container-lowest border border-outline-variant rounded-lg p-base text-center">
          <p class="font-label-caps text-outline text-[10px] uppercase">Avg</p>
          <p class="font-display text-headline-md text-primary mt-1">${k6.stats.duration}ms</p>
        </div>
        <div class="bg-surface-container-lowest border border-outline-variant rounded-lg p-base text-center">
          <p class="font-label-caps text-outline text-[10px] uppercase">P95</p>
          <p class="font-display text-headline-md text-tertiary mt-1">${k6.metrics.httpReqDuration.p95}ms</p>
        </div>
      </div>

      <!-- Perf Chart + Table -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-gutter">
        <div class="bg-surface-container-lowest border border-outline-variant rounded-xl p-gutter">
          <h3 class="font-label-caps text-on-surface-variant text-[11px] uppercase mb-base">Response Times</h3>
          <div class="chart-wrap"><canvas id="perfChart"></canvas></div>
        </div>
        <div class="bg-surface-container-lowest border border-outline-variant rounded-xl p-gutter">
          <h3 class="font-label-caps text-on-surface-variant text-[11px] uppercase mb-base">Metrics</h3>
          <div class="space-y-base">
            <div class="flex justify-between items-center py-1 border-b border-outline-variant/20">
              <span class="font-body-md text-on-surface-variant text-sm">Requests</span>
              <span class="font-mono text-sm text-on-surface">${k6.metrics.httpReqs}</span>
            </div>
            <div class="flex justify-between items-center py-1 border-b border-outline-variant/20">
              <span class="font-body-md text-on-surface-variant text-sm">Failed Rate</span>
              <span class="font-mono text-sm text-error">${(k6.metrics.httpReqFailed * 100).toFixed(1)}%</span>
            </div>
            <div class="flex justify-between items-center py-1 border-b border-outline-variant/20">
              <span class="font-body-md text-on-surface-variant text-sm">Avg Response</span>
              <span class="font-mono text-sm text-on-surface">${k6.metrics.httpReqDuration.avg}ms</span>
            </div>
            <div class="flex justify-between items-center py-1 border-b border-outline-variant/20">
              <span class="font-body-md text-on-surface-variant text-sm">Min Response</span>
              <span class="font-mono text-sm text-on-surface">${k6.metrics.httpReqDuration.min}ms</span>
            </div>
            <div class="flex justify-between items-center py-1 border-b border-outline-variant/20">
              <span class="font-body-md text-on-surface-variant text-sm">Max Response</span>
              <span class="font-mono text-sm text-on-surface">${k6.metrics.httpReqDuration.max}ms</span>
            </div>
            <div class="flex justify-between items-center py-1 border-b border-outline-variant/20">
              <span class="font-body-md text-on-surface-variant text-sm">P90</span>
              <span class="font-mono text-sm text-on-surface">${k6.metrics.httpReqDuration.p90}ms</span>
            </div>
            <div class="flex justify-between items-center py-1">
              <span class="font-body-md text-on-surface-variant text-sm">P95</span>
              <span class="font-mono text-sm text-tertiary font-semibold">${k6.metrics.httpReqDuration.p95}ms</span>
            </div>
          </div>
        </div>
      </div>
    </div>

  </main>

  <!-- Tab switching script -->
  <script>
    document.getElementById('tabNav').addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-tab]');
      if (!btn) return;
      const tab = btn.dataset.tab;
      document.querySelectorAll('#tabNav button').forEach(b => b.classList.remove('tab-active'));
      btn.classList.add('tab-active');
      document.querySelectorAll('[id^="tab-"]').forEach(p => p.classList.add('hidden'));
      document.getElementById('tab-' + tab).classList.remove('hidden');
    });
  </script>

  <!-- Charts -->
  <script>
    const chartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { position: 'bottom', labels: { color: '#cbc3d7', boxWidth: 14, font: { size: 12, family: 'Inter' } } } }
    };

    // Overview E2E chart
    new Chart(document.getElementById('overviewE2eChart'), {
      type: 'doughnut',
      data: {
        labels: ['Passed', 'Failed', 'Skipped'],
        datasets: [{
          data: [${playwright.stats.passed}, ${playwright.stats.failed}, ${playwright.stats.skipped}],
          backgroundColor: ['#8B5CF6', '#ef4444', '#7A7580'],
          borderColor: '#0f0d15',
          borderWidth: 2,
        }]
      },
      options: chartOptions
    });

    // Overview K6 chart
    new Chart(document.getElementById('overviewK6Chart'), {
      type: 'bar',
      data: {
        labels: ['Avg', 'Min', 'Max', 'P90', 'P95'],
        datasets: [{
          label: 'Response Time (ms)',
          data: [
            ${k6.metrics.httpReqDuration.avg},
            ${k6.metrics.httpReqDuration.min},
            ${k6.metrics.httpReqDuration.max},
            ${k6.metrics.httpReqDuration.p90},
            ${k6.metrics.httpReqDuration.p95}
          ],
          backgroundColor: '#FBBF24',
          borderRadius: 4,
        }]
      },
      options: { ...chartOptions, scales: { x: { ticks: { color: '#cbc3d7' } }, y: { ticks: { color: '#cbc3d7' } } } }
    });

    // E2E tab chart (same data, different canvas)
    new Chart(document.getElementById('e2eChart'), {
      type: 'doughnut',
      data: {
        labels: ['Passed', 'Failed', 'Skipped'],
        datasets: [{
          data: [${playwright.stats.passed}, ${playwright.stats.failed}, ${playwright.stats.skipped}],
          backgroundColor: ['#8B5CF6', '#ef4444', '#7A7580'],
          borderColor: '#0f0d15',
          borderWidth: 2,
        }]
      },
      options: chartOptions
    });

    // Performance chart
    new Chart(document.getElementById('perfChart'), {
      type: 'bar',
      data: {
        labels: ['Avg', 'Min', 'Max', 'P90', 'P95'],
        datasets: [{
          label: 'Response Time (ms)',
          data: [
            ${k6.metrics.httpReqDuration.avg},
            ${k6.metrics.httpReqDuration.min},
            ${k6.metrics.httpReqDuration.max},
            ${k6.metrics.httpReqDuration.p90},
            ${k6.metrics.httpReqDuration.p95}
          ],
          backgroundColor: '#FBBF24',
          borderRadius: 4,
        }]
      },
      options: { ...chartOptions, scales: { x: { ticks: { color: '#cbc3d7' } }, y: { ticks: { color: '#cbc3d7' } } } }
    });
  </script>

</body>
</html>`;
};
