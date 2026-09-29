import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { updateConversationState } from "@/app/app/inbox/actions";
import { WhatsAppConversation } from "@/components/app/WhatsAppConversation";

export default async function ConversationPage({
  params,
}: {
  params: Promise<{ conversationId: string }>;
}) {
  const { conversationId } = await params;
  const user = await getCurrentUser();
  const workspaceId = user?.memberships[0]?.workspaceId;
  if (!workspaceId) notFound();

  const conversation = await prisma.conversation.findFirst({
    where: { id: conversationId, workspaceId },
    include: {
      contact: true,
      number: true,
      messages: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!conversation) notFound();

  const [templates, otherConversations] = await Promise.all([
    prisma.template.findMany({
      where: { workspaceId, status: "APPROVED" },
      orderBy: { name: "asc" },
    }),
    prisma.conversation.findMany({
      where: { workspaceId, NOT: { id: conversationId } },
      include: { contact: true },
      orderBy: { lastMessageAt: "desc" },
      take: 20,
    }),
  ]);

  const withinServiceWindow = Boolean(
    conversation.lastCustomerAt &&
      Date.now() - conversation.lastCustomerAt.getTime() < 24 * 60 * 60 * 1000,
  );

  async function setState(state: "OPEN" | "PENDING" | "RESOLVED") {
    "use server";
    await updateConversationState(conversationId, state);
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <Link
        href="/app/inbox"
        className="inline-flex items-center gap-1 bg-[#202c33] px-3 py-2 text-xs text-[#00a884] md:hidden"
      >
        ← Chats
      </Link>
      <div className="min-h-0 flex-1">
        <WhatsAppConversation
          conversationId={conversation.id}
          contact={{
            id: conversation.contact.id,
            profileName: conversation.contact.profileName,
            phoneE164: conversation.contact.phoneE164,
            tags: conversation.contact.tags,
            suppressed: conversation.contact.suppressed,
            source: conversation.contact.source,
          }}
          displayPhone={
            conversation.number.displayPhone ??
            conversation.number.phoneNumberId
          }
          state={conversation.state}
          withinServiceWindow={withinServiceWindow}
          templates={templates.map((t) => ({
            id: t.id,
            name: t.name,
            language: t.language,
            status: t.status,
            category: t.category,
          }))}
          otherConversations={otherConversations.map((c) => ({
            id: c.id,
            label: c.contact.profileName ?? c.contact.phoneE164,
          }))}
          onSetState={setState}
          messages={conversation.messages.map((m) => ({
            id: m.id,
            direction: m.direction,
            status: m.status,
            body: m.body,
            mediaType: m.mediaType,
            mediaRef: m.mediaRef,
            mediaMeta:
              typeof m.mediaMeta === "object" && m.mediaMeta
                ? (m.mediaMeta as Record<string, unknown>)
                : {},
            replyToId: m.replyToId,
            reactions: Array.isArray(m.reactions)
              ? (m.reactions as { emoji: string; by: string }[])
              : [],
            templateName: m.templateName,
            deletedAt: m.deletedAt?.toISOString() ?? null,
            createdAt: m.createdAt.toISOString(),
            errorMessage: m.errorMessage,
          }))}
        />
      </div>
    </div>
  );
}
