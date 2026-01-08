import { describe, it, expect } from 'vitest';
import { SystemClock, createFixedClock } from '../../src/ports/Clock.js';

describe('Clock', () => {
  describe('SystemClock', () => {
    it('should return current time', () => {
      const before = Date.now();
      const now = SystemClock.now();
      const after = Date.now();

      expect(now).toBeGreaterThanOrEqual(before);
      expect(now).toBeLessThanOrEqual(after);
    });

    it('should return today as a Date', () => {
      const today = SystemClock.today();
      expect(today).toBeInstanceOf(Date);
    });

    it('should return start of day', () => {
      const startOfDay = SystemClock.startOfDay();
      const date = new Date(startOfDay);

      expect(date.getHours()).toBe(0);
      expect(date.getMinutes()).toBe(0);
      expect(date.getSeconds()).toBe(0);
      expect(date.getMilliseconds()).toBe(0);
    });
  });

  describe('createFixedClock', () => {
    it('should return fixed time', () => {
      const fixedTime = 1704067200000; // 2024-01-01 00:00:00 UTC
      const clock = createFixedClock(fixedTime);

      expect(clock.now()).toBe(fixedTime);
      expect(clock.now()).toBe(fixedTime); // Still same
    });

    it('should return fixed date', () => {
      const fixedTime = 1704067200000;
      const clock = createFixedClock(fixedTime);
      const today = clock.today();

      expect(today.getTime()).toBe(fixedTime);
    });

    it('should calculate start of day for fixed time', () => {
      // 2024-01-15 14:30:00 UTC
      const fixedTime = 1705329000000;
      const clock = createFixedClock(fixedTime);

      const startOfDay = clock.startOfDay();
      const date = new Date(startOfDay);

      expect(date.getHours()).toBe(0);
      expect(date.getMinutes()).toBe(0);
      expect(date.getDate()).toBe(new Date(fixedTime).getDate());
    });

    it('should calculate start of day for any timestamp', () => {
      const clock = createFixedClock(Date.now());

      // 2024-01-20 18:45:30 UTC
      const timestamp = 1705776330000;
      const startOfDay = clock.startOfDayFor(timestamp);
      const date = new Date(startOfDay);

      expect(date.getHours()).toBe(0);
      expect(date.getMinutes()).toBe(0);
      expect(date.getSeconds()).toBe(0);
    });
  });
});
