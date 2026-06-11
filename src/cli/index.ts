#!/usr/bin/env node

import { Command } from 'commander';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { parsePlaywright } from '../parsers/playwright.parser';
import { parseK6 } from '../parsers/k6.parser';
import { generateHTML } from '../report/template';

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

    // Read and parse Playwright results
    const playwrightPath = join(options.input, 'playwright-results.json');
    const playwrightRaw = JSON.parse(readFileSync(playwrightPath, 'utf-8'));
    const playwrightReport = parsePlaywright(playwrightRaw);

    // Read and parse k6 results
    const k6Path = join(options.input, 'k6-results.json');
    const k6Raw = JSON.parse(readFileSync(k6Path, 'utf-8'));
    const k6Report = parseK6(k6Raw);

    // Generate HTML report
    const html = generateHTML(playwrightReport, k6Report);

    // Write output
    mkdirSync(options.output, { recursive: true });
    const outputPath = join(options.output, 'grimoir-report.html');
    writeFileSync(outputPath, html, 'utf-8');

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

    console.log(`\n🔮 Report generated at: ${outputPath}`);
  });

program.parse();
