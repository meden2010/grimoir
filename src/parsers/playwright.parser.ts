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
  steps?: any[];
  attachments?: any[];
}

export interface PlaywrightJsonTest {
  projectName?: string;
  expectedStatus?: string;
  results: PlaywrightResult[];
}

export interface PlaywrightSpec {
  title: string;
  tests?: PlaywrightJsonTest[];
}

export interface PlaywrightTestStep {
  title: string;
  category: string;
  duration: number;
  startTime?: string;
  error?: string;
  steps?: PlaywrightTestStep[];
}

export interface PlaywrightTest {
  title: string;
  status: 'passed' | 'failed' | 'skipped' | 'timedOut';
  duration: number;
  error?: PlaywrightErrorDetails | string;
  steps?: PlaywrightTestStep[];
  attachments?: any[];
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
  if (status === 'passed' || status === 'failed' || status === 'skipped' || status === 'timedOut') {
    return status as PlaywrightTest['status'];
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
          const lastResult = results[results.length - 1];
          const overallStatus = normalizeStatus(lastResult.status);

          tests.push({
            title: spec.title,
            status: overallStatus,
            duration: results.reduce((acc, r) => acc + (r.duration || 0), 0),
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
    passed: tests.filter(t => t.status === 'passed').length,
    failed: tests.filter(t => t.status === 'failed' || t.status === 'timedOut').length,
    skipped: tests.filter(t => t.status === 'skipped').length,
    duration: tests.reduce((acc, t) => acc + (t.duration || 0), 0),
  };

  return {
    type: 'playwright',
    stats,
    suites,
  };
}
