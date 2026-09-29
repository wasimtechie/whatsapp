import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ContactImport } from "@/components/app/ContactImport";

export default async function ContactsPage() {
  const user = await getCurrentUser();
  const workspaceId = user?.memberships[0]?.workspaceId;
  const contacts = workspaceId
    ? await prisma.contact.findMany({
        where: { workspaceId },
        orderBy: { updatedAt: "desc" },
        take: 100,
      })
    : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl">
          Customers
        </h1>
        <p className="mt-1 text-sm text-white/55">
          Contacts with consent evidence — required before marketing sends
        </p>
      </div>

      <ContactImport />

      {contacts.length === 0 ? (
        <div className="rounded-lg border border-dashed border-white/15 px-6 py-16 text-center">
          <p className="font-[family-name:var(--font-display)] text-xl">
            No contacts yet
          </p>
          <p className="mt-2 text-sm text-white/55">
            Import a CSV with consent, or wait for the first inbound WhatsApp message.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-white/10">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-white/10 text-xs uppercase text-white/45">
              <tr>
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Consent</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {contacts.map((c) => (
                <tr key={c.id} className="border-b border-white/5">
                  <td className="px-4 py-3 font-mono text-xs">{c.phoneE164}</td>
                  <td className="px-4 py-3">{c.profileName ?? "—"}</td>
                  <td className="px-4 py-3 text-white/65">
                    {c.consentAt
                      ? new Date(c.consentAt).toLocaleDateString("en-IN")
                      : "Missing"}
                  </td>
                  <td className="px-4 py-3">
                    {c.suppressed ? (
                      <span className="text-red-400">Suppressed</span>
                    ) : (
                      <span className="text-[#3DDC97]">Active</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
