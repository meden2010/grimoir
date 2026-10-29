import { test, expect, describe } from 'bun:test';
import { truncateString } from '../../../src/utils/string.util';

describe('string.util', () => {
  describe('truncateString', () => {
    test('should return empty string if input is empty', () => {
      expect(truncateString('')).toBe('');
    });

    test('should return same string if length is less than max length', () => {
      expect(truncateString('hello', 10)).toBe('hello');
    });

    test('should return same string if length is equal to max length', () => {
      expect(truncateString('hello', 5)).toBe('hello');
    });

    test('should truncate string and add ellipsis if length is greater than max length', () => {
      expect(truncateString('hello world', 5)).toBe('hello...');
    });

    test('should use default max length of 200', () => {
      const longString = 'a'.repeat(250);
      expect(truncateString(longString)).toBe('a'.repeat(200) + '...');
    });
  });
});
