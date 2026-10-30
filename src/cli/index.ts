#!/usr/bin/env node

import { Command } from 'commander';
import { readFileSync, writeFileSync, mkdirSync, watch, existsSync, copyFileSync, rmSync, promises as fsPromises } from 'fs';
import { join, basename } from 'path';
import { createServer, IncomingMessage, ServerResponse } from 'http';
import { parsePlaywright, PlaywrightReport, PlaywrightSuite, PlaywrightResult } from '../parsers/playwright.parser';
import { parseK6, K6Report } from '../parsers/k6.parser';
import { generateHTML } from '../report/template';
import { truncateString } from '../utils/string.util';

export interface HistoricalRun {
  date: string;
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  duration: number;
}

const resolveTestStatus = (isFailed: boolean, lastResultStatus: string): 'passed' | 'failed' | 'skipped' => {
  if (isFailed) return 'failed';
  if (['passed', 'expected', 'flaky'].includes(lastResultStatus)) return 'passed';
  return 'skipped';
};

export interface TestHistoryItem {
  date: string;
  status: 'passed' | 'failed' | 'skipped';
  duration: number;
  error?: string;
}

export interface GrimoirHistoryData {
  runs: HistoricalRun[];
  tests: Record<string, TestHistoryItem[]>;
}

interface GenerateOptions {
  input: string;
  output: string;
  port: string;
  serve: boolean;
  watch: boolean;
  clean?: boolean;
}

interface CleanOptions {
  output: string;
}

interface ServeOptions {
  file: string;
  port: string;
}

const program = new Command();

export const cleanOutput = (outputPath: string): void => {
  const historyPath = join(outputPath, '.grimoir-history.json');
  if (existsSync(historyPath)) {
    rmSync(historyPath, { force: true });
  }
  const dataDir = join(outputPath, 'data');
  if (existsSync(dataDir)) {
    rmSync(dataDir, { recursive: true, force: true });
  }
};

