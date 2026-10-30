import "server-only";
/** One retry for transient gateway failures, within a single total deadline. Never retry quota/auth errors. */
export async function fetchWithRetry(
  url: string,
  init: RequestInit,
  timeoutMs = 55000,
): Promise<Response> {
  const signal = AbortSignal.timeout(timeoutMs);
  for (let attempt = 0; ; attempt++) {
    try {
      const response = await fetch(url, { ...init, signal });
      if (attempt || ![502, 503, 504].includes(response.status))
        return response;
      await response.body?.cancel();
    } catch (error) {
      if (attempt || signal.aborted || !(error instanceof TypeError))
        throw error;
    }
    await new Promise((resolve) => setTimeout(resolve, 150));
    signal.throwIfAborted();
  }
}
