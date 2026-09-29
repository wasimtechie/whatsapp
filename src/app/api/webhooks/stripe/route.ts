import { createHmac, timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

const PLAN_LIMITS: Record<string, { seats: number; numbersLimit: number }> = {
  starter: { seats: 3, numbersLimit: 1 },
  growth: { seats: 10, numbersLimit: 3 },
};

export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const raw = await req.text();
  if (!secret || !verifyStripe(raw, req.headers.get("stripe-signature") ?? "", secret)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const event = JSON.parse(raw) as {
    type?: string;
    data?: {
      object?: {
        client_reference_id?: string;
        metadata?: { workspaceId?: string; plan?: string };
        customer?: string;
        subscription?: string;
        status?: string;
        id?: string;
      };
    };
  };

  const object = event.data?.object;
  const workspaceId = object?.metadata?.workspaceId ?? object?.client_reference_id;
  const plan = object?.metadata?.plan ?? "starter";
  if (!workspaceId) return NextResponse.json({ ok: true, ignored: true });

  if (event.type === "checkout.session.completed") {
    const limits = PLAN_LIMITS[plan] ?? PLAN_LIMITS.starter;
    await prisma.subscription.upsert({
      where: { workspaceId },
      create: {
        workspaceId,
        plan,
        status: "active",
        seats: limits.seats,
        numbersLimit: limits.numbersLimit,
        stripeCustomerId: typeof object?.customer === "string" ? object.customer : null,
        stripeSubId: typeof object?.subscription === "string" ? object.subscription : null,
      },
      update: {
        plan,
        status: "active",
        seats: limits.seats,
        numbersLimit: limits.numbersLimit,
        stripeCustomerId: typeof object?.customer === "string" ? object.customer : undefined,
        stripeSubId: typeof object?.subscription === "string" ? object.subscription : undefined,
      },
    });
    await prisma.workspace.update({
      where: { id: workspaceId },
      data: { plan, lifecycle: "ACTIVE" },
    });
  }

  if (event.type === "customer.subscription.deleted") {
    await prisma.workspace.update({
      where: { id: workspaceId },
      data: { lifecycle: "CANCELLED" },
    });
    await prisma.subscription.updateMany({
      where: { workspaceId },
      data: { status: "canceled" },
    });
  }

  return NextResponse.json({ ok: true });
}

function verifyStripe(payload: string, header: string, secret: string) {
  const parts = Object.fromEntries(
    header.split(",").map((part) => {
      const [key, value] = part.split("=");
      return [key, value];
    }),
  );
  if (!parts.t || !parts.v1) return false;
  const expected = createHmac("sha256", secret).update(`${parts.t}.${payload}`).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(parts.v1);
  return a.length === b.length && timingSafeEqual(a, b);
}
