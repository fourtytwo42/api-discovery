import { describe, it, expect } from 'vitest';
import {
  formatBytes,
  formatDuration,
  truncateString,
  formatDate,
  formatRelativeTime,
} from '@/lib/utils/formatting';

describe('Formatting Utilities', () => {
  describe('formatBytes', () => {
    it('should format bytes', () => {
      expect(formatBytes(0)).toBe('0 Bytes');
      expect(formatBytes(1024)).toBe('1 KB');
      expect(formatBytes(1048576)).toBe('1 MB');
      expect(formatBytes(1073741824)).toBe('1 GB');
    });

    it('should handle decimal values', () => {
      const result = formatBytes(1536);
      expect(result).toContain('KB');
      expect(parseFloat(result)).toBeCloseTo(1.5, 1);
    });
  });

  describe('formatDuration', () => {
    it('should format milliseconds', () => {
      expect(formatDuration(500)).toBe('500ms');
      expect(formatDuration(1500)).toContain('s');
      expect(formatDuration(60000)).toContain('m');
      expect(formatDuration(3600000)).toContain('h');
    });
  });

  describe('truncateString', () => {
    it('should truncate long strings', () => {
      const long = 'a'.repeat(100);
      const result = truncateString(long, 50);
      expect(result.length).toBe(50);
      expect(result.endsWith('...')).toBe(true);
    });

    it('should not truncate short strings', () => {
      const short = 'short';
      expect(truncateString(short, 50)).toBe(short);
    });
  });

  describe('formatDate', () => {
    it('should format date string', () => {
      const date = new Date('2024-01-15T10:30:00Z');
      const result = formatDate(date);
      expect(result).toContain('Jan');
      expect(result).toContain('2024');
    });

    it('should format date from string', () => {
      const result = formatDate('2024-01-15T10:30:00Z');
      expect(result).toContain('Jan');
    });
  });

  describe('formatRelativeTime', () => {
    it('should format recent times', () => {
      const now = new Date();
      const recent = new Date(now.getTime() - 30 * 1000); // 30 seconds ago
      expect(formatRelativeTime(recent)).toContain('just now');
    });

    it('should format minutes ago', () => {
      const now = new Date();
      const minutesAgo = new Date(now.getTime() - 5 * 60 * 1000); // 5 minutes ago
      expect(formatRelativeTime(minutesAgo)).toContain('minute');
    });

    it('should format hours ago', () => {
      const now = new Date();
      const hoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000); // 2 hours ago
      expect(formatRelativeTime(hoursAgo)).toContain('hour');
    });

    it('should format days ago', () => {
      const now = new Date();
      const daysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000); // 3 days ago
      expect(formatRelativeTime(daysAgo)).toContain('day');
    });
  });
});

