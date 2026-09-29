import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

export type RuleTrigger =
  | { type: "keyword"; keywords: string[] }
  | { type: "welcome" }
  | { type: "outside_hours"; start: string; end: string };

export type RuleAction =
  | { type: "reply"; body: string }
  | { type: "handoff" }
  | { type: "suppress" };

const STOP_RE = /^(stop|unsubscribe|opt[\s-]?out|cancel)$/i;
const START_RE = /^(start|subscribe|opt[\s-]?in)$/i;

export async function runInboundAutomation(input: {
  workspaceId: string;
  conversationId: string;
  contactId: string;
  numberId: string;
  body: string;
  inboundProviderId: string;
}) {
  const text = input.body.trim();
  if (!text || text.startsWith("[")) return;

  const [conversation, contact, number, workspace] = await Promise.all([
    prisma.conversation.findFirst({
      where: { id: input.conversationId, workspaceId: input.workspaceId },
    }),
    prisma.contact.findFirst({
      where: { id: input.contactId, workspaceId: input.workspaceId },
    }),
    prisma.whatsAppAccount.findFirst({
      where: { id: input.numberId, workspaceId: input.workspaceId },
    }),
    prisma.workspace.findUnique({ where: { id: input.workspaceId } }),
  ]);

  if (!conversation || !contact || !number || !workspace) return;

  if (STOP_RE.test(text)) {
    await prisma.contact.update({
      where: { id: contact.id },
      data: {
        suppressed: true,
        suppressedAt: new Date(),
        suppressedReason: "Customer replied STOP",
      },
    });
    await sendAutomationText({
      workspaceId: input.workspaceId,
      conversationId: conversation.id,
      number,
      to: contact.phoneE164,
      body: "You're unsubscribed and won't receive campaigns. Reply START if this was a mistake.",
      idempotencyKey: `auto:stop:${input.inboundProviderId}`,
      meta: { source: "policy", trigger: "stop" },
    });
    await prisma.auditLog.create({
      data: {
        workspaceId: input.workspaceId,
        action: "automation.stop",
        reason: "Inbound STOP suppressed the contact",
        meta: { contactId: contact.id, conversationId: conversation.id },
      },
    });
    return;
  }

  if (START_RE.test(text) && contact.suppressed) {
    await prisma.contact.update({
      where: { id: contact.id },
      data: {
        suppressed: false,
        suppressedAt: null,
        suppressedReason: null,
      },
    });
    await sendAutomationText({
      workspaceId: input.workspaceId,
      conversationId: conversation.id,
      number,
      to: contact.phoneE164,
      body: "You're subscribed again. You can reply STOP at any time.",
      idempotencyKey: `auto:start:${input.inboundProviderId}`,
      meta: { source: "policy", trigger: "start" },
    });
    return;
  }

  if (contact.suppressed) return;
  if (conversation.assigneeId) return;

  const rules = await prisma.automationRule.findMany({
    where: { workspaceId: input.workspaceId, enabled: true },
    orderBy: { priority: "asc" },
  });

  const inboundCount = await prisma.message.count({
    where: {
      conversationId: conversation.id,
      direction: "INBOUND",
      deletedAt: null,
    },
  });

  const nowMinutes = minutesInTimeZone(new Date(), workspace.timezone);

  for (const rule of rules) {
    const trigger = parseTrigger(rule.trigger);
    if (!trigger) continue;
    if (!matches(trigger, text, inboundCount, nowMinutes)) continue;

    const actions = parseActions(rule.actions);
    if (rule.testMode) {
      await prisma.auditLog.create({
        data: {
          workspaceId: input.workspaceId,
          action: "automation.test",
          reason: rule.name,
          meta: {
            ruleId: rule.id,
            version: rule.version,
            conversationId: conversation.id,
          },
        },
      });
      return;
    }

    for (const action of actions) {
      if (action.type === "reply" && action.body.trim()) {
        await sendAutomationText({
          workspaceId: input.workspaceId,
          conversationId: conversation.id,
          number,
          to: contact.phoneE164,
          body: action.body.trim(),
          idempotencyKey: `auto:${rule.id}:${input.inboundProviderId}`,
          meta: {
            source: "automation",
            ruleId: rule.id,
            ruleVersion: rule.version,
            outcome: "sent",
          },
        });
      }
      if (action.type === "handoff") {
        const labels = Array.from(
          new Set([...(conversation.labels ?? []), "needs-human"]),
        );
        await prisma.conversation.update({
          where: { id: conversation.id },
          data: { state: "PENDING", labels },
        });
      }
      if (action.type === "suppress") {
        await prisma.contact.update({
          where: { id: contact.id },
          data: {
            suppressed: true,
            suppressedAt: new Date(),
            suppressedReason: `Automation: ${rule.name}`,
          },
        });
      }
    }

    await prisma.auditLog.create({
      data: {
        workspaceId: input.workspaceId,
        action: "automation.run",
        reason: rule.name,
        meta: {
          ruleId: rule.id,
          version: rule.version,
          conversationId: conversation.id,
          outcome: "matched",
        },
      },
    });
    return;
  }
}

