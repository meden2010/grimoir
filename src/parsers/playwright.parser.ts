export interface PlaywrightResult {
  status: 'passed' | 'failed' | 'skipped' | 'timedOut';
  duration: number;
  error?: { message?: string };
  errors: { message?: string }[];
}

export interface PlaywrightJsonTest {
  results: PlaywrightResult[];
}

export interface PlaywrightSpec {
  title: string;
  tests?: PlaywrightJsonTest[];
}

export interface PlaywrightTest {
  title: string;
  status: 'passed' | 'failed' | 'skipped' | 'timedOut';
  duration: number;
  error?: string;
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
    return status;
  }
  return 'failed';
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
          if (!test.results) continue;
          for (const result of test.results) {
            tests.push({
              title: spec.title,
              status: normalizeStatus(result.status),
              duration: result.duration || 0,
              error: result.error?.message || result.errors?.[0]?.message,
            });
          }
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
