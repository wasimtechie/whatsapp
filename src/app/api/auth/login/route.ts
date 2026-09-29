import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { createSession, verifyPassword } from "@/lib/auth";
import { issueMfaTicket } from "@/lib/mfa-ticket";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(req: Request) {
  try {
    const body = loginSchema.parse(await req.json());
    const user = await prisma.user.findUnique({
      where: { email: body.email.toLowerCase() },
    });
    if (!user || !(await verifyPassword(body.password, user.passwordHash))) {
      return NextResponse.json(
        { error: "Invalid email or password." },
        { status: 401 },
      );
    }
    if (user.mfaEnabled && user.mfaSecret) {
      return NextResponse.json({
        ok: true,
        mfaRequired: true,
        ticket: issueMfaTicket(user.id),
      });
    }
    await createSession(user.id);
    return NextResponse.json({ ok: true, redirect: "/app" });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues[0]?.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Login failed." }, { status: 500 });
  }
}
