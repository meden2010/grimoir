import { describe, test, expect, beforeEach, mock } from 'bun:test';
import GrimoirReporter from '../../src/reporter/index';

describe('GrimoirReporter', () => {
  let reporter: GrimoirReporter;
  let mockFs: any;

  beforeEach(() => {
    reporter = new GrimoirReporter();
  });

  test('onBegin should reset suites array', () => {
    // We can simulate an existing suite by calling onTestEnd first
    // Then call onBegin and ensure suites are reset
    // Let's directly test the behavior using a mock test and result
    const mockTest: any = {
      title: 'test1',
      id: 'id-1',
      location: { file: 'file.ts', line: 1, column: 1 },
      parent: {
        title: 'Suite 1',
        project: () => ({ name: 'Project 1' })
      }
    };

    const mockResult: any = {
      status: 'passed',
      duration: 100,
      startTime: new Date('2025-01-01T00:00:00.000Z'),
      steps: []
    };

    reporter.onTestEnd(mockTest, mockResult);

    // Access private property or verify behavior somehow?
    // We can check if calling onEnd writes the suites
    // Or we can just call onBegin and trust it resets by calling onEnd after.

    reporter.onBegin({}, {});

    // Let's check suites via generating output
    const output = (reporter as any).suites;
    expect(output).toEqual([]);
  });

  test('processStep should handle recursive steps and extract messages', () => {
    const mockStep: any = {
      title: 'Step 1',
      category: 'test',
      duration: 50,
      startTime: new Date('2025-01-01T00:00:00.000Z'),
      error: new Error('Step error message'),
      steps: [
        {
          title: 'Sub Step',
          category: 'test',
          duration: 10,
          startTime: new Date('2025-01-01T00:00:01.000Z'),
          error: 'String error',
          steps: []
        }
      ]
    };

    const result = (reporter as any).processStep(mockStep);

    expect(result.title).toBe('Step 1');
    expect(result.duration).toBe(50);
    expect(result.error).toBe('Step error message');
    expect(result.steps.length).toBe(1);
    expect(result.steps[0].title).toBe('Sub Step');
    expect(result.steps[0].duration).toBe(10);
    expect(result.steps[0].error).toBe('String error');
  });

  test('onTestEnd should group suites with and without project name', () => {
    const mockTestWithProject: any = {
      title: 'Test With Project',
      id: 'id-2',
      location: { file: 'test2.ts', line: 2, column: 2 },
      parent: {
        title: 'My Suite',
        project: () => ({ name: 'My Project' })
      }
    };

    const mockTestWithoutProject: any = {
      title: 'Test Without Project',
      id: 'id-3',
      location: { file: 'test3.ts', line: 3, column: 3 },
      parent: {
        title: 'Root Suite',
        project: () => undefined
      }
    };

    const mockResultPassed: any = {
      status: 'passed',
      duration: 150,
      startTime: new Date('2025-01-01T00:00:00.000Z'),
      steps: []
    };

    const mockResultFailed: any = {
      status: 'failed',
      duration: 200,
      startTime: new Date('2025-01-01T00:00:00.000Z'),
      steps: []
    };

    reporter.onTestEnd(mockTestWithProject, mockResultPassed);
    reporter.onTestEnd(mockTestWithoutProject, mockResultFailed);

    const suites = (reporter as any).suites;

    expect(suites.length).toBe(2);

    expect(suites[0].title).toBe('[My Project] My Suite');
    expect(suites[0].file).toBe('test2.ts');
    expect(suites[0].line).toBe(2);
    expect(suites[0].column).toBe(2);
    expect(suites[0].specs.length).toBe(1);
    expect(suites[0].specs[0].ok).toBe(true);
    expect(suites[0].specs[0].tests[0].projectName).toBe('My Project');
    expect(suites[0].specs[0].tests[0].results[0].status).toBe('passed');

    expect(suites[1].title).toBe('Root Suite');
    expect(suites[1].file).toBe('test3.ts');
    expect(suites[1].line).toBe(3);
    expect(suites[1].column).toBe(3);
    expect(suites[1].specs.length).toBe(1);
    expect(suites[1].specs[0].ok).toBe(false);
    expect(suites[1].specs[0].tests[0].projectName).toBe('');
    expect(suites[1].specs[0].tests[0].results[0].status).toBe('failed');
  });

  test('onTestEnd should track skipped status correctly', () => {
    const mockTestSkipped: any = {
      title: 'Test Skipped',
      id: 'id-4',
      location: { file: 'test4.ts', line: 4, column: 4 },
      parent: {
        title: 'Skipped Suite',
        project: () => ({ name: 'Skipped Project' })
      }
    };

    const mockResultSkipped: any = {
      status: 'skipped',
      duration: 0,
      startTime: new Date('2025-01-01T00:00:00.000Z'),
      steps: []
    };

    reporter.onTestEnd(mockTestSkipped, mockResultSkipped);

    const suites = (reporter as any).suites;
    const skippedSuite = suites.find((s: any) => s.title === '[Skipped Project] Skipped Suite');
    expect(skippedSuite).toBeDefined();
    expect(skippedSuite.specs[0].ok).toBe(true); // passed or skipped is ok
    expect(skippedSuite.specs[0].tests[0].results[0].status).toBe('skipped');
  });
});