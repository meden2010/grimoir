#!/usr/bin/env node

import { Command } from 'commander';

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
    console.log(`Input: ${options.input}`);
    console.log(`Output: ${options.output}`);
  });

program.parse();
