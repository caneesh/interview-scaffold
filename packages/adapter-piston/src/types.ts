/**
 * Piston API types
 * https://github.com/engineer-man/piston
 */

export interface PistonFile {
  readonly name?: string;
  readonly content: string;
  readonly encoding?: 'utf8' | 'base64' | 'hex';
}

export interface PistonExecuteRequest {
  readonly language: string;
  readonly version: string;
  readonly files: readonly PistonFile[];
  readonly stdin?: string;
  readonly args?: readonly string[];
  readonly compile_timeout?: number;
  readonly run_timeout?: number;
  readonly compile_memory_limit?: number;
  readonly run_memory_limit?: number;
}

export interface PistonOutputStage {
  readonly stdout: string;
  readonly stderr: string;
  readonly code: number;
  readonly signal: string | null;
  readonly message?: string;
  /** Status codes: RE=Runtime Error, SG=Signal, TO=Timeout, OL=Output Limit, XX=Internal Error */
  readonly status?: 'RE' | 'SG' | 'TO' | 'OL' | 'XX';
}

export interface PistonExecuteResponse {
  readonly language: string;
  readonly version: string;
  readonly compile?: PistonOutputStage;
  readonly run: PistonOutputStage;
}

export interface PistonRuntime {
  readonly language: string;
  readonly version: string;
  readonly aliases: readonly string[];
}

export interface PistonExecutorConfig {
  /** Base URL for Piston API. Default: https://emkc.org/api/v2/piston */
  readonly baseUrl?: string;
  /** HTTP request timeout in ms. Default: 30000 */
  readonly timeout?: number;
  /** Per-test-case execution timeout in ms. Default: 5000 */
  readonly runTimeout?: number;
  /** Compilation timeout in ms. Default: 15000 */
  readonly compileTimeout?: number;
  /** Memory limit in bytes. -1 for unlimited */
  readonly memoryLimit?: number;
}

export type SupportedLanguage = 'javascript' | 'python' | 'java' | 'cpp';

export interface LanguageConfig {
  readonly pistonLanguage: string;
  readonly pistonVersion: string;
  readonly fileExtension: string;
  readonly fileName: string;
  readonly compileTimeout: number;
  readonly runTimeout: number;
}

export interface CodeWrapper {
  /**
   * Wraps user code with test harness for execution.
   */
  wrap(
    userCode: string,
    input: string,
    functionName: string
  ): string;

  /**
   * Parses the stdout from execution into actual output.
   */
  parseOutput(stdout: string): { result: string; error: string | null };

  /**
   * Extracts the main function name from user code.
   */
  extractFunctionName(code: string): string | null;
}
