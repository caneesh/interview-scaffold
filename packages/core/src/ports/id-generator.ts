/**
 * IdGenerator - port for generating unique IDs (enables testing)
 */
export interface IdGenerator {
  generate(): string;
}

/**
 * Simple ID generator using timestamp + random (no crypto dependency)
 * For production, inject a proper UUID generator
 */
export const SimpleIdGenerator: IdGenerator = {
  generate: () => {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).slice(2, 10);
    return `${timestamp}-${random}`;
  },
};
