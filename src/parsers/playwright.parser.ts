export interface PlaywrightTest {
  title: string;
  status: 'passed' | 'failed' | 'skipped' | 'timedOut';
  duration: number;
  error?: string;
}

export interface PlaywrightSuite {
  title: string;
  tests: PlaywrightTest[];
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

function extractTests(suites: PlaywrightSuite[]): PlaywrightTest[] {
  const tests: PlaywrightTest[] = [];

  for (const suite of suites) {
    if (suite.tests) {
      tests.push(...suite.tests);
    }
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
    failed: tests.filter(t => t.status === 'failed').length,
    skipped: tests.filter(t => t.status === 'skipped').length,
    duration: tests.reduce((acc, t) => acc + (t.duration || 0), 0),
  };

  return {
    type: 'playwright',
    stats,
    suites,
  };
}
