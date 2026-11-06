import { describe, test, expect, beforeEach, afterEach, mock, spyOn } from 'bun:test';
import { existsSync, mkdirSync, rmSync, writeFileSync, readFileSync } from 'fs';
import { join } from 'path';
import * as http from 'http';
import { program, buildReport, createProgram, formatServerUrl } from '../../src/cli/index';

// We need a real file system for these tests since the functions under test
// utilize Node's fs heavily and interact with actual JSON fixture formats.
// The easiest and most robust way to test this logic without mocking
// 20+ fs functions is to prepare a temporary directory.

const FIXTURES_DIR = join(__dirname, '../fixtures/demo-output');

describe('CLI - index.ts', () => {
  const tempDir = join(__dirname, 'temp-cli-test-dir');

  beforeEach(() => {
    // Suppress console.log output during tests to avoid noise
    spyOn(console, 'log').mockImplementation(() => {});
    spyOn(console, 'error').mockImplementation(() => {});

    if (!existsSync(tempDir)) {
      mkdirSync(tempDir, { recursive: true });
    }
  });

  afterEach(() => {
    mock.restore();
    if (existsSync(tempDir)) {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('buildReport', () => {
    test('should generate a report from valid input and clean prior data if requested', async () => {
      // Mock history with a seeded prior run
      const outputPath = join(tempDir, 'out1');
      mkdirSync(outputPath, { recursive: true });
      writeFileSync(
        join(outputPath, '.grimoir-history.json'),
        JSON.stringify({ runs: [{ date: '2020-01-01', total: 99, passed: 99, failed: 0, skipped: 0, duration: 100 }], tests: {} })
      );

      // The demo-output fixture should have playwright-results.json and k6-results.json
      // Make sure those fixtures are created before this test runs (e.g. via pre-build steps in gate)
      if (!existsSync(FIXTURES_DIR)) {
        console.warn('Skipping test as demo fixtures do not exist');
        return;
      }

      const html = await buildReport(FIXTURES_DIR, outputPath, true);

      // Verify that HTML is returned and index.html is written
      expect(typeof html).toBe('string');
      expect(html.length).toBeGreaterThan(0);
      expect(existsSync(join(outputPath, 'index.html'))).toBe(true);

      // We supplied `clean: true`, which should have cleared prior runs and created a fresh history with current run only
      const historyFile = join(outputPath, '.grimoir-history.json');
      expect(existsSync(historyFile)).toBe(true);
      const history = JSON.parse(readFileSync(historyFile, 'utf-8'));
      expect(history.runs.some((r: any) => r.total === 99)).toBe(false);
      expect(history.runs.length).toBe(1);
    });

    test('should gracefully handle empty or invalid history file during read', async () => {
      const outputPath = join(tempDir, 'out-invalid-history');
      mkdirSync(outputPath, { recursive: true });
      writeFileSync(join(outputPath, '.grimoir-history.json'), 'invalid json!!!');

      if (!existsSync(FIXTURES_DIR)) {
        return;
      }

      const html = await buildReport(FIXTURES_DIR, outputPath, false);
      expect(typeof html).toBe('string');
      expect(html.length).toBeGreaterThan(0);
      expect(existsSync(join(outputPath, 'index.html'))).toBe(true);
      
      const historyFile = join(outputPath, '.grimoir-history.json');
      expect(existsSync(historyFile)).toBe(true);
      const history = JSON.parse(readFileSync(historyFile, 'utf-8'));
      expect(Array.isArray(history.runs)).toBe(true);
      expect(history.runs.length).toBe(1);
    });
  });

  describe('program commands', () => {
    test('clean command should call cleanOutput by testing via process exit code logic', async () => {
      const outputPath = join(tempDir, 'out-clean-cmd');
      mkdirSync(outputPath, { recursive: true });
      writeFileSync(join(outputPath, 'index.html'), 'dummy html');
      writeFileSync(join(outputPath, '.grimoir-history.json'), 'dummy history');

      // Execute 'clean' command programmatically
      // We pass ['node', 'grimoir', 'clean', '-o', <path>]
      await program.parseAsync(['node', 'grimoir', 'clean', '-o', outputPath]);

      // Assert side effects of clean
      expect(existsSync(join(outputPath, 'index.html'))).toBe(false);
      expect(existsSync(join(outputPath, '.grimoir-history.json'))).toBe(false);
    });

    test('generate command should parse args correctly and create report', async () => {
      const outputPath = join(tempDir, 'out-generate-cmd');
      if (!existsSync(FIXTURES_DIR)) {
        return;
      }

      await program.parseAsync(['node', 'grimoir', 'generate', '-i', FIXTURES_DIR, '-o', outputPath, '--no-serve']);

      expect(existsSync(join(outputPath, 'index.html'))).toBe(true);
    });


    test('generate command should bind server to default host 127.0.0.1 when --host is omitted', async () => {
      const outputPath = join(tempDir, 'out-host-gen-default');
      if (!existsSync(FIXTURES_DIR)) return;

      const serverProg = createProgram();
      let listenArgs: { port: number; host: string } | undefined;
      let closed = false;

      const mockServer = {
        listen: (port: number, host: string, cb?: () => void) => {
          listenArgs = { port, host };
          if (cb) cb();
          return mockServer;
        },
        close: (cb?: () => void) => {
          closed = true;
          if (cb) cb();
          return mockServer;
        },
      };

      spyOn(http, 'createServer').mockReturnValue(mockServer as any);

      await serverProg.parseAsync(['node', 'grimoir', 'generate', '-i', FIXTURES_DIR, '-o', outputPath]);

      expect(listenArgs).toBeDefined();
      expect(listenArgs?.host).toBe('127.0.0.1');
      expect(listenArgs?.port).toBe(8080);
      mockServer.close();
      expect(closed).toBe(true);
    });

    test('generate command should bind server to explicit host when --host is provided', async () => {
      const outputPath = join(tempDir, 'out-host-gen-custom');
      if (!existsSync(FIXTURES_DIR)) return;

      const serverProg = createProgram();
      let listenArgs: { port: number; host: string } | undefined;
      let closed = false;

      const mockServer = {
        listen: (port: number, host: string, cb?: () => void) => {
          listenArgs = { port, host };
          if (cb) cb();
          return mockServer;
        },
        close: (cb?: () => void) => {
          closed = true;
          if (cb) cb();
          return mockServer;
        },
      };

      spyOn(http, 'createServer').mockReturnValue(mockServer as any);

      await serverProg.parseAsync(['node', 'grimoir', 'generate', '-i', FIXTURES_DIR, '-o', outputPath, '--host', '0.0.0.0']);

      expect(listenArgs).toBeDefined();
      expect(listenArgs?.host).toBe('0.0.0.0');
      mockServer.close();
      expect(closed).toBe(true);
    });

    test('serve command should bind server to default host 127.0.0.1 when --host is omitted', async () => {
      const dummyFile = join(tempDir, 'dummy-default.html');
      writeFileSync(dummyFile, '<h1>Report</h1>');

      const serverProg = createProgram();
      let listenArgs: { port: number; host: string } | undefined;
      let closed = false;

      const mockServer = {
        listen: (port: number, host: string, cb?: () => void) => {
          listenArgs = { port, host };
          if (cb) cb();
          return mockServer;
        },
        close: (cb?: () => void) => {
          closed = true;
          if (cb) cb();
          return mockServer;
        },
      };

      spyOn(http, 'createServer').mockReturnValue(mockServer as any);

      await serverProg.parseAsync(['node', 'grimoir', 'serve', '-f', dummyFile]);

      expect(listenArgs).toBeDefined();
      expect(listenArgs?.host).toBe('127.0.0.1');
      expect(listenArgs?.port).toBe(8080);
      mockServer.close();
      expect(closed).toBe(true);
    });

    test('serve command should bind server to explicit host when --host is provided', async () => {
      const dummyFile = join(tempDir, 'dummy-custom.html');
      writeFileSync(dummyFile, '<h1>Report</h1>');

      const serverProg = createProgram();
      let listenArgs: { port: number; host: string } | undefined;
      let closed = false;

      const mockServer = {
        listen: (port: number, host: string, cb?: () => void) => {
          listenArgs = { port, host };
          if (cb) cb();
          return mockServer;
        },
        close: (cb?: () => void) => {
          closed = true;
          if (cb) cb();
          return mockServer;
        },
      };

      spyOn(http, 'createServer').mockReturnValue(mockServer as any);

      await serverProg.parseAsync(['node', 'grimoir', 'serve', '-f', dummyFile, '--host', '192.168.1.1']);

      expect(listenArgs).toBeDefined();
      expect(listenArgs?.host).toBe('192.168.1.1');
      mockServer.close();
      expect(closed).toBe(true);
    });
  });

  describe('formatServerUrl', () => {
    test('should format standard IPv4 host', () => {
      expect(formatServerUrl('127.0.0.1', 8080)).toBe('http://127.0.0.1:8080');
    });

    test('should report 0.0.0.0 wildcard as 127.0.0.1 for local viewing convenience', () => {
      expect(formatServerUrl('0.0.0.0', 8080)).toBe('http://127.0.0.1:8080');
    });

    test('should bracket unbracketed IPv6 host values', () => {
      expect(formatServerUrl('::1', 8080)).toBe('http://[::1]:8080');
      expect(formatServerUrl('2001:db8::1', 3000)).toBe('http://[2001:db8::1]:3000');
    });

    test('should preserve already bracketed IPv6 host values', () => {
      expect(formatServerUrl('[::1]', 8080)).toBe('http://[::1]:8080');
    });

    test('should format domain names and custom hosts', () => {
      expect(formatServerUrl('localhost', 8080)).toBe('http://localhost:8080');
      expect(formatServerUrl('192.168.1.10', 9000)).toBe('http://192.168.1.10:9000');
    });
  });
});
