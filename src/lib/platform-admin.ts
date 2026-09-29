import { getCurrentUser } from "@/lib/auth";

export async function isPlatformAdmin() {
  const user = await getCurrentUser();
  if (!user) return false;
  if (user.memberships.some((membership) => membership.role === "PLATFORM_ADMIN")) {
    return true;
  }
  const allow = (process.env.PLATFORM_ADMIN_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
  return allow.includes(user.email.toLowerCase());
}
