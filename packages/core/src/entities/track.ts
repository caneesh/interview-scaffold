/**
 * Track - the different practice tracks supported by the platform
 */
export const TRACKS = [
  'coding_interview',
  'debug_lab',
  'system_design',
] as const;

export type Track = (typeof TRACKS)[number];

/**
 * Type guard to check if a string is a valid Track
 */
export function isValidTrack(value: string): value is Track {
  return TRACKS.includes(value as Track);
}
