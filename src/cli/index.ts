#!/usr/bin/env node

import { Command } from 'commander';
import { readFileSync, writeFileSync, mkdirSync, watch } from 'fs';
import { join } from 'path';
import { createServer, IncomingMessage, ServerResponse } from 'http';
import { parsePlaywright } from '../parsers/playwright.parser';
import { parseK6 } from '../parsers/k6.parser';
import { generateHTML } from '../report/template';

const program = new Command();

function buildReport(inputPath: string, outputPath: string): string {
  const playwrightPath = join(inputPath, 'playwright-results.json');
  const playwrightRaw = JSON.parse(readFileSync(playwrightPath, 'utf-8'));
  const playwrightReport = parsePlaywright(playwrightRaw);

  const k6Path = join(inputPath, 'k6-results.json');
  const k6Raw = JSON.parse(readFileSync(k6Path, 'utf-8'));
  const k6Report = parseK6(k6Raw);

  const html = generateHTML(playwrightReport, k6Report);

  mkdirSync(outputPath, { recursive: true });
  writeFileSync(join(outputPath, 'grimoir-report.html'), html, 'utf-8');

  console.log(`\n✅ Playwright Results:`);
  console.log(`   Total:   ${playwrightReport.stats.total}`);
  console.log(`   Passed:  ${playwrightReport.stats.passed}`);
  console.log(`   Failed:  ${playwrightReport.stats.failed}`);
  console.log(`   Skipped: ${playwrightReport.stats.skipped}`);
  console.log(`   Duration: ${playwrightReport.stats.duration}ms`);

  console.log(`\n✅ k6 Results:`);
  console.log(`   Requests:      ${k6Report.stats.totalRequests}`);
  console.log(`   Failed:        ${k6Report.stats.failedRequests}`);
  console.log(`   Success Rate:  ${k6Report.stats.successRate}%`);
  console.log(`   Avg Duration:  ${k6Report.stats.duration}ms`);
  console.log(`   P95:           ${k6Report.metrics.httpReqDuration.p95}ms`);

  return html;
}

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
  .option('--no-serve', 'Do not start the report server')
  .option('-w, --watch', 'Watch input folder and regenerate on changes')
  .action((options) => {
    console.log(`📖 Grimoir - Generating report...`);

    buildReport(options.input, options.output);

    console.log(`\n🔮 Report saved at: ${join(options.output, 'grimoir-report.html')}`);

    // Start local server
    if (options.serve) {
      const port = parseInt(options.port, 10);
      const reportFile = join(options.output, 'grimoir-report.html');

      const requestHandler = (_req: IncomingMessage, res: ServerResponse) => {
        try {
          const content = readFileSync(reportFile, 'utf-8');
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

          watch(options.input, (_event, filename) => {
            if (filename && filename.endsWith('.json')) {
              try {
                console.log(`\n🔄 Change detected in ${filename} — regenerating...`);
                buildReport(options.input, options.output);
              } catch {
                console.log(`   ⚠️  Error regenerating, waiting for next change...`);
              }
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
  .action((options) => {
    const html = readFileSync(options.file, 'utf-8');
    const port = parseInt(options.port, 10);

    const server = createServer((_req, res) => {
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

program.parse();
