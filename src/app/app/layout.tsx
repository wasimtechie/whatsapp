import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { AppSidebar, MobileAppNav } from "@/components/app/AppSidebar";
import { isPlatformAdmin } from "@/lib/platform-admin";

async function logoutAction() {
  "use server";
  const { destroySession } = await import("@/lib/auth");
  await destroySession();
  redirect("/login");
}

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const workspace = user.memberships[0]?.workspace;

  return (
    <div className="flex min-h-screen bg-[#0B1210] text-[#F4F7F5]">
      <AppSidebar
        workspaceName={workspace?.name ?? "Workspace"}
        onLogout={logoutAction}
        showAdmin={await isPlatformAdmin()}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-white/10 px-4 py-3 md:px-8">
          <p className="text-sm text-white/65">
            Signed in as <span className="text-[#F4F7F5]">{user.email}</span>
          </p>
          <Link
            href="/app/settings"
            className="text-xs text-[#3DDC97] hover:underline md:hidden"
          >
            Settings
          </Link>
        </header>
        <MobileAppNav />
        <main className="flex-1 px-4 py-6 md:px-8">{children}</main>
      </div>
    </div>
  );
}
