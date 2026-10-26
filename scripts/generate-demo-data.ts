import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

const FIXTURES_DIR = join(process.cwd(), 'tests', 'fixtures', 'demo-output');

const mockPlaywright = {
  config: {
    rootDir: '/app',
    projects: [{ name: 'chromium' }, { name: 'firefox' }],
  },
  suites: [
    {
      title: 'Auth & Onboarding Rituals',
      file: 'tests/e2e/auth.spec.ts',
      specs: [
        {
          title: 'Acolyte should sign in with valid credentials',
          ok: true,
          tests: [
            {
              status: 'expected',
              results: [
                {
                  status: 'passed',
                  duration: 1240,
                  retry: 0,
                },
              ],
            },
          ],
        },
        {
          title: 'Forbidden glyph should reject invalid secret',
          ok: true,
          tests: [
            {
              status: 'expected',
              results: [
                {
                  status: 'passed',
                  duration: 890,
                  retry: 0,
                },
              ],
            },
          ],
        },
        {
          title: 'Session expiration must invalidate arcane token',
          ok: false,
          tests: [
            {
              status: 'unexpected',
              results: [
                {
                  status: 'failed',
                  duration: 4210,
                  retry: 1,
                  error: {
                    message: 'Error: expect(received).toBe(expected)\n\nExpected: "revoked"\nReceived: "active"',
                    location: {
                      file: 'tests/e2e/auth.spec.ts',
                      line: 88,
                      column: 14,
                    },
                    snippet: '  86 |   await page.waitForTimeout(5000);\n  87 |   const state = await getSessionState(token);\n> 88 |   expect(state).toBe("revoked");\n     |                 ^',
                  },
                },
              ],
            },
          ],
        },
        {
          title: 'Network jitter retry recovery',
          ok: true,
          tests: [
            {
              status: 'flaky',
              results: [
                {
                  status: 'failed',
                  duration: 2100,
                  retry: 0,
                  error: { message: 'Timeout 2000ms exceeded while waiting for selector' },
                },
                {
                  status: 'passed',
                  duration: 1540,
                  retry: 1,
                },
              ],
            },
          ],
        },
      ],
    },
    {
      title: 'Grimoire Spellbook Catalog',
      file: 'tests/e2e/catalog.spec.ts',
      specs: [
        {
          title: 'Filter spells by elemental school',
          ok: true,
          tests: [
            {
              status: 'expected',
              results: [
                {
                  status: 'passed',
                  duration: 1420,
                  retry: 0,
                },
              ],
            },
          ],
        },
        {
          title: 'Render animated parchment scrolls',
          ok: true,
          tests: [
            {
              status: 'expected',
              results: [
                {
                  status: 'passed',
                  duration: 1980,
                  retry: 0,
                },
              ],
            },
          ],
        },
      ],
    },
  ],
};

const mockK6 = {
  duration: 45000,
  metrics: {
    http_req_duration: {
      type: 'trend',
      contains: 'time',
      values: {
        avg: 168.4,
        min: 42.1,
        max: 980.2,
        'p(90)': 245.8,
        'p(95)': 380.6,
      },
      thresholds: {
        'p(95)<400': {
          ok: true,
        },
      },
    },
    http_req_failed: {
      type: 'rate',
      values: {
        rate: 0.024,
        passes: 341,
        fails: 13859,
      },
      thresholds: {
        'rate<0.05': {
          ok: true,
        },
      },
    },
    http_reqs: {
      type: 'counter',
      values: {
        count: 14200,
        rate: 315.5,
      },
    },
    vus: {
      type: 'gauge',
      values: {
        value: 120,
        max: 200,
      },
    },
    iterations: {
      type: 'counter',
      values: {
        count: 14200,
      },
    },
  },
  scenarios: {
    sanctuary_portal_baseline: {
      vus: 50,
      iterations: 5000,
      status: 'passed',
    },
    high_council_stress_test: {
      vus: 120,
      iterations: 8000,
      status: 'passed',
    },
    unstable_leyline_burst: {
      vus: 200,
      iterations: 1200,
      status: 'failed',
    },
  },
};

function generate(): void {
  mkdirSync(FIXTURES_DIR, { recursive: true });

  const pwPath = join(FIXTURES_DIR, 'playwright-results.json');
  const k6Path = join(FIXTURES_DIR, 'k6-results.json');

  writeFileSync(pwPath, JSON.stringify(mockPlaywright, null, 2), 'utf-8');
  writeFileSync(k6Path, JSON.stringify(mockK6, null, 2), 'utf-8');

  console.log(`✨ Generated demo fixtures successfully at ${FIXTURES_DIR}:`);
  console.log(`   - ${pwPath}`);
  console.log(`   - ${k6Path}`);
}

generate();
