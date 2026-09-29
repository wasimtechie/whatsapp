import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import {
  createSession,
  hashPassword,
  slugify,
  verifyPassword,
} from "@/lib/auth";

const signupSchema = z.object({
  name: z.string().min(1).max(80),
  email: z.string().email(),
  password: z.string().min(8).max(128),
  workspaceName: z.string().min(1).max(80),
});

export async function POST(req: Request) {
  try {
    const body = signupSchema.parse(await req.json());
    const existing = await prisma.user.findUnique({
      where: { email: body.email.toLowerCase() },
    });
    if (existing) {
      return NextResponse.json(
        { error: "An account with this email already exists." },
        { status: 409 },
      );
    }

    const baseSlug = slugify(body.workspaceName);
    let slug = baseSlug;
    let n = 1;
    while (await prisma.workspace.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${n++}`;
    }

    const passwordHash = await hashPassword(body.password);
    const user = await prisma.user.create({
      data: {
        email: body.email.toLowerCase(),
        name: body.name,
        passwordHash,
        memberships: {
          create: {
            role: "OWNER",
            inviteState: "ACCEPTED",
            workspace: {
              create: {
                name: body.workspaceName,
                slug,
                plan: "trial",
                region: "in",
                locale: "en-IN",
                timezone: "Asia/Kolkata",
                subscription: {
                  create: {
                    plan: "trial",
                    seats: 3,
                    numbersLimit: 1,
                    status: "trialing",
                  },
                },
              },
            },
          },
        },
      },
    });

    await createSession(user.id);
    return NextResponse.json({ ok: true, redirect: "/app" });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues[0]?.message }, { status: 400 });
    }
    console.error(err);
    return NextResponse.json({ error: "Signup failed." }, { status: 500 });
  }
}
