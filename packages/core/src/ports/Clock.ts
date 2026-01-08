/**
 * Clock port - abstraction for time operations.
 * Enables deterministic testing.
 */

export interface Clock {
  /**
   * Returns current timestamp in milliseconds.
   */
  now(): number;

  /**
   * Returns current date.
   */
  today(): Date;

  /**
   * Returns start of day (midnight) for current date.
   */
  startOfDay(): number;

  /**
   * Returns start of day for a given timestamp.
   */
  startOfDayFor(timestamp: number): number;
}

/**
 * System clock implementation using Date.now().
 */
export const SystemClock: Clock = {
  now: () => Date.now(),
  today: () => new Date(),
  startOfDay: () => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return now.getTime();
  },
  startOfDayFor: (timestamp: number) => {
    const date = new Date(timestamp);
    date.setHours(0, 0, 0, 0);
    return date.getTime();
  },
};

/**
 * Creates a fixed clock for testing.
 */
export function createFixedClock(fixedTime: number): Clock {
  return {
    now: () => fixedTime,
    today: () => new Date(fixedTime),
    startOfDay: () => {
      const date = new Date(fixedTime);
      date.setHours(0, 0, 0, 0);
      return date.getTime();
    },
    startOfDayFor: (timestamp: number) => {
      const date = new Date(timestamp);
      date.setHours(0, 0, 0, 0);
      return date.getTime();
    },
  };
}