const buildReport = async (inputPath: string, outputPath: string, clean: boolean = false): Promise<string> => {
  if (clean) {
    cleanOutput(outputPath);
  }

  const playwrightPath: string = join(inputPath, 'playwright-results.json');
  const playwrightRaw: Record<string, unknown> = JSON.parse(readFileSync(playwrightPath, 'utf-8')) as Record<string, unknown>;

  const dataDir = join(outputPath, 'data');
  if (!existsSync(dataDir)) {
    mkdirSync(dataDir, { recursive: true });
  }

  const processAttachments = (suites: PlaywrightSuite[]) => {
    for (const suite of suites) {
      const attachments = (suite.specs || [])
        .flatMap((spec: any) => spec.tests || [])
        .flatMap((test: any) => test.results || [])
        .flatMap((result: any) => result.attachments || []);

      for (const attachment of attachments) {
        if (attachment.path && existsSync(attachment.path)) {
          const fileName = `${Date.now()}-${basename(attachment.path)}`;
          const destPath = join(dataDir, fileName);
          copyFileSync(attachment.path, destPath);
          attachment.path = `./data/${fileName}`;
        }
      }

      if (suite.suites) {
        processAttachments(suite.suites);
      }
    }
  };
  processAttachments((playwrightRaw['suites'] as PlaywrightSuite[]) || []);

  const playwrightReport: PlaywrightReport = parsePlaywright(playwrightRaw);

  const k6Path: string = join(inputPath, 'k6-results.json');
  let k6Report: K6Report | null = null;
  if (existsSync(k6Path)) {
    const k6Raw: Record<string, unknown> = JSON.parse(readFileSync(k6Path, 'utf-8')) as Record<string, unknown>;
    k6Report = parseK6(k6Raw);
  }

  // --- History Management ---
  mkdirSync(outputPath, { recursive: true });
  const historyPath = join(outputPath, '.grimoir-history.json');
  let historyData: GrimoirHistoryData = { runs: [], tests: {} };
  
  if (existsSync(historyPath)) {
    try {
      // ⚡ Bolt: Use async reading to avoid blocking event loop on large histories
      const parsed = JSON.parse(await fsPromises.readFile(historyPath, 'utf-8'));
      if (Array.isArray(parsed)) {
        historyData = { runs: parsed, tests: {} };
      } else if (parsed && typeof parsed === 'object') {
        historyData = {
          runs: Array.isArray(parsed.runs) ? parsed.runs : [],
          tests: parsed.tests && typeof parsed.tests === 'object' ? parsed.tests : {}
        };
      }
    } catch {
      // Ignore parse errors, start fresh
    }
  }

  const currentRun: HistoricalRun = {
    date: new Date().toISOString(),
    total: playwrightReport.stats.total,
    passed: playwrightReport.stats.passed,
    failed: playwrightReport.stats.failed,
    skipped: playwrightReport.stats.skipped,
    duration: playwrightReport.stats.duration,
  };

  historyData.runs.push(currentRun);
  if (historyData.runs.length > 20) {
    historyData.runs = historyData.runs.slice(historyData.runs.length - 20);
  }

  // Record individual test histories
  const recordTestHistory = (suites: PlaywrightSuite[], parentPath: string = '') => {
    for (const suite of suites) {
      const suitePath = parentPath ? `${parentPath} > ${suite.title}` : suite.title;
      for (const spec of suite.specs || []) {
        for (const test of spec.tests || []) {
          if (!test.results || test.results.length === 0) continue;

          const results = test.results;
          const lastResult = results[results.length - 1];
          const isFailed = results.some((r: PlaywrightResult) => ['failed', 'timedout', 'interrupted'].includes((r.status || '').toLowerCase()));
          const testStatus = resolveTestStatus(isFailed, lastResult.status);

          const duration = results.reduce((acc: number, r: PlaywrightResult) => acc + (r.duration || 0), 0);
          const rawError = lastResult.error?.message || lastResult.errors?.[0]?.message || (typeof lastResult.error === 'string' ? lastResult.error : undefined);
          const errorSnippet = truncateString(rawError, 200);

          const testKey = `${suitePath} > ${spec.title}`;

          if (!historyData.tests[testKey]) {
            historyData.tests[testKey] = [];
          }

          historyData.tests[testKey].push({
            date: currentRun.date,
            status: testStatus,
            duration,
            error: errorSnippet
          });

          if (historyData.tests[testKey].length > 20) {
            historyData.tests[testKey] = historyData.tests[testKey].slice(historyData.tests[testKey].length - 20);
          }
        }
      }
      if (suite.suites) {
        recordTestHistory(suite.suites, suitePath);
      }
    }
  };

  recordTestHistory((playwrightRaw['suites'] as PlaywrightSuite[]) || []);

  // ⚡ Bolt: Use async writing to avoid blocking event loop when saving large history
  await fsPromises.writeFile(historyPath, JSON.stringify(historyData, null, 2), 'utf-8');

  const html: string = generateHTML(playwrightReport, k6Report, historyData);
  const tempHtmlPath = join(outputPath, `index.html.tmp.${Date.now()}`);
  await fsPromises.writeFile(tempHtmlPath, html, 'utf-8');
  await fsPromises.rename(tempHtmlPath, join(outputPath, 'index.html'));

  console.log(`\n✅ Playwright Results:`);
  console.log(`   Total:   ${playwrightReport.stats.total}`);
  console.log(`   Passed:  ${playwrightReport.stats.passed}`);
  console.log(`   Failed:  ${playwrightReport.stats.failed}`);
  console.log(`   Skipped: ${playwrightReport.stats.skipped}`);
  console.log(`   Duration: ${playwrightReport.stats.duration}ms`);

  if (k6Report) {
    console.log(`\n🔮 k6 Performance (v1):`);
    console.log(`   P95 Latency:   ${k6Report.metrics.p95LatencyMs !== null ? `${k6Report.metrics.p95LatencyMs}ms` : 'N/A'}`);
    console.log(`   Error Rate:    ${k6Report.metrics.errorRatePercent !== null ? `${k6Report.metrics.errorRatePercent}%` : 'N/A'}`);
    console.log(`   Throughput:    ${k6Report.metrics.throughputRps !== null ? `${k6Report.metrics.throughputRps} req/s` : 'N/A'}`);
    console.log(`   Thresholds:    ${k6Report.thresholds.status.toUpperCase()} (${k6Report.thresholds.passed}/${k6Report.thresholds.total})`);
    if (k6Report.warnings.length > 0) {
      console.log(`   ⚠️ Warnings:   ${k6Report.warnings.join(' | ')}`);
    }
  }

  return html;
};

