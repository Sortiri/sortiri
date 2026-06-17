import { jsonError } from "./httpResponse";

export async function readRawBody(request: Request): Promise<string> {
  return request.text();
}

export async function parseJsonBody<T extends Record<string, unknown>>(
  request: Request,
): Promise<T | null> {
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json") && request.body) {
    const text = await request.text();
    if (!text.trim()) return null;
    try {
      return JSON.parse(text) as T;
    } catch {
      return null;
    }
  }
  try {
    return (await request.json()) as T;
  } catch {
    return null;
  }
}

export function requireJsonBody<T extends Record<string, unknown>>(
  body: T | null,
  message = "Invalid JSON body",
): T | Response {
  if (!body) {
    return jsonError(message, 400);
  }
  return body;
}

export function getRequestPath(request: Request): string {
  return new URL(request.url).pathname;
}

export function getQueryParam(request: Request, key: string): string | null {
  return new URL(request.url).searchParams.get(key);
}
