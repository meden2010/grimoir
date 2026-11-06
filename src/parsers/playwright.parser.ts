export interface PlaywrightAttachment {
  name: string;
  contentType: string;
  path?: string;
  body?: string;
}

export interface PlaywrightErrorDetails {
  message?: string;
  stack?: string;
  location?: {
    file: string;
    column: number;
    line: number;
  };
  snippet?: string;
}

export interface PlaywrightResult {
  status: 'passed' | 'failed' | 'skipped' | 'timedOut' | 'interrupted';
  duration: number;
  error?: PlaywrightErrorDetails;
  errors: PlaywrightErrorDetails[];
  steps?: PlaywrightTestStep[];
  attachments?: PlaywrightAttachment[];
}

export interface PlaywrightJsonTest {
  projectName?: string;
  expectedStatus?: string;
  status?: string;
  results: PlaywrightResult[];
}

export interface PlaywrightSpec {
  title: string;
  ok?: boolean;
  tests?: PlaywrightJsonTest[];
}

export interface PlaywrightTestStep {
  title: string;
  category?: string;
  duration: number;
  startTime?: string;
  error?: string;
  steps?: PlaywrightTestStep[];
}

export interface PlaywrightTest {
  title: string;
  status: 'passed' | 'failed' | 'skipped';
  duration: number;
  error?: PlaywrightErrorDetails | string;
  steps?: PlaywrightTestStep[];
  attachments?: PlaywrightAttachment[];
  projectName?: string;
  results?: PlaywrightResult[];
}

export interface PlaywrightSuite {
  title: string;
  file?: string;
  specs?: PlaywrightSpec[];
  tests?: PlaywrightTest[];
  suites?: PlaywrightSuite[];
}

export interface PlaywrightReport {
  type: 'playwright';
  stats: {
    total: number;
    passed: number;
    failed: number;
    skipped: number;
    duration: number;
  };
  suites: PlaywrightSuite[];
}

export function normalizeStatus(status: string): PlaywrightTest['status'] {
  if (['passed', 'expected'].includes(status)) {
    return 'passed';
  }
  if (['failed', 'timedOut', 'interrupted', 'unexpected', 'flaky'].includes(status)) {
    return 'failed';
  }
  return 'skipped';
}

function extractTests(suites: PlaywrightSuite[]): PlaywrightTest[] {
  const tests: PlaywrightTest[] = [];

  for (const suite of suites) {
    // Legacy direct tests format
    if (suite.tests) {
      tests.push(...suite.tests);
    }

    // Playwright JSON reporter format: suite -> specs -> tests -> results
    if (suite.specs) {
      for (const spec of suite.specs) {
        if (!spec.tests) continue;
        for (const test of spec.tests) {
          if (!test.results || test.results.length === 0) continue;
          
          const results = test.results;

          // ⚡ Bolt Optimization:
          // Merged attachment normalization, status resolution, and duration calculation into a single loop.
          // Reduces CPU overhead by turning an O(3N) pass into an O(N) pass per test results array.
          let hasFailure = false;
          let totalDuration = 0;

          for (const result of results) {
            // Duration calculation
            totalDuration += (result.duration || 0);

            // Status resolution
            if (['failed', 'timedOut', 'interrupted'].includes(result.status)) {
              hasFailure = true;
            }

            // Normalize attachment bodies if they are serialized Buffers
            if (result.attachments) {
              for (const att of result.attachments) {
                if (
                  att.body &&
                  typeof att.body === 'object' &&
                  (att.body as any).type === 'Buffer' &&
                  Array.isArray((att.body as any).data)
                ) {
                  att.body = Buffer.from((att.body as any).data).toString('base64');
                }
              }
            }
          }

          const lastResult = results[results.length - 1];
          
          const overallStatus = hasFailure
            ? 'failed'
            : normalizeStatus(lastResult.status);

          tests.push({
            title: spec.title,
            status: overallStatus,
            duration: totalDuration,
            error: lastResult.error || lastResult.errors?.[0],
            steps: lastResult.steps,
            attachments: lastResult.attachments || [],
            projectName: test.projectName || '',
            results: results
          });
        }
      }
    }

    // Nested suites
    if (suite.suites) {
      tests.push(...extractTests(suite.suites));
    }
  }

  return tests;
}

export function parsePlaywright(rawJson: Record<string, unknown>): PlaywrightReport {
  const suites = (rawJson['suites'] as PlaywrightSuite[]) || [];
  const tests = extractTests(suites);

  const stats = {
    total: tests.length,
    passed: 0,
    failed: 0,
    skipped: 0,
    duration: 0,
  };

  // ⚡ Bolt Optimization:
  // Merged 3 `.filter()` passes and 1 `.reduce()` pass into a single loop.
  // Reduces CPU overhead and eliminates multiple intermediate array allocations.
  // Expected savings: O(N) instead of O(4N) iterations over the tests array.
  for (const t of tests) {
    if (t.status === 'passed') stats.passed++;
    else if (t.status === 'failed') stats.failed++;
    else if (t.status === 'skipped') stats.skipped++;
    stats.duration += (t.duration || 0);
  }

  return {
    type: 'playwright',
    stats,
    suites,
  };
}
