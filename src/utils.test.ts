import { describe, it, expect } from 'vitest';
import { cn, formatTime } from './utils';

describe('utils', () => {
  describe('cn', () => {
    it('merges tailwind classes correctly', () => {
      expect(cn('px-2 py-2', 'px-4')).toBe('py-2 px-4');
    });

    it('handles conditional classes', () => {
      expect(cn('px-2', true && 'py-2', false && 'hidden')).toBe('px-2 py-2');
    });
  });

  describe('formatTime', () => {
    it('formats seconds into MM:SS', () => {
      expect(formatTime(65)).toBe('01:05');
      expect(formatTime(0)).toBe('00:00');
      expect(formatTime(3600)).toBe('60:00');
    });

    it('pads single digits with zeros', () => {
      expect(formatTime(9)).toBe('00:09');
      expect(formatTime(60)).toBe('01:00');
    });
  });
});
