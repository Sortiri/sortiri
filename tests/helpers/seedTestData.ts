import { api } from "../../convex/_generated/api";
import { getConvexTestClient } from "./convexTestClient";

export async function seedTestWorkspaceData(): Promise<{
  workspaceId: string;
} | null> {
  const client = getConvexTestClient();
  if (!client) {
    return null;
  }

  const authToken = process.env.E2E_CONVEX_AUTH_TOKEN;
  if (authToken) {
    client.setAuth(authToken);
  }

  const result = await client.mutation(api.testSeed.seedTestWorkspace, {});
  return { workspaceId: result.workspaceId };
}
