import { PlaywrightReport } from '../parsers/playwright.parser';
import { K6Report } from '../parsers/k6.parser';

export function generateHTML(
  playwright: PlaywrightReport,
  k6: K6Report
): string {
  return `<!DOCTYPE html>
<html lang="en" data-theme="dark">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Grimoir — Test Report</title>
  <link href="https://cdn.jsdelivr.net/npm/daisyui@4.4.19/dist/full.min.css" rel="stylesheet"/>
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
</head>
<body class="bg-base-300 min-h-screen p-8">

  <!-- Header -->
  <div class="flex items-center gap-4 mb-8">
    <div>
      <h1 class="text-4xl font-bold text-primary">📖 Grimoir</h1>
      <p class="text-base-content opacity-60">Unified Test Report — ${new Date().toLocaleString()}</p>
    </div>
  </div>

  <!-- Summary Cards -->
  <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">

    <!-- Playwright Card -->
    <div class="card bg-base-100 shadow-xl">
      <div class="card-body">
        <h2 class="card-title text-secondary">🎭 E2E Tests — Playwright</h2>
        <div class="stats stats-vertical shadow">
          <div class="stat">
            <div class="stat-title">Total Tests</div>
            <div class="stat-value">${playwright.stats.total}</div>
          </div>
          <div class="stat">
            <div class="stat-title">Passed</div>
            <div class="stat-value text-success">${playwright.stats.passed}</div>
          </div>
          <div class="stat">
            <div class="stat-title">Failed</div>
            <div class="stat-value text-error">${playwright.stats.failed}</div>
          </div>
          <div class="stat">
            <div class="stat-title">Skipped</div>
            <div class="stat-value text-warning">${playwright.stats.skipped}</div>
          </div>
          <div class="stat">
            <div class="stat-title">Duration</div>
            <div class="stat-value text-info">${playwright.stats.duration}ms</div>
          </div>
        </div>
        <div class="mt-4">
          <canvas id="playwrightChart"></canvas>
        </div>
      </div>
    </div>

    <!-- k6 Card -->
    <div class="card bg-base-100 shadow-xl">
      <div class="card-body">
        <h2 class="card-title text-secondary">⚡ Performance — k6</h2>
        <div class="stats stats-vertical shadow">
          <div class="stat">
            <div class="stat-title">Total Requests</div>
            <div class="stat-value">${k6.stats.totalRequests}</div>
          </div>
          <div class="stat">
            <div class="stat-title">Success Rate</div>
            <div class="stat-value text-success">${k6.stats.successRate}%</div>
          </div>
          <div class="stat">
            <div class="stat-title">Failed Requests</div>
            <div class="stat-value text-error">${k6.stats.failedRequests}</div>
          </div>
          <div class="stat">
            <div class="stat-title">Avg Duration</div>
            <div class="stat-value text-info">${k6.stats.duration}ms</div>
          </div>
          <div class="stat">
            <div class="stat-title">P95</div>
            <div class="stat-value text-warning">${k6.metrics.httpReqDuration.p95}ms</div>
          </div>
        </div>
        <div class="mt-4">
          <canvas id="k6Chart"></canvas>
        </div>
      </div>
    </div>

  </div>

  <!-- Charts -->
  <script>
    // Playwright Chart
    new Chart(document.getElementById('playwrightChart'), {
      type: 'doughnut',
      data: {
        labels: ['Passed', 'Failed', 'Skipped'],
        datasets: [{
          data: [${playwright.stats.passed}, ${playwright.stats.failed}, ${playwright.stats.skipped}],
          backgroundColor: ['#36d399', '#f87272', '#fbbd23'],
        }]
      },
      options: { plugins: { legend: { position: 'bottom' } } }
    });

    // k6 Chart
    new Chart(document.getElementById('k6Chart'), {
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
          backgroundColor: '#818cf8',
        }]
      },
      options: { plugins: { legend: { position: 'bottom' } } }
    });
  </script>

</body>
</html>`;
}
