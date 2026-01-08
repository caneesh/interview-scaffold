import type {
  PistonExecuteRequest,
  PistonExecuteResponse,
  PistonRuntime,
  PistonExecutorConfig,
} from './types.js';

export interface PistonClient {
  execute(request: PistonExecuteRequest): Promise<PistonExecuteResponse>;
  getRuntimes(): Promise<readonly PistonRuntime[]>;
}

export class PistonApiError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number
  ) {
    super(message);
    this.name = 'PistonApiError';
  }
}

const DEFAULT_BASE_URL = 'https://emkc.org/api/v2/piston';
const DEFAULT_TIMEOUT = 30000;

export function createPistonClient(config: PistonExecutorConfig = {}): PistonClient {
  const baseUrl = config.baseUrl ?? DEFAULT_BASE_URL;
  const timeout = config.timeout ?? DEFAULT_TIMEOUT;

  return {
    async execute(request: PistonExecuteRequest): Promise<PistonExecuteResponse> {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      try {
        const response = await fetch(`${baseUrl}/execute`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(request),
          signal: controller.signal,
        });

        if (!response.ok) {
          let errorMessage = `Piston API error: ${response.status}`;
          try {
            const error = await response.json();
            errorMessage = error.message ?? errorMessage;
          } catch {
            // Ignore JSON parse error
          }
          throw new PistonApiError(errorMessage, response.status);
        }

        return response.json();
      } catch (error) {
        if (error instanceof PistonApiError) {
          throw error;
        }
        if (error instanceof Error && error.name === 'AbortError') {
          throw new PistonApiError('Request timeout', 408);
        }
        throw new PistonApiError(
          error instanceof Error ? error.message : 'Unknown error',
          500
        );
      } finally {
        clearTimeout(timeoutId);
      }
    },

    async getRuntimes(): Promise<readonly PistonRuntime[]> {
      const response = await fetch(`${baseUrl}/runtimes`);
      if (!response.ok) {
        throw new PistonApiError('Failed to fetch runtimes', response.status);
      }
      return response.json();
    },
  };
}
