import { goneResponse } from "@/lib/api/compatGone";

export async function POST(req: Request) {
  void req;
  return goneResponse("cli/context/entity-memory");
}
