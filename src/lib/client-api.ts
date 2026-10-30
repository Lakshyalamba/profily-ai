export async function api<T>(
  url: string,
  init?: RequestInit,
  timeout = 130000,
): Promise<T> {
  const response = await fetch(url, {
    ...init,
    cache: "no-store",
    signal: AbortSignal.timeout(timeout),
  });
  if (!response.headers.get("content-type")?.includes("application/json")) {
    await response.body?.cancel();
    throw new Error(
      response.ok
        ? "The server returned an unexpected response. Please retry."
        : `The service is temporarily unavailable (HTTP ${response.status}). Please retry.`,
    );
  }
  let value;
  try {
    value = await response.json();
  } catch {
    throw new Error("The server response could not be read. Please retry.");
  }
  if (!response.ok)
    throw new Error(
      typeof value?.error === "string"
        ? value.error
        : "The request failed. Please retry.",
    );
  return value as T;
}
export function errorMessage(error: unknown) {
  return error instanceof Error &&
    (error.name === "TimeoutError" || error.name === "AbortError")
    ? "The request took too long. Please retry."
    : error instanceof Error
      ? error.message
      : "The operation failed. Please retry.";
}
