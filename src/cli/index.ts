#!/usr/bin/env node

import { Command } from 'commander';
import { readFileSync } from 'fs';
import { join } from 'path';
import { parsePlaywright } from '../parsers/playwright.parser';

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
    const raw = JSON.parse(readFileSync(playwrightPath, 'utf-8'));
    const playwrightReport = parsePlaywright(raw);

    console.log(`\n✅ Playwright Results:`);
    console.log(`   Total:   ${playwrightReport.stats.total}`);
    console.log(`   Passed:  ${playwrightReport.stats.passed}`);
    console.log(`   Failed:  ${playwrightReport.stats.failed}`);
    console.log(`   Skipped: ${playwrightReport.stats.skipped}`);
    console.log(`   Duration: ${playwrightReport.stats.duration}ms`);
  });

program.parse();
