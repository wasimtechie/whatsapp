import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

const schema = z.object({
  code: z.string().min(4),
  wabaId: z.string().optional(),
  phoneNumberId: z.string().optional(),
});

export async function POST(req: Request) {
  const user = await getCurrentUser();
  const membership = user?.memberships[0];
  if (!membership || (membership.role !== "OWNER" && membership.role !== "MANAGER")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const appId = process.env.META_APP_ID;
  const appSecret = process.env.META_APP_SECRET;
  if (!appId || !appSecret) {
    return NextResponse.json(
      { error: "Set META_APP_ID and META_APP_SECRET first." },
      { status: 400 },
    );
  }

  const body = schema.parse(await req.json());
  const version = process.env.META_API_VERSION ?? "v21.0";
  const tokenRes = await fetch(
    `https://graph.facebook.com/${version}/oauth/access_token?client_id=${appId}&client_secret=${appSecret}&code=${encodeURIComponent(body.code)}`,
  );
  const tokenJson = (await tokenRes.json()) as {
    access_token?: string;
    error?: { message?: string };
  };
  if (!tokenRes.ok || !tokenJson.access_token) {
    return NextResponse.json(
      { error: tokenJson.error?.message ?? "Meta did not return a token." },
      { status: 400 },
    );
  }

  const phoneNumberId = body.phoneNumberId;
  const wabaId = body.wabaId;
  if (!phoneNumberId) {
    return NextResponse.json(
      { error: "Meta signup finished without a phone number id. Paste credentials instead." },
      { status: 400 },
    );
  }

  const verifyToken = `relay_${membership.workspaceId.slice(0, 8)}`;
  await prisma.whatsAppAccount.upsert({
    where: {
      workspaceId_phoneNumberId: {
        workspaceId: membership.workspaceId,
        phoneNumberId,
      },
    },
    create: {
      workspaceId: membership.workspaceId,
      phoneNumberId,
      wabaId: wabaId ?? null,
      accessTokenEnc: tokenJson.access_token,
      webhookVerifyToken: verifyToken,
      health: "CONNECTED",
      credentialRef: `embedded:${membership.workspaceId}:${phoneNumberId}`,
    },
    update: {
      wabaId: wabaId ?? undefined,
      accessTokenEnc: tokenJson.access_token,
      health: "CONNECTED",
    },
  });

  await prisma.auditLog.create({
    data: {
      workspaceId: membership.workspaceId,
      actorId: user!.id,
      action: "whatsapp.embedded_signup",
      meta: { phoneNumberId, wabaId: wabaId ?? null },
    },
  });

  return NextResponse.json({ ok: true });
}
