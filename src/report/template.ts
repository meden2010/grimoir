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
  <style>
    .chart-wrap { position: relative; height: 420px; }
    .chart-wrap canvas { max-height: 420px; }
  </style>
</head>
<body class="bg-base-300 min-h-screen p-8">

  <div class="max-w-7xl mx-auto">

    <!-- Header -->
    <div class="flex items-center gap-4 mb-8">
      <h1 class="text-5xl font-bold text-primary">📖 Grimoir</h1>
      <span class="text-base-content/50 text-lg">— ${new Date().toLocaleString()}</span>
    </div>

    <!-- Tabs -->
    <div role="tablist" class="tabs tabs-lifted tabs-lg mb-6">
      <input type="radio" name="report-tabs" role="tab" class="tab" aria-label="📊 Overview" checked="checked"/>
      <div role="tabpanel" class="tab-content bg-base-100 border-base-300 rounded-box p-8">

        <div class="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
          <div class="stat bg-base-200 rounded-box p-6">
            <div class="stat-title text-base">E2E Tests</div>
            <div class="stat-value text-4xl text-primary">${playwright.stats.total}</div>
            <div class="stat-desc text-base">${playwright.stats.passed} passed / ${playwright.stats.failed} failed / ${playwright.stats.skipped} skipped</div>
          </div>
          <div class="stat bg-base-200 rounded-box p-6">
            <div class="stat-title text-base">k6 Success</div>
            <div class="stat-value text-4xl text-success">${k6.stats.successRate}%</div>
            <div class="stat-desc text-base">${k6.stats.totalRequests} total requests</div>
          </div>
          <div class="stat bg-base-200 rounded-box p-6">
            <div class="stat-title text-base">E2E Duration</div>
            <div class="stat-value text-4xl text-info">${playwright.stats.duration}ms</div>
            <div class="stat-desc text-base">total execution time</div>
          </div>
          <div class="stat bg-base-200 rounded-box p-6">
            <div class="stat-title text-base">API P95</div>
            <div class="stat-value text-4xl text-warning">${k6.metrics.httpReqDuration.p95}ms</div>
            <div class="stat-desc text-base">response time</div>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div class="card bg-base-200">
            <div class="card-body p-8">
              <h3 class="text-lg font-medium opacity-70 mb-4">E2E Results Distribution</h3>
              <div class="chart-wrap"><canvas id="overviewPlaywrightChart"></canvas></div>
            </div>
          </div>
          <div class="card bg-base-200">
            <div class="card-body p-8">
              <h3 class="text-lg font-medium opacity-70 mb-4">Performance Response Times</h3>
              <div class="chart-wrap"><canvas id="overviewK6Chart"></canvas></div>
            </div>
          </div>
        </div>
      </div>

      <!-- E2E Tab -->
      <input type="radio" name="report-tabs" role="tab" class="tab" aria-label="🎭 E2E"/>
      <div role="tabpanel" class="tab-content bg-base-100 border-base-300 rounded-box p-8">

        <div class="stats stats-horizontal shadow w-full mb-8 flex-wrap">
          <div class="stat">
            <div class="stat-title text-base">Total</div>
            <div class="stat-value text-3xl">${playwright.stats.total}</div>
          </div>
          <div class="stat">
            <div class="stat-title text-base">Passed</div>
            <div class="stat-value text-3xl text-success">${playwright.stats.passed}</div>
          </div>
          <div class="stat">
            <div class="stat-title text-base">Failed</div>
            <div class="stat-value text-3xl text-error">${playwright.stats.failed}</div>
          </div>
          <div class="stat">
            <div class="stat-title text-base">Skipped</div>
            <div class="stat-value text-3xl text-warning">${playwright.stats.skipped}</div>
          </div>
          <div class="stat">
            <div class="stat-title text-base">Duration</div>
            <div class="stat-value text-3xl text-info">${playwright.stats.duration}ms</div>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div class="chart-wrap"><canvas id="e2eChart"></canvas></div>
          <div class="overflow-x-auto overflow-y-auto" style="max-height:420px">
            <table class="table table-zebra">
              <thead>
                <tr>
                  <th>Suite</th>
                  <th>Test</th>
                  <th>Status</th>
                  <th>Duration</th>
                </tr>
              </thead>
              <tbody>
                ${playwright.suites.map(suite => suite.tests.map(test => `
                <tr>
                  <td class="font-medium">${suite.title}</td>
                  <td>${test.title}</td>
                  <td>
                    <span class="badge ${test.status === 'passed' ? 'badge-success' : test.status === 'failed' ? 'badge-error' : 'badge-warning'}">
                      ${test.status}
                    </span>
                  </td>
                  <td>${test.duration}ms</td>
                </tr>`).join('')).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Performance Tab -->
      <input type="radio" name="report-tabs" role="tab" class="tab" aria-label="⚡ Performance"/>
      <div role="tabpanel" class="tab-content bg-base-100 border-base-300 rounded-box p-8">

        <div class="stats stats-horizontal shadow w-full mb-8 flex-wrap">
          <div class="stat">
            <div class="stat-title text-base">Requests</div>
            <div class="stat-value text-3xl">${k6.stats.totalRequests}</div>
          </div>
          <div class="stat">
            <div class="stat-title text-base">Success</div>
            <div class="stat-value text-3xl text-success">${k6.stats.successRate}%</div>
          </div>
          <div class="stat">
            <div class="stat-title text-base">Failed</div>
            <div class="stat-value text-3xl text-error">${k6.stats.failedRequests}</div>
          </div>
          <div class="stat">
            <div class="stat-title text-base">Avg</div>
            <div class="stat-value text-3xl text-info">${k6.stats.duration}ms</div>
          </div>
          <div class="stat">
            <div class="stat-title text-base">P95</div>
            <div class="stat-value text-3xl text-warning">${k6.metrics.httpReqDuration.p95}ms</div>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div class="chart-wrap"><canvas id="perfChart"></canvas></div>
          <div class="overflow-x-auto">
            <table class="table table-zebra">
              <thead>
                <tr>
                  <th>Metric</th>
                  <th>Value</th>
                </tr>
              </thead>
              <tbody>
                <tr><td>Requests</td><td>${k6.metrics.httpReqs}</td></tr>
                <tr><td>Failed Rate</td><td>${(k6.metrics.httpReqFailed * 100).toFixed(1)}%</td></tr>
                <tr><td>Avg Response</td><td>${k6.metrics.httpReqDuration.avg}ms</td></tr>
                <tr><td>Min Response</td><td>${k6.metrics.httpReqDuration.min}ms</td></tr>
                <tr><td>Max Response</td><td>${k6.metrics.httpReqDuration.max}ms</td></tr>
                <tr><td>P90</td><td>${k6.metrics.httpReqDuration.p90}ms</td></tr>
                <tr><td>P95</td><td>${k6.metrics.httpReqDuration.p95}ms</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

    </div>

  </div>

  <script>
    const chartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { position: 'bottom', labels: { boxWidth: 14, font: { size: 14 } } } }
    };

    // Overview charts
    new Chart(document.getElementById('overviewPlaywrightChart'), {
      type: 'doughnut',
      data: {
        labels: ['Passed', 'Failed', 'Skipped'],
        datasets: [{
          data: [${playwright.stats.passed}, ${playwright.stats.failed}, ${playwright.stats.skipped}],
          backgroundColor: ['#36d399', '#f87272', '#fbbd23'],
        }]
      },
      options: chartOptions
    });

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
          backgroundColor: '#818cf8',
        }]
      },
      options: chartOptions
    });

    // E2E chart
    new Chart(document.getElementById('e2eChart'), {
      type: 'doughnut',
      data: {
        labels: ['Passed', 'Failed', 'Skipped'],
        datasets: [{
          data: [${playwright.stats.passed}, ${playwright.stats.failed}, ${playwright.stats.skipped}],
          backgroundColor: ['#36d399', '#f87272', '#fbbd23'],
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
          backgroundColor: '#818cf8',
        }]
      },
      options: chartOptions
    });
  </script>

</body>
</html>`;
}