program
  .name('grimoir')
  .description('Unified test report tool that consolidates different types of test results into a single visual report')
  .version('0.1.0');

program
  .command('generate')
  .description('Generate a unified test report')
  .requiredOption('-i, --input <path>', 'Path to the folder containing test results')
  .requiredOption('-o, --output <path>', 'Path where the report will be generated')
  .option('-p, --port <number>', 'Port to serve the report', '8080')
  .option('-c, --clean', 'Clean previous execution history before generating report')
  .option('--no-serve', 'Do not start the report server')
  .option('-w, --watch', 'Watch input folder and regenerate on changes')
  .action(async (options: GenerateOptions): Promise<void> => {
    console.log(`📖 Grimoir - Generating report...`);

    await buildReport(options.input, options.output, !!options.clean);

    console.log(`\n🔮 Report saved at: ${join(options.output, 'index.html')}`);

    // Start local server
    if (options.serve) {
      const port: number = parseInt(options.port, 10);
      const reportFile: string = join(options.output, 'index.html');

      const requestHandler = (_req: IncomingMessage, res: ServerResponse): void => {
        try {
          const content: string = readFileSync(reportFile, 'utf-8');
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end(content);
        } catch {
          res.writeHead(500);
          res.end('Report not found');
        }
      };

      const server = createServer(requestHandler);

      server.listen(port, () => {
        const url = `http://localhost:${port}`;
        console.log(`\n🌐 Report served at: ${url}`);

        if (options.watch) {
          console.log(`   👀 Watching: ${options.input}/`);
          console.log(`   Press Ctrl+C to stop\n`);

          let isBuilding = false;
          let pendingRebuild = false;

          const triggerRebuild = async (): Promise<void> => {
            if (isBuilding) {
              pendingRebuild = true;
              return;
            }
            isBuilding = true;
            try {
              await buildReport(options.input, options.output);
            } catch {
              console.log(`   ⚠️  Error regenerating, waiting for next change...`);
            } finally {
              isBuilding = false;
              if (pendingRebuild) {
                pendingRebuild = false;
                await triggerRebuild();
              }
            }
          };

          watch(options.input, async (_event: string, filename: string | null): Promise<void> => {
            if (filename && filename.endsWith('.json')) {
              console.log(`\n🔄 Change detected in ${filename} — regenerating...`);
              await triggerRebuild();
            }
          });
        } else {
          console.log(`   Press Ctrl+C to stop the server\n`);
        }
      });
    }
  });

program
  .command('serve')
  .description('Serve an existing report')
  .requiredOption('-f, --file <path>', 'Path to the report HTML file')
  .option('-p, --port <number>', 'Port to serve the report', '8080')
  .action((options: ServeOptions): void => {
    const html: string = readFileSync(options.file, 'utf-8');
    const port: number = parseInt(options.port, 10);

    const server = createServer((_req: IncomingMessage, res: ServerResponse): void => {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(html);
    });

    server.listen(port, () => {
      const url = `http://localhost:${port}`;
      console.log(`🌐 Serving report from: ${options.file}`);
      console.log(`   Report available at: ${url}`);
      console.log(`   Press Ctrl+C to stop the server\n`);
    });
  });

program
  .command('clean')
  .description('Clean previous report and execution history')
  .requiredOption('-o, --output <path>', 'Path to the report output folder to clean')
  .action((options: CleanOptions): void => {
    console.log(`🧹 Grimoir - Cleaning report history and output...`);
    cleanOutput(options.output);
    const indexPath = join(options.output, 'index.html');
    if (existsSync(indexPath)) {
      rmSync(indexPath, { force: true });
    }
    console.log(`✨ Output folder ${options.output} cleaned successfully.`);
  });

if (require.main === module) {
  program.parseAsync().catch((err: unknown) => {
    console.error('Execution error:', err);
    process.exit(1);
  });
}
