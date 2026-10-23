import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import { cleanOutput } from '../../src/cli/index';

describe('cleanOutput', () => {
  const tempDir = join(__dirname, 'temp-clean-output');

  beforeEach(() => {
    // Create temporary directory before each test
    if (!existsSync(tempDir)) {
      mkdirSync(tempDir, { recursive: true });
    }
  });

  afterEach(() => {
    // Clean up temporary directory after each test
    if (existsSync(tempDir)) {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  test('should delete .grimoir-history.json when present', () => {
    const historyPath = join(tempDir, '.grimoir-history.json');
    writeFileSync(historyPath, JSON.stringify({ runs: [] }));
    expect(existsSync(historyPath)).toBe(true);

    cleanOutput(tempDir);

    expect(existsSync(historyPath)).toBe(false);
  });

  test('should delete data/ directory and its contents when present', () => {
    const dataDir = join(tempDir, 'data');
    mkdirSync(dataDir);
    const someFile = join(dataDir, 'some-file.txt');
    writeFileSync(someFile, 'hello');
    expect(existsSync(dataDir)).toBe(true);
    expect(existsSync(someFile)).toBe(true);

    cleanOutput(tempDir);

    expect(existsSync(dataDir)).toBe(false);
    expect(existsSync(someFile)).toBe(false);
  });

  test('should not throw errors if the files or directories do not exist', () => {
    // Ensure the temp directory exists but is completely empty
    const historyPath = join(tempDir, '.grimoir-history.json');
    const dataDir = join(tempDir, 'data');
    expect(existsSync(historyPath)).toBe(false);
    expect(existsSync(dataDir)).toBe(false);

    // This should just run without throwing any errors
    expect(() => cleanOutput(tempDir)).not.toThrow();
  });
});
