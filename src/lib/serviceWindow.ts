const WINDOW_MS = 24 * 60 * 60 * 1000;

export function isServiceWindowOpen(lastCustomerAt: Date | null | undefined) {
  if (!lastCustomerAt) return false;
  return Date.now() - lastCustomerAt.getTime() < WINDOW_MS;
}

const STATUS_RANK: Record<string, number> = {
  QUEUED: 0,
  SENT: 1,
  DELIVERED: 2,
  READ: 3,
  FAILED: 4,
};

/** Delivery can move forward. A failure does not overwrite a read receipt. */
export function nextMessageStatus(current: string, incoming: string) {
  if (incoming === "FAILED") {
    return current === "READ" || current === "DELIVERED" ? current : "FAILED";
  }
  if ((STATUS_RANK[incoming] ?? -1) > (STATUS_RANK[current] ?? -1) && current !== "FAILED") {
    return incoming;
  }
  if (current === "FAILED" && (STATUS_RANK[incoming] ?? -1) >= STATUS_RANK.SENT) {
    return incoming;
  }
  return current;
}
