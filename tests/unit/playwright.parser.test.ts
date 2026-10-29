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

  test('parsePlaywright should handle edge cases in extractTests (missing tests, empty results, legacy format, nested suites)', () => {
    const mockJson = {
      suites: [
        {
          title: 'Legacy Suite',
          tests: [
            { title: 'Legacy Test 1', status: 'passed', duration: 10 },
            { title: 'Legacy Test 2', status: 'failed', duration: 20 },
          ],
        },
        {
          title: 'Suite with missing tests in spec',
          specs: [
            {
              title: 'Spec without tests array',
              // no tests field
            }
          ]
        },
        {
          title: 'Suite with missing or empty results in test',
          specs: [
            {
              title: 'Spec with empty results',
              tests: [
                { results: [] }, // empty results
                { projectName: 'chromium' } // missing results completely
              ]
            }
          ]
        },
        {
          title: 'Nested Suites',
          suites: [
            {
              title: 'Inner Suite',
              suites: [
                {
                  title: 'Deep Inner Suite',
                  tests: [
                    { title: 'Deep Legacy Test', status: 'skipped', duration: 5 }
                  ]
                }
              ]
            }
          ]
        },
        {
          title: 'Test with multiple results (overall status logic)',
          specs: [
            {
              title: 'Retry test failing then passing',
              tests: [
                {
                  projectName: 'firefox',
                  results: [
                    { status: 'failed', duration: 10 },
                    { status: 'passed', duration: 15 } // lastResult is passed, but one failed earlier
                  ]
                }
              ]
            },
            {
              title: 'Retry test passing both times',
              tests: [
                {
                  projectName: 'firefox',
                  results: [
                    { status: 'passed', duration: 10 },
                    { status: 'passed', duration: 15 }
                  ]
                }
              ]
            }
          ]
        }
      ]
    };

    const result = parsePlaywright(mockJson);

    // Legacy tests: 2
    // Missing specs tests: 0
    // Empty results: 0
    // Deep nested legacy tests: 1
    // Multiple results: 2
    // Total extracted tests: 5
    expect(result.stats.total).toBe(5);

    // Passed: Legacy Test 1, Retry test passing both times -> 2
    expect(result.stats.passed).toBe(2);

    // Failed: Legacy Test 2, Retry test failing then passing (since one result is failed, overallStatus becomes failed) -> 2
    expect(result.stats.failed).toBe(2);

    // Skipped: Deep Legacy Test -> 1
    expect(result.stats.skipped).toBe(1);

    // Duration sum:
    // Legacy: 10 + 20
    // Deep nested: 5
    // Multiple results 1: 10 + 15 = 25
    // Multiple results 2: 10 + 15 = 25
    // Total duration: 10 + 20 + 5 + 25 + 25 = 85
    expect(result.stats.duration).toBe(85);
  });

  test('parsePlaywright should normalize serialized Buffer attachments to base64 strings', () => {
    const mockJson = {
      suites: [
        {
          title: 'Attachment Suite',
          specs: [
            {
              title: 'Test with serialized buffer attachment',
              tests: [
                {
                  projectName: 'chromium',
                  results: [
                    {
                      status: 'passed',
                      duration: 100,
                      errors: [],
                      attachments: [
                        {
                          name: 'screenshot.png',
                          contentType: 'image/png',
                          body: { type: 'Buffer', data: [137, 80, 78, 71, 13, 10, 26, 10] } // fake PNG signature
                        },
                        {
                          name: 'log.txt',
                          contentType: 'text/plain',
                          body: 'Already a string'
                        }
                      ]
                    }
                  ]
                }
              ]
            }
          ]
        }
      ]
    };

    const result = parsePlaywright(mockJson);
    const attachments = result.suites[0].specs![0].tests![0].results![0].attachments!;

    expect(attachments[0].body).toBe(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]).toString('base64'));
    expect(attachments[1].body).toBe('Already a string');
  });
});
