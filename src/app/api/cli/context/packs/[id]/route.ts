import { goneResponse } from "@/lib/api/compatGone";

export async function GET(req: Request) {
  void req;
  return goneResponse("cli/context/packs/:id");
}
