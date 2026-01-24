import { useState, useCallback } from 'react';

export interface AIOperationResult<T> {
  /**
   * Execute an async AI operation with automatic loading state management.
   * Returns the result on success, undefined on error.
   */
  execute: (fn: () => Promise<T>) => Promise<T | undefined>;
  /** True while the operation is in progress */
  isLoading: boolean;
  /** Error message if the last operation failed, null otherwise */
  error: string | null;
  /** Clear the error state */
  reset: () => void;
}

/**
 * Hook for managing AI operation states consistently across the app.
 *
 * Provides:
 * - Automatic loading state tracking
 * - Error capture and display
 * - Reset capability for clearing errors
 *
 * @param operationName - Optional name for logging/debugging
 * @returns AIOperationResult with execute, isLoading, error, and reset
 *
 * @example
 * ```tsx
 * const { execute, isLoading, error, reset } = useAIOperation<ResumeAnalysis>('grading');
 *
 * const handleGrade = async () => {
 *   const result = await execute(async () => {
 *     return await gradeResume(jobId, resumeText);
 *   });
 *   if (result) {
 *     setGrade(result);
 *   }
 * };
 * ```
 */
export function useAIOperation<T>(operationName?: string): AIOperationResult<T> {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const execute = useCallback(async (fn: () => Promise<T>): Promise<T | undefined> => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await fn();
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Operation failed';
      setError(errorMessage);
      if (operationName) {
        console.error(`AI operation "${operationName}" failed:`, err);
      }
      return undefined;
    } finally {
      setIsLoading(false);
    }
  }, [operationName]);

  const reset = useCallback(() => {
    setError(null);
  }, []);

  return {
    execute,
    isLoading,
    error,
    reset,
  };
}
