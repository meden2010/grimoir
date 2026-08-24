import { Reporter, TestCase, TestResult, TestStep } from '@playwright/test/reporter';
import fs from 'fs';
import path from 'path';

export interface GrimoirTestStep {
  title: string;
  category: string;
  duration: number;
  startTime: string;
  error?: string;
  steps: GrimoirTestStep[];
}

export default class GrimoirReporter implements Reporter {
  private suites: any[] = [];
  private outputFile: string;

  constructor(options: { outputFile?: string } = {}) {
    this.outputFile = options.outputFile || 'test-results/playwright-results.json';
  }

  onBegin(config: any, suite: any) {
    this.suites = [];
  }

  private processStep(step: TestStep): GrimoirTestStep {
    const errorMsg = step.error ? (typeof step.error === 'string' ? step.error : step.error.message) : undefined;
    return {
      title: step.title,
      category: step.category,
      duration: step.duration,
      startTime: step.startTime.toISOString(),
      error: errorMsg,
      steps: step.steps.map(s => this.processStep(s))
    };
  }

  onTestEnd(test: TestCase, result: TestResult) {
    const suiteTitle = test.parent.title || 'Root';
    const projectTitle = test.parent.project()?.name || '';
    const suitePath = projectTitle ? `[${projectTitle}] ${suiteTitle}` : suiteTitle;

    let suite = this.suites.find(s => s.title === suitePath);
    if (!suite) {
      suite = {
        title: suitePath,
        file: test.location.file,
        line: test.location.line,
        column: test.location.column,
        specs: []
      };
      this.suites.push(suite);
    }

    let spec = suite.specs.find((s: any) => s.title === test.title);
    if (!spec) {
      spec = {
        title: test.title,
        id: test.id,
        ok: result.status === 'passed' || result.status === 'skipped',
        tags: test.tags || [],
        tests: [{
          timeout: test.timeout,
          annotations: test.annotations,
          expectedStatus: test.expectedStatus,
          projectId: test.parent.project()?.name || '',
          projectName: projectTitle,
          results: []
        }]
      };
      suite.specs.push(spec);
    }

    const testResultObj = {
      workerIndex: result.workerIndex,
      status: result.status,
      duration: result.duration,
      error: result.error,
      errors: result.errors,
      stdout: result.stdout,
      stderr: result.stderr,
      retry: result.retry,
      startTime: result.startTime.toISOString(),
      attachments: result.attachments,
      steps: result.steps.map(s => this.processStep(s))
    };

    spec.tests[0].results.push(testResultObj);
  }

  onEnd() {
    const outputDir = path.dirname(this.outputFile);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const report = {
      config: {},
      suites: this.suites,
      errors: []
    };

    fs.writeFileSync(this.outputFile, JSON.stringify(report, null, 2));
    console.log(`\n🔮 Grimoir Reporter: Results written to ${this.outputFile}`);
  }
}
