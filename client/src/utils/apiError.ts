/**
 * Extracts the server-provided error message from an axios error caught as
 * `unknown` (server envelope: `{ data: null, error: { message } }`).
 */
export function getApiErrorMessage(error: unknown, fallback: string): string {
  if (typeof error === 'object' && error !== null && 'response' in error) {
    const message = (error as { response?: { data?: { error?: { message?: string } } } }).response?.data?.error
      ?.message;
    if (message) return message;
  }
  return fallback;
}
