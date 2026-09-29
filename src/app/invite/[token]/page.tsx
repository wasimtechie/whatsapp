import Link from "next/link";
import { redirect } from "next/navigation";
import { acceptInvite } from "@/app/app/team/actions";

export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const result = await acceptInvite(token);

  if (result.ok) redirect("/app");

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0B1210] px-6 text-[#F4F7F5]">
      <div className="max-w-md space-y-4 text-center">
        <h1 className="font-[family-name:var(--font-display)] text-3xl">Invite</h1>
        <p className="text-sm text-white/65">{result.error}</p>
        <Link href="/login" className="text-sm text-[#3DDC97] hover:underline">
          Sign in
        </Link>
      </div>
    </div>
  );
}
