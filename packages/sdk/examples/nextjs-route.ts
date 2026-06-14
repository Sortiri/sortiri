import { Sortiri } from "@sortiri/sdk";

const sortiri = new Sortiri({
  apiUrl: process.env.SORTIRI_API_URL!,
  apiKey: process.env.SORTIRI_API_KEY!,
  workspaceId: process.env.SORTIRI_WORKSPACE_ID!,
});

export async function POST(req: Request) {
  const body = (await req.json()) as {
    userId?: string;
    plan?: string;
  };

  await sortiri.track({
    type: "user.signed_up",
    userId: body.userId,
    properties: {
      plan: body.plan,
    },
  });

  return Response.json({ ok: true });
}
