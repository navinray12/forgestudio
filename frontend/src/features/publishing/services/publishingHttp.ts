export const getPublishingBaseUrl = (override?: string): string =>
  override || (import.meta.env.VITE_API_URL || "");

export async function requestPublishingJson<T>(
  path: string,
  init: RequestInit,
  fallbackMessage: string,
  apiUrl?: string,
): Promise<T> {
  const response = await fetch(`${getPublishingBaseUrl(apiUrl)}${path}`, {
    credentials: "include",
    ...init,
    headers: { "Content-Type": "application/json", ...init.headers },
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data?.message || fallbackMessage);
  return data as T;
}
