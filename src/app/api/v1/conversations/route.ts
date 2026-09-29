import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { authenticateApiKey } from "@/lib/api-key";

export async function GET(req: Request) {
  const auth = await authenticateApiKey(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const limit = Math.min(Number(url.searchParams.get("limit") ?? 50), 100);
  const conversations = await prisma.conversation.findMany({
    where: { workspaceId: auth.workspaceId },
    orderBy: { lastMessageAt: "desc" },
    take: Number.isFinite(limit) ? limit : 50,
    select: {
      id: true,
      state: true,
      lastMessageAt: true,
      lastCustomerAt: true,
      contact: { select: { id: true, phoneE164: true, profileName: true } },
    },
  });
  return NextResponse.json({ data: conversations });
}
