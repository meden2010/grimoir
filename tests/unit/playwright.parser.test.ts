import { describe, test, expect } from 'bun:test';
import { parsePlaywright, normalizeStatus } from '../../src/parsers/playwright.parser';

describe('Playwright Parser', () => {
  test('normalizeStatus should map playwright statuses correctly', () => {
    expect(normalizeStatus('passed')).toBe('passed');
    expect(normalizeStatus('expected')).toBe('passed');
    expect(normalizeStatus('failed')).toBe('failed');
    expect(normalizeStatus('timedOut')).toBe('failed');
    expect(normalizeStatus('interrupted')).toBe('failed');
    expect(normalizeStatus('flaky')).toBe('failed');
    expect(normalizeStatus('skipped')).toBe('skipped');
  });

  test('parsePlaywright should extract suites and calculate stats accurately', () => {
    const mockJson = {
      suites: [
        {
          title: 'Authentication Suite',
          file: 'tests/auth.spec.ts',
          specs: [
            {
              title: 'Login with valid credentials',
              tests: [
                {
                  projectName: 'chromium',
                  results: [
                    {
                      status: 'passed',
                      duration: 120,
                      errors: [],
                      steps: [
                        { title: 'Open page', category: 'step', duration: 50, steps: [] },
                        { title: 'Submit form', category: 'step', duration: 70, steps: [] },
                      ],
                    },
                  ],
                },
              ],
            },
            {
              title: 'Login with invalid password fails',
              tests: [
                {
                  projectName: 'chromium',
                  results: [
                    {
                      status: 'failed',
                      duration: 250,
                      errors: [{ message: 'Expected status 401 but got 200' }],
                      steps: [],
                    },
                  ],
                },
              ],
            },
            {
              title: 'OAuth login (skipped)',
              tests: [
                {
                  projectName: 'chromium',
                  results: [
                    {
                      status: 'skipped',
                      duration: 0,
                      errors: [],
                      steps: [],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    };

    const result = parsePlaywright(mockJson);

    expect(result.type).toBe('playwright');
    expect(result.stats.total).toBe(3);
    expect(result.stats.passed).toBe(1);
    expect(result.stats.failed).toBe(1);
    expect(result.stats.skipped).toBe(1);
    expect(result.stats.duration).toBe(370);
    expect(result.suites.length).toBe(1);
    expect(result.suites[0].title).toBe('Authentication Suite');
  });

  test('parsePlaywright handles empty suites gracefully', () => {
    const result = parsePlaywright({});
    expect(result.stats.total).toBe(0);
    expect(result.stats.passed).toBe(0);
    expect(result.stats.failed).toBe(0);
    expect(result.stats.skipped).toBe(0);
    expect(result.stats.duration).toBe(0);
    expect(result.suites).toEqual([]);
  });
});