export function parseTrigger(value: unknown): RuleTrigger | null {
  if (!value || typeof value !== "object") return null;
  const t = value as { type?: string; keywords?: unknown; start?: string; end?: string };
  if (t.type === "welcome") return { type: "welcome" };
  if (t.type === "keyword" && Array.isArray(t.keywords)) {
    const keywords = t.keywords.map((k) => String(k).trim().toLowerCase()).filter(Boolean);
    if (!keywords.length) return null;
    return { type: "keyword", keywords };
  }
  if (t.type === "outside_hours" && t.start && t.end) {
    return { type: "outside_hours", start: t.start, end: t.end };
  }
  return null;
}

export function parseActions(value: unknown): RuleAction[] {
  if (!Array.isArray(value)) return [];
  const actions: RuleAction[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const a = item as { type?: string; body?: string };
    if (a.type === "reply" && a.body) actions.push({ type: "reply", body: a.body });
    if (a.type === "handoff") actions.push({ type: "handoff" });
    if (a.type === "suppress") actions.push({ type: "suppress" });
  }
  return actions;
}

function matches(
  trigger: RuleTrigger,
  text: string,
  inboundCount: number,
  nowMinutes: number,
) {
  if (trigger.type === "welcome") return inboundCount <= 1;
  if (trigger.type === "keyword") {
    const lower = text.toLowerCase();
    return trigger.keywords.some(
      (word) => lower === word || lower.startsWith(`${word} `) || lower.includes(` ${word}`),
    );
  }
  const start = toMinutes(trigger.start);
  const end = toMinutes(trigger.end);
  if (start == null || end == null) return false;
  if (start <= end) return nowMinutes < start || nowMinutes >= end;
  return nowMinutes >= end && nowMinutes < start;
}

function toMinutes(hhmm: string) {
  const match = /^(\d{1,2}):(\d{2})$/.exec(hhmm.trim());
  if (!match) return null;
  const h = Number(match[1]);
  const m = Number(match[2]);
  if (h > 23 || m > 59) return null;
  return h * 60 + m;
}

function minutesInTimeZone(date: Date, timeZone: string) {
  try {
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone,
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).formatToParts(date);
    const hour = Number(parts.find((p) => p.type === "hour")?.value ?? "0");
    const minute = Number(parts.find((p) => p.type === "minute")?.value ?? "0");
    return hour * 60 + minute;
  } catch {
    return date.getHours() * 60 + date.getMinutes();
  }
}

async function sendAutomationText(input: {
  workspaceId: string;
  conversationId: string;
  number: { id: string; phoneNumberId: string; accessTokenEnc: string | null };
  to: string;
  body: string;
  idempotencyKey: string;
  meta: Record<string, unknown>;
}) {
  const existing = await prisma.message.findUnique({
    where: {
      workspaceId_idempotencyKey: {
        workspaceId: input.workspaceId,
        idempotencyKey: input.idempotencyKey,
      },
    },
  });
  if (existing) return;

  const message = await prisma.message.create({
    data: {
      workspaceId: input.workspaceId,
      conversationId: input.conversationId,
      numberId: input.number.id,
      direction: "OUTBOUND",
      status: "QUEUED",
      body: input.body,
      mediaType: "text",
      mediaMeta: input.meta as Prisma.InputJsonValue,
      idempotencyKey: input.idempotencyKey,
    },
  });

  const token = input.number.accessTokenEnc ?? "";
  const demo =
    !token ||
    token.startsWith("demo-") ||
    input.number.phoneNumberId.startsWith("demo_");

  let status: "SENT" | "FAILED" = "SENT";
  let providerId: string | null = `local_${message.id}`;
  let errorMessage: string | null = null;

  if (!demo) {
    try {
      const res = await fetch(
        `https://graph.facebook.com/${process.env.META_API_VERSION ?? "v21.0"}/${input.number.phoneNumberId}/messages`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messaging_product: "whatsapp",
            to: input.to.replace(/^\+/, ""),
            type: "text",
            text: { body: input.body },
          }),
        },
      );
      const json = (await res.json()) as {
        messages?: { id?: string }[];
        error?: { message?: string };
      };
      if (!res.ok) {
        status = "FAILED";
        providerId = null;
        errorMessage = json.error?.message ?? "Meta API send failed";
      } else {
        providerId = json.messages?.[0]?.id ?? null;
      }
    } catch (err) {
      status = "FAILED";
      providerId = null;
      errorMessage = err instanceof Error ? err.message : "Send failed";
    }
  }

  await prisma.message.update({
    where: { id: message.id },
    data: { status, providerId, errorMessage },
  });
  await prisma.conversation.update({
    where: { id: input.conversationId },
    data: { lastMessageAt: new Date() },
  });
}

export const STARTER_RULES: {
  name: string;
  priority: number;
  trigger: RuleTrigger;
  actions: RuleAction[];
}[] = [
  {
    name: "After hours",
    priority: 10,
    trigger: { type: "outside_hours", start: "09:00", end: "19:00" },
    actions: [
      {
        type: "reply",
        body: "We're currently away (9am–7pm IST). We'll reply when we're back.",
      },
    ],
  },
  {
    name: "Pricing handoff",
    priority: 20,
    trigger: { type: "keyword", keywords: ["price", "pricing", "cost", "quote"] },
    actions: [
      {
        type: "reply",
        body: "Thanks — I'm handing this to the team for pricing.",
      },
      { type: "handoff" },
    ],
  },
  {
    name: "Welcome",
    priority: 30,
    trigger: { type: "welcome" },
    actions: [
      {
        type: "reply",
        body: "Hi, thanks for messaging us. A teammate will help you shortly. Reply STOP to opt out.",
      },
    ],
  },
];
