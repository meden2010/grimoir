import { readFileSync, readdirSync, statSync } from 'fs';
import { join, extname } from 'path';

interface Violation {
  file: string;
  line: number;
  snippet: string;
  reason: string;
}

const BANNED_PATTERNS = [
  { pattern: /\bBun\.\w+/g, reason: 'Bun runtime global API (e.g. Bun.file, Bun.serve, Bun.spawn)' },
  { pattern: /from\s+['"]bun:[^'"]+['"]/g, reason: 'Importing bun:* internal module in production source' },
  { pattern: /import\s+['"]bun:[^'"]+['"]/g, reason: 'Importing bun:* internal module in production source' },
  { pattern: /require\(['"]bun:[^'"]+['"]\)/g, reason: 'Requiring bun:* internal module in production source' },
  { pattern: /\bimport\.meta\.dir\b/g, reason: 'Bun-specific import.meta.dir (use __dirname or fileURLToPath)' },
];

function getFilesRecursively(dir: string, extensions: string[]): string[] {
  let results: string[] = [];
  try {
    const list = readdirSync(dir);
    for (const file of list) {
      const fullPath = join(dir, file);
      const stat = statSync(fullPath);
      if (stat.isDirectory()) {
        results = results.concat(getFilesRecursively(fullPath, extensions));
      } else if (extensions.includes(extname(fullPath))) {
        results.push(fullPath);
      }
    }
  } catch (e) {
    // Directory might not exist yet
  }
  return results;
}

function auditSourceFiles(): Violation[] {
  const violations: Violation[] = [];
  const srcFiles = getFilesRecursively(join(process.cwd(), 'src'), ['.ts', '.js']);

  for (const filePath of srcFiles) {
    const content = readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');

    lines.forEach((line, index) => {
      for (const { pattern, reason } of BANNED_PATTERNS) {
        pattern.lastIndex = 0;
        if (pattern.test(line)) {
          violations.push({
            file: filePath.replace(process.cwd() + '/', ''),
            line: index + 1,
            snippet: line.trim(),
            reason,
          });
        }
      }
    });
  }

  return violations;
}

function run(): void {
  const isQuiet = process.argv.includes('--quiet') || process.argv.includes('-q');

  if (!isQuiet) {
    console.log('🔍 Auditing source code in src/ for Node.js universal compatibility...');
  }

  const violations = auditSourceFiles();

  if (violations.length === 0) {
    if (!isQuiet) {
      console.log('✅ Node.js compatibility check passed! No Bun-exclusive APIs found in src/.');
    }
    process.exit(0);
  } else {
    console.error(`\n❌ Node.js Compatibility Violation in src/ (${violations.length} found):`);
    for (const v of violations) {
      console.error(`  - ${v.file}:${v.line} -> ${v.reason}`);
      console.error(`    Code: "${v.snippet}"`);
    }
    process.exit(1);
  }
}

run();
