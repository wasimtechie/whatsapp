import { createHmac, timingSafeEqual } from "crypto";

function ticketSecret() {
  return process.env.CRON_SECRET || "dev-mfa-ticket";
}

export function issueMfaTicket(userId: string) {
  const exp = Date.now() + 5 * 60 * 1000;
  const body = `${userId}.${exp}`;
  const sig = createHmac("sha256", ticketSecret()).update(body).digest("hex");
  return `${body}.${sig}`;
}

export function readMfaTicket(ticket: string) {
  const parts = ticket.split(".");
  if (parts.length !== 3) return null;
  const [userId, exp, sig] = parts;
  const expected = createHmac("sha256", ticketSecret())
    .update(`${userId}.${exp}`)
    .digest("hex");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  if (Number(exp) < Date.now()) return null;
  return userId;
}
