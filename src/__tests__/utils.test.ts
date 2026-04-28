/**
 * Utility Functions Tests
 * Tests for date formatting and other utility functions
 */

import { describe, it, expect } from 'vitest';

// Helper function to format Thai date (simplified for testing)
function formatThaiDate(date: Date | string): string {
  const d = new Date(date);
  const day = d.getDate();
  const monthNames = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 
                      'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
  const month = monthNames[d.getMonth()];
  const year = d.getFullYear() + 543;
  return `${day} ${month} ${year}`;
}

describe('Date Formatting Utilities', () => {
  it('should format date to Thai format', () => {
    const date = new Date('2026-01-30');
    const result = formatThaiDate(date);
    expect(result).toContain('2569'); // Buddhist year
    expect(result).toContain('ม.ค.'); // January in Thai
  });

  it('should handle string dates', () => {
    const result = formatThaiDate('2026-06-15');
    expect(result).toContain('มิ.ย.'); // June in Thai
  });
});

describe('File Size Formatting', () => {
  function formatFileSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1024 / 1024).toFixed(2) + ' MB';
  }

  it('should format bytes correctly', () => {
    expect(formatFileSize(500)).toBe('500 B');
  });

  it('should format kilobytes correctly', () => {
    expect(formatFileSize(2048)).toBe('2.0 KB');
  });

  it('should format megabytes correctly', () => {
    expect(formatFileSize(1048576)).toBe('1.00 MB');
  });
});
