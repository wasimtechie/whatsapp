import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { createSession } from "@/lib/auth";
import { readMfaTicket } from "@/lib/mfa-ticket";
import { verifyTotp } from "@/lib/totp";

const schema = z.object({
  ticket: z.string().min(10),
  code: z.string().min(6).max(8),
});

export async function POST(req: Request) {
  try {
    const body = schema.parse(await req.json());
    const userId = readMfaTicket(body.ticket);
    if (!userId) {
      return NextResponse.json({ error: "Sign-in expired. Try again." }, { status: 401 });
    }
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user?.mfaEnabled || !user.mfaSecret || !verifyTotp(user.mfaSecret, body.code)) {
      return NextResponse.json({ error: "That code is not valid." }, { status: 401 });
    }
    await createSession(user.id);
    return NextResponse.json({ ok: true, redirect: "/app" });
  } catch {
    return NextResponse.json({ error: "Could not verify the code." }, { status: 400 });
  }
}
