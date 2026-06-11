#!/usr/bin/env node

import { Command } from 'commander';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { parsePlaywright } from '../parsers/playwright.parser';
import { parseK6 } from '../parsers/k6.parser';

const program = new Command();

program
  .name('grimoir')
  .description('Unified test report tool that consolidates different types of test results into a single visual report')
  .version('0.1.0');

program
  .command('generate')
  .description('Generate a unified test report')
  .requiredOption('-i, --input <path>', 'Path to the folder containing test results')
  .requiredOption('-o, --output <path>', 'Path where the report will be generated')
  .action((options) => {
    console.log(`📖 Grimoir - Generating report...`);

    // Read Playwright results
    const playwrightPath = join(options.input, 'playwright-results.json');
    if (existsSync(playwrightPath)) {
      const raw = JSON.parse(readFileSync(playwrightPath, 'utf-8'));
      const playwrightReport = parsePlaywright(raw);

      console.log(`\n✅ Playwright Results:`);
      console.log(`   Total:   ${playwrightReport.stats.total}`);
      console.log(`   Passed:  ${playwrightReport.stats.passed}`);
      console.log(`   Failed:  ${playwrightReport.stats.failed}`);
      console.log(`   Skipped: ${playwrightReport.stats.skipped}`);
      console.log(`   Duration: ${playwrightReport.stats.duration}ms`);
    }

    // Read k6 results
    const k6Path = join(options.input, 'k6-results.json');
    if (existsSync(k6Path)) {
      const raw = JSON.parse(readFileSync(k6Path, 'utf-8'));
      const k6Report = parseK6(raw);

      console.log(`\n✅ k6 Results:`);
      console.log(`   Requests:      ${k6Report.stats.totalRequests}`);
      console.log(`   Failed:        ${k6Report.stats.failedRequests}`);
      console.log(`   Success Rate:  ${k6Report.stats.successRate}%`);
      console.log(`   Avg Duration:  ${k6Report.metrics.httpReqDuration.avg}ms`);
      console.log(`   P95:           ${k6Report.metrics.httpReqDuration.p95}ms`);
    }
  });

program.parse();
