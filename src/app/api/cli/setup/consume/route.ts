import {
  completeCliSetupViaConvex,
  getPublicApiUrl,
  type CliSetupConsumeBody,
  type CliSetupConsumeResponse,
} from "@/lib/sortiri/cliApi";
import { jsonError, parseJsonBody } from "@/lib/sortiri/ingestApi";

export async function POST(req: Request) {
  const body = await parseJsonBody<CliSetupConsumeBody>(req);
  if (!body?.setupToken?.trim()) {
    return jsonError("setupToken is required");
  }

  try {
    const result = await completeCliSetupViaConvex({
      setupToken: body.setupToken.trim(),
      repo: body.repo,
      editor: body.editor,
    });

    const response: CliSetupConsumeResponse = {
      ok: true,
      apiUrl: getPublicApiUrl(req),
      apiKey: result.apiKey,
      workspaceId: result.workspaceExternalId,
      projectId: result.projectId,
      projectName: result.projectName,
    };

    return Response.json(response);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Setup failed";
    const status =
      message.includes("expired") ||
      message.includes("used") ||
      message.includes("revoked") ||
      message.includes("Invalid token")
        ? 401
        : 500;
    return jsonError(message, status);
  }
}
