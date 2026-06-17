export function jsonResponse(
  body: Record<string, unknown>,
  status = 200,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export function jsonError(message: string, status = 400): Response {
  return jsonResponse({ error: message }, status);
}

export function jsonOk(body: Record<string, unknown> = {}): Response {
  return jsonResponse({ ok: true, ...body });
}
