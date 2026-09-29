import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { launchCampaign } from "@/lib/campaigns";

export async function POST(req: Request) {
  const secret = process.env.CRON_SECRET;
  const provided = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!secret || provided !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const due = await prisma.campaign.findMany({
    where: { status: "SCHEDULED", scheduledAt: { lte: new Date() } },
    select: { id: true, workspaceId: true },
  });

  const results = [];
  for (const campaign of due) {
    const result = await launchCampaign(campaign.workspaceId, campaign.id);
    results.push({ id: campaign.id, ...result });
  }

  return NextResponse.json({ ok: true, processed: results.length, results });
}
