"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export type ImportRow = {
  phone: string;
  name: string;
  tags: string;
  consent: string;
  permissions: string;
};

export type ImportPreview = {
  phone: string;
  name: string;
  tags: string[];
  consent: boolean;
  permissions: string[];
  issue: string | null;
};

const PHONE = /^\+[1-9]\d{7,14}$/;

export async function previewContactImport(csv: string) {
  const user = await getCurrentUser();
  if (!user?.memberships[0]) return { ok: false as const, error: "Unauthorized" };
  const rows = parseContactCsv(csv);
  return { ok: true as const, rows };
}

export async function commitContactImport(csv: string) {
  const user = await getCurrentUser();
  const membership = user?.memberships[0];
  if (!membership) return { ok: false as const, error: "Unauthorized" };
  if (membership.role !== "OWNER" && membership.role !== "MANAGER") {
    return { ok: false as const, error: "Only owners and managers can import." };
  }

  const rows = parseContactCsv(csv).filter((row) => !row.issue);
  let created = 0;
  let updated = 0;
  for (const row of rows) {
    const existing = await prisma.contact.findUnique({
      where: {
        workspaceId_phoneE164: {
          workspaceId: membership.workspaceId,
          phoneE164: row.phone,
        },
      },
    });
    await prisma.contact.upsert({
      where: {
        workspaceId_phoneE164: {
          workspaceId: membership.workspaceId,
          phoneE164: row.phone,
        },
      },
      create: {
        workspaceId: membership.workspaceId,
        phoneE164: row.phone,
        profileName: row.name || null,
        tags: row.tags,
        categoryPerms: row.permissions,
        source: "csv_import",
        consentSource: "csv_import",
        consentAt: new Date(),
        consentEvidence: "csv-import-v1",
      },
      update: {
        profileName: row.name || undefined,
        tags: row.tags,
        categoryPerms: row.permissions,
        consentAt: new Date(),
        consentSource: "csv_import",
        consentEvidence: "csv-import-v1",
        suppressed: false,
        suppressedAt: null,
        suppressedReason: null,
      },
    });
    if (existing) updated += 1;
    else created += 1;
  }

  revalidatePath("/app/contacts");
  revalidatePath("/app/customers");
  return { ok: true as const, created, updated, skipped: parseContactCsv(csv).length - rows.length };
}

export function parseContactCsv(csv: string): ImportPreview[] {
  const lines = csv
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length === 0) return [];

  const header = splitCsv(lines[0]).map((cell) => cell.toLowerCase());
  const start = header.includes("phone") ? 1 : 0;
  const index = (name: string, fallback: number) => {
    const found = header.indexOf(name);
    return found >= 0 ? found : fallback;
  };
  const phoneIdx = start === 1 ? index("phone", 0) : 0;
  const nameIdx = start === 1 ? index("name", 1) : 1;
  const tagsIdx = start === 1 ? index("tags", 2) : 2;
  const consentIdx = start === 1 ? index("consent", 3) : 3;
  const permIdx = start === 1 ? index("permissions", 4) : 4;

  const seen = new Set<string>();
  return lines.slice(start).map((line) => {
    const cells = splitCsv(line);
    const phone = normalizePhone(cells[phoneIdx] ?? "");
    const name = (cells[nameIdx] ?? "").trim();
    const tags = (cells[tagsIdx] ?? "")
      .split(/[|;]/)
      .map((tag) => tag.trim())
      .filter(Boolean);
    const consentRaw = (cells[consentIdx] ?? "yes").trim().toLowerCase();
    const consent = ["yes", "y", "true", "1"].includes(consentRaw);
    const permissions = (cells[permIdx] ?? "marketing")
      .split(/[|;]/)
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean);

    let issue: string | null = null;
    if (!PHONE.test(phone)) issue = "Phone must be E.164, like +9198…";
    else if (!consent) issue = "Missing consent";
    else if (seen.has(phone)) issue = "Duplicate in this file";
    if (phone) seen.add(phone);

    return { phone, name, tags, consent, permissions, issue };
  });
}

function normalizePhone(value: string) {
  const trimmed = value.trim().replace(/[\s-]/g, "");
  if (!trimmed) return "";
  return trimmed.startsWith("+") ? trimmed : `+${trimmed}`;
}

function splitCsv(line: string) {
  return line.split(",").map((cell) => cell.trim().replace(/^"|"$/g, ""));
}
