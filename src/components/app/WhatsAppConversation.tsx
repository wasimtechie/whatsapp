"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
  type FormEvent,
} from "react";
import {
  Smile,
  Paperclip,
  Mic,
  Image as ImageIcon,
  FileText,
  MapPin,
  UserRound,
  Sticker,
  LayoutTemplate,
  Search,
  MoreVertical,
  Reply,
  Forward,
  Trash2,
  X,
  Check,
  CheckCheck,
  Phone,
  Ban,
  Star,
  SendHorizonal,
} from "lucide-react";
import {
  addInternalNote,
  deleteMessage,
  fetchConversationMessages,
  forwardMessage,
  reactToMessage,
  sendInboxReply,
  sendMediaFile,
  type MediaType,
} from "@/app/app/inbox/actions";

const EMOJIS = [
  "😀",
  "😁",
  "😂",
  "🙂",
  "😉",
  "😍",
  "😘",
  "🙏",
  "👍",
  "👎",
  "❤️",
  "🔥",
  "🎉",
  "👏",
  "✅",
  "❌",
  "😮",
  "😢",
  "😡",
  "🤝",
];

const REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "🙏"];

const STICKERS = ["👋", "🎉", "🔥", "💯", "✨", "🚀", "💚", "🤖"];

export type ChatMessage = {
  id: string;
  direction: "INBOUND" | "OUTBOUND";
  status: string;
  body: string | null;
  mediaType: string;
  mediaRef: string | null;
  mediaMeta: Record<string, unknown>;
  replyToId: string | null;
  reactions: { emoji: string; by: string }[];
  templateName: string | null;
  deletedAt: string | null;
  createdAt: string;
  errorMessage: string | null;
};

export type ChatContact = {
  id: string;
  profileName: string | null;
  phoneE164: string;
  tags: string[];
  suppressed: boolean;
  source: string | null;
};

export type ChatTemplate = {
  id: string;
  name: string;
  language: string;
  status: string;
  category: string | null;
};

type Props = {
  conversationId: string;
  contact: ChatContact;
  displayPhone: string;
  state: string;
  withinServiceWindow: boolean;
  messages: ChatMessage[];
  templates: ChatTemplate[];
  otherConversations: { id: string; label: string }[];
  onSetState: (state: "OPEN" | "PENDING" | "RESOLVED") => Promise<void>;
};

export function WhatsAppConversation(props: Props) {
  const [messages, setMessages] = useState(props.messages);
  const [text, setText] = useState("");
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [search, setSearch] = useState("");
  const [showEmoji, setShowEmoji] = useState(false);
  const [showAttach, setShowAttach] = useState(false);
  const [showStickers, setShowStickers] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showProfile, setShowProfile] = useState(true);
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const [forwardFor, setForwardFor] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const [recordSecs, setRecordSecs] = useState(0);
  const [pending, startTransition] = useTransition();
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [fileAccept, setFileAccept] = useState("image/*");
  const [pendingMediaType, setPendingMediaType] = useState<MediaType>("image");

  useEffect(() => {
    setMessages(props.messages);
  }, [props.messages]);

  useEffect(() => {
    const id = window.setInterval(async () => {
      const latest = await fetchConversationMessages(props.conversationId);
      if (!latest.ok) return;
      setMessages((prev) => {
        const pending = prev.filter((m) => m.id.startsWith("temp_"));
        return pending.length ? [...latest.messages, ...pending] : latest.messages;
      });
    }, 8000);
    return () => window.clearInterval(id);
  }, [props.conversationId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!recording) return;
    setRecordSecs(0);
    const id = setInterval(() => setRecordSecs((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [recording]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return messages;
    return messages.filter((m) => (m.body ?? "").toLowerCase().includes(q));
  }, [messages, search]);

  const messageMap = useMemo(
    () => Object.fromEntries(messages.map((m) => [m.id, m])),
    [messages],
  );

  function optimisticAdd(partial: Partial<ChatMessage> & { body: string }) {
    const temp: ChatMessage = {
      id: `temp_${Date.now()}`,
      direction: "OUTBOUND",
      status: "SENT",
      body: partial.body,
      mediaType: partial.mediaType ?? "text",
      mediaRef: partial.mediaRef ?? null,
      mediaMeta: partial.mediaMeta ?? {},
      replyToId: partial.replyToId ?? replyTo?.id ?? null,
      reactions: [],
      templateName: partial.templateName ?? null,
      deletedAt: null,
      createdAt: new Date().toISOString(),
      errorMessage: null,
    };
    setMessages((m) => [...m, temp]);
    return temp.id;
  }

  function send(payload: {
    body?: string;
    mediaType?: MediaType;
    mediaRef?: string | null;
    mediaMeta?: Record<string, unknown>;
    templateName?: string | null;
  }) {
    if (
      !props.withinServiceWindow &&
      (payload.mediaType ?? "text") !== "template" &&
      (payload.mediaType ?? "text") !== "note"
    ) {
      setError(
        "The 24-hour service window is closed. Send an approved template.",
      );
      return;
    }
    setError(null);
    setNotice(null);
    const replyToId = replyTo?.id ?? null;
    optimisticAdd({
      body: payload.body ?? "",
      mediaType: payload.mediaType ?? "text",
      mediaRef: payload.mediaRef,
      mediaMeta: payload.mediaMeta,
      templateName: payload.templateName,
      replyToId,
    });
    setText("");
    setReplyTo(null);
    setShowEmoji(false);
    setShowAttach(false);
    setShowStickers(false);
    setShowTemplates(false);

    startTransition(async () => {
      const result = await sendInboxReply({
        conversationId: props.conversationId,
        body: payload.body,
        mediaType: payload.mediaType ?? "text",
        mediaRef: payload.mediaRef,
        mediaMeta: payload.mediaMeta,
        replyToId,
        templateName: payload.templateName,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setNotice(
        result.provider === "meta"
          ? "Delivered via WhatsApp Cloud API"
          : "Saved in the inbox. Connect your WhatsApp number in Settings to deliver via the Cloud API.",
      );
    });
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!text.trim() || !props.withinServiceWindow) return;
    send({ body: text, mediaType: "text" });
  }

  function openFilePicker(type: MediaType, accept: string) {
    setPendingMediaType(type);
    setFileAccept(accept);
    setShowAttach(false);
    setTimeout(() => fileRef.current?.click(), 0);
  }

  function onFileChange(file: File | null) {
    if (!file) return;
    const body = new FormData();
    body.set("file", file);
    body.set("conversationId", props.conversationId);
    body.set("mediaType", pendingMediaType);
    setError(null);
    startTransition(async () => {
      const result = await sendMediaFile(body);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      const latest = await fetchConversationMessages(props.conversationId);
      if (latest.ok) setMessages(latest.messages);
      setNotice(
        result.provider === "meta"
          ? "File delivered via WhatsApp Cloud API"
          : "File saved in the inbox. Connect a Cloud API token to deliver it.",
      );
    });
  }

  function stopRecordingAndSend() {
    setRecording(false);
    send({
      body: `Voice message (${recordSecs || 1}s)`,
      mediaType: "audio",
      mediaRef: "demo-audio",
      mediaMeta: { durationSec: recordSecs || 1 },
    });
  }

  async function onReact(messageId: string, emoji: string) {
    setMessages((list) =>
      list.map((m) => {
        if (m.id !== messageId) return m;
        const has = m.reactions.some((r) => r.emoji === emoji && r.by === "me");
        return {
          ...m,
          reactions: has
            ? m.reactions.filter((r) => !(r.emoji === emoji && r.by === "me"))
            : [...m.reactions, { emoji, by: "me" }],
        };
      }),
    );
    setMenuFor(null);
    await reactToMessage(messageId, emoji);
  }

  async function onDelete(messageId: string) {
    setMenuFor(null);
    setMessages((list) =>
      list.map((m) =>
        m.id === messageId
          ? {
              ...m,
              deletedAt: new Date().toISOString(),
              body: "This message was deleted",
              mediaType: "text",
              mediaRef: null,
            }
          : m,
      ),
    );
    await deleteMessage(messageId);
  }

  async function onForward(targetId: string) {
    if (!forwardFor) return;
    const id = forwardFor;
    setForwardFor(null);
    await forwardMessage(id, targetId);
    setNotice("Message forwarded");
  }

  return (
    <div className="flex h-full min-h-0 gap-0">
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden bg-[#0b141a]">
        {/* Chat header */}
        <div className="flex items-center gap-3 border-b border-[#222d34] bg-[#202c33] px-4 py-2.5">
          <button
            type="button"
            onClick={() => setShowProfile((v) => !v)}
            className="flex min-w-0 flex-1 items-center gap-3 text-left"
          >
            <div className="flex size-10 items-center justify-center rounded-full bg-[#6a7175] text-sm font-semibold text-white">
              {(props.contact.profileName ?? props.contact.phoneE164)
                .slice(0, 1)
                .toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="truncate text-[15px] font-medium text-[#e9edef]">
                {props.contact.profileName ?? props.contact.phoneE164}
              </p>
              <p className="truncate text-[12px] text-[#8696a0]">
                {props.contact.phoneE164}
              </p>
            </div>
          </button>
          <div className="relative flex items-center gap-1">
            <button
              type="button"
              className="rounded-full p-2 text-[#aebac1] hover:bg-white/5"
              title="Search chat"
              onClick={() =>
                document.getElementById("chat-search")?.focus()
              }
            >
              <Search className="size-5" />
            </button>
            <button
              type="button"
              className="rounded-full p-2 text-[#aebac1] hover:bg-white/5"
              title="Voice call (demo)"
              onClick={() => setNotice("Voice call UI — demo only")}
            >
              <Phone className="size-5" />
            </button>
          </div>
        </div>

        <div className="border-b border-[#222d34] bg-[#111b21] px-3 py-2">
          <input
            id="chat-search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search in conversation"
            className="w-full rounded-lg bg-[#202c33] px-3 py-1.5 text-xs text-[#e9edef] outline-none placeholder:text-[#8696a0] focus:ring-1 focus:ring-[#00a884]/50"
          />
        </div>

        {/* Messages */}
        <div
          className="flex-1 space-y-1 overflow-y-auto px-4 py-3"
          style={{
            backgroundColor: "#0b141a",
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg width='80' height='80' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 40h80M40 0v80' stroke='%23ffffff' stroke-opacity='0.03'/%3E%3C/svg%3E\")",
          }}
        >
          {filtered.map((m) => {
            const outbound = m.direction === "OUTBOUND" && m.mediaType !== "note";
            const note = m.mediaType === "note";
            const parent = m.replyToId ? messageMap[m.replyToId] : null;
            const deleted = Boolean(m.deletedAt);
            return (
              <div
                key={m.id}
                className={`group flex ${note ? "justify-center" : outbound ? "justify-end" : "justify-start"}`}
              >
                <div className="relative max-w-[78%]">
                  <div
                    className={`rounded-lg px-2.5 py-1.5 text-[14.2px] leading-[19px] shadow-sm ${
                      note
                        ? "bg-[#3a2f14] text-[#ffe7b3]"
                        : outbound
                          ? "rounded-tr-none bg-[#005c4b] text-[#e9edef]"
                          : "rounded-tl-none bg-[#202c33] text-[#e9edef]"
                    }`}
                  >
                    {parent && !deleted && (
                      <div className="mb-1.5 rounded-md border-l-2 border-[#3DDC97] bg-black/20 px-2 py-1 text-[11px] text-white/60">
                        <p className="font-medium text-[#3DDC97]/90">
                          {parent.direction === "OUTBOUND" ? "You" : "Customer"}
                        </p>
                        <p className="truncate">{parent.body}</p>
                      </div>
                    )}
                    {m.mediaMeta?.forwarded ? (
                      <p className="mb-1 text-[10px] uppercase tracking-wide text-white/45">
                        Forwarded
                      </p>
                    ) : null}
                    {!deleted && (
                      <MessageBody
                        mediaType={m.mediaType}
                        body={m.body}
                        mediaRef={m.mediaRef}
                        mediaMeta={m.mediaMeta}
                      />
                    )}
                    {deleted && (
                      <p className="italic text-white/50">{m.body}</p>
                    )}
                    <div className="mt-1 flex items-center justify-end gap-1 text-[10px] text-white/45">
                      <span>
                        {new Date(m.createdAt).toLocaleString("en-IN", {
                          timeZone: "Asia/Kolkata",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                      {outbound && !deleted && (
                        <StatusTicks status={m.status} />
                      )}
                    </div>
                    {m.reactions?.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {Object.entries(
                          m.reactions.reduce<Record<string, number>>(
                            (acc, r) => {
                              acc[r.emoji] = (acc[r.emoji] ?? 0) + 1;
                              return acc;
                            },
                            {},
                          ),
                        ).map(([emoji, count]) => (
                          <span
                            key={emoji}
                            className="rounded-full bg-black/30 px-1.5 text-[11px]"
                          >
                            {emoji}
                            {count > 1 ? ` ${count}` : ""}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {!deleted && (
                    <div
                      className={`absolute top-0 ${outbound ? "-left-8" : "-right-8"} opacity-0 transition-opacity group-hover:opacity-100`}
                    >
                      <button
                        type="button"
                        onClick={() =>
                          setMenuFor((id) => (id === m.id ? null : m.id))
                        }
                        className="rounded-full bg-[#1a2420] p-1 text-white/60 hover:text-white"
                      >
                        <MoreVertical className="size-3.5" />
                      </button>
                    </div>
                  )}

                  {menuFor === m.id && (
                    <div
                      className={`absolute z-20 mt-1 w-40 rounded-lg border border-white/10 bg-[#13201b] py-1 text-xs shadow-xl ${
                        outbound ? "right-0" : "left-0"
                      }`}
                    >
                      <MenuBtn
                        icon={Reply}
                        label="Reply"
                        onClick={() => {
                          setReplyTo(m);
                          setMenuFor(null);
                        }}
                      />
                      <MenuBtn
                        icon={Forward}
                        label="Forward"
                        onClick={() => {
                          setForwardFor(m.id);
                          setMenuFor(null);
                        }}
                      />
                      <div className="flex gap-1 px-2 py-1.5">
                        {REACTIONS.map((e) => (
                          <button
                            key={e}
                            type="button"
                            className="rounded px-1 hover:bg-white/10"
                            onClick={() => onReact(m.id, e)}
                          >
                            {e}
                          </button>
                        ))}
                      </div>
                      {outbound && (
                        <MenuBtn
                          icon={Trash2}
                          label="Delete"
                          onClick={() => onDelete(m.id)}
                        />
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        {/* Reply quote */}
        {replyTo && (
          <div className="flex items-center gap-2 border-t border-[#222d34] bg-[#1d282f] px-3 py-2 text-xs">
            <Reply className="size-3.5 text-[#00a884]" />
            <div className="min-w-0 flex-1 border-l-2 border-[#00a884] pl-2">
              <p className="text-[#00a884]">Replying</p>
              <p className="truncate text-[#8696a0]">{replyTo.body}</p>
            </div>
            <button type="button" onClick={() => setReplyTo(null)}>
              <X className="size-4 text-[#8696a0]" />
            </button>
          </div>
        )}

        {/* Composer tools */}
        <div className="relative border-t border-[#222d34] bg-[#202c33] p-2">
          {!props.withinServiceWindow && (
            <p className="mb-2 px-1 text-[11px] text-amber-300/80">
              The 24-hour window is closed. Free-form replies are blocked. Send an
              approved template.
            </p>
          )}

          {showEmoji && (
            <div className="absolute bottom-full left-2 mb-2 grid max-h-40 w-64 grid-cols-8 gap-1 overflow-y-auto rounded-lg border border-[#222d34] bg-[#233138] p-2 shadow-xl">
              {EMOJIS.map((e) => (
                <button
                  key={e}
                  type="button"
                  className="rounded p-1 text-lg hover:bg-white/10"
                  onClick={() => setText((t) => t + e)}
                >
                  {e}
                </button>
              ))}
            </div>
          )}

          {showStickers && (
            <div className="absolute bottom-full left-2 mb-2 flex gap-2 rounded-lg border border-[#222d34] bg-[#233138] p-2 shadow-xl">
              {STICKERS.map((s) => (
                <button
                  key={s}
                  type="button"
                  className="rounded-lg bg-white/5 px-2 py-1 text-2xl hover:bg-white/10"
                  onClick={() =>
                    send({
                      body: s,
                      mediaType: "sticker",
                      mediaMeta: { sticker: s },
                    })
                  }
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          {showAttach && (
            <div className="absolute bottom-full left-10 mb-2 w-48 rounded-lg border border-[#222d34] bg-[#233138] py-1 text-sm shadow-xl">
              <AttachBtn
                icon={ImageIcon}
                label="Photo / video"
                onClick={() => openFilePicker("image", "image/*,video/*")}
              />
              <AttachBtn
                icon={FileText}
                label="Document"
                onClick={() => openFilePicker("document", "*/*")}
              />
              <AttachBtn
                icon={MapPin}
                label="Location"
                onClick={() =>
                  send({
                    body: "Office — Bengaluru",
                    mediaType: "location",
                    mediaMeta: {
                      name: "beyond impossible HQ",
                      address: "Koramangala, Bengaluru",
                      lat: 12.9352,
                      lng: 77.6245,
                    },
                  })
                }
              />
              <AttachBtn
                icon={UserRound}
                label="Contact"
                onClick={() =>
                  send({
                    body: "Support desk",
                    mediaType: "contact",
                    mediaMeta: {
                      name: "Support desk",
                      phone: "+919876500001",
                    },
                  })
                }
              />
              <AttachBtn
                icon={Sticker}
                label="Sticker"
                onClick={() => {
                  setShowAttach(false);
                  setShowStickers(true);
                }}
              />
              <AttachBtn
                icon={LayoutTemplate}
                label="Template"
                onClick={() => {
                  setShowAttach(false);
                  setShowTemplates(true);
                }}
              />
            </div>
          )}

          {showTemplates && (
            <div className="absolute bottom-full left-2 right-2 mb-2 max-h-48 overflow-y-auto rounded-lg border border-[#222d34] bg-[#233138] p-2 shadow-xl">
              <p className="px-2 pb-1 text-xs text-[#8696a0]">
                Approved templates
              </p>
              {props.templates.length === 0 ? (
                <p className="px-2 py-2 text-xs text-[#8696a0]">
                  No templates — seed or sync from Meta.
                </p>
              ) : (
                props.templates.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    className="flex w-full items-center justify-between rounded-md px-2 py-2 text-left text-sm text-[#e9edef] hover:bg-white/5"
                    onClick={() =>
                      send({
                        body: `Template “${t.name}” sent with sample variables.`,
                        mediaType: "template",
                        templateName: t.name,
                        mediaMeta: {
                          templateName: t.name,
                          language: t.language,
                          category: t.category,
                        },
                      })
                    }
                  >
                    <span>{t.name}</span>
                    <span className="text-[10px] uppercase text-[#00a884]">
                      {t.status}
                    </span>
                  </button>
                ))
              )}
            </div>
          )}

          <form onSubmit={onSubmit} className="flex items-end gap-2">
            <button
              type="button"
              onClick={() => {
                setShowEmoji((v) => !v);
                setShowAttach(false);
                setShowStickers(false);
              }}
              className="rounded-full p-2 text-[#aebac1] hover:bg-white/5"
              title="Emoji"
            >
              <Smile className="size-6" />
            </button>
            <button
              type="button"
              onClick={() => {
                setShowAttach((v) => !v);
                setShowEmoji(false);
                setShowStickers(false);
              }}
              className="rounded-full p-2 text-[#aebac1] hover:bg-white/5"
              title="Attach"
            >
              <Paperclip className="size-6" />
            </button>
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={
                props.withinServiceWindow
                  ? "Type a message"
                  : "Window closed — use a template"
              }
              disabled={pending || recording || !props.withinServiceWindow}
              className="min-w-0 flex-1 rounded-lg bg-[#2a3942] px-4 py-2.5 text-[15px] text-[#e9edef] outline-none placeholder:text-[#8696a0] disabled:opacity-60"
            />
            {text.trim() ? (
              <button
                type="submit"
                disabled={pending}
                className="rounded-full bg-[#00a884] p-2.5 text-[#111b21] hover:bg-[#06cf9c] disabled:opacity-50"
                title="Send"
              >
                <SendHorizonal className="size-5" />
              </button>
            ) : recording ? (
              <button
                type="button"
                onClick={stopRecordingAndSend}
                className="rounded-full bg-red-500/90 px-3 py-2 text-xs font-semibold text-white"
              >
                Send {recordSecs}s
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setRecording(true)}
                className="rounded-full p-2.5 text-[#aebac1] hover:bg-white/5"
                title="Voice message"
              >
                <Mic className="size-6" />
              </button>
            )}
          </form>

          <input
            ref={fileRef}
            type="file"
            accept={fileAccept}
            className="hidden"
            onChange={(e) => onFileChange(e.target.files?.[0] ?? null)}
          />

          {(error || notice) && (
            <p
              className={`mt-2 px-1 text-[11px] ${error ? "text-red-400" : "text-[#00a884]"}`}
            >
              {error ?? notice}
            </p>
          )}
        </div>
      </div>

      {/* Contact / actions panel */}
      {showProfile && (
        <aside className="hidden w-72 shrink-0 flex-col overflow-y-auto border-l border-[#222d34] bg-[#111b21] lg:flex">
          <div className="border-b border-[#222d34] bg-[#202c33] px-4 py-8 text-center">
            <div className="mx-auto flex size-28 items-center justify-center rounded-full bg-[#6a7175] text-4xl font-semibold text-white">
              {(props.contact.profileName ?? "?")[0]?.toUpperCase()}
            </div>
            <p className="mt-4 text-xl text-[#e9edef]">
              {props.contact.profileName ?? "Unknown"}
            </p>
            <p className="text-sm text-[#8696a0]">{props.contact.phoneE164}</p>
            <p className="mt-1 text-[11px] text-[#667781]">
              via {props.displayPhone}
            </p>
          </div>

          <div className="space-y-4 px-4 py-4 text-sm">
            <div>
              <p className="text-xs uppercase tracking-wide text-[#8696a0]">
                Status
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {(["OPEN", "PENDING", "RESOLVED"] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => props.onSetState(s)}
                    className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${
                      props.state === s
                        ? "bg-[#00a884]/20 text-[#00a884]"
                        : "bg-[#2a3942] text-[#8696a0]"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs uppercase tracking-wide text-[#8696a0]">
                Tags
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {props.contact.tags.length ? (
                  props.contact.tags.map((t) => (
                    <span
                      key={t}
                      className="rounded-full bg-[#2a3942] px-2 py-0.5 text-[11px] text-[#e9edef]"
                    >
                      {t}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-[#8696a0]">No tags</span>
                )}
              </div>
            </div>

            <div className="space-y-1">
              <NoteForm
                onSave={async (body) => {
                  const result = await addInternalNote(props.conversationId, body);
                  if (!result.ok) {
                    setError(result.error);
                    return;
                  }
                  const latest = await fetchConversationMessages(props.conversationId);
                  if (latest.ok) setMessages(latest.messages);
                  setNotice("Internal note saved. It was not sent to WhatsApp.");
                }}
              />
              <ActionRow
                icon={Search}
                label="Search chat"
                onClick={() => document.getElementById("chat-search")?.focus()}
              />
              <ActionRow
                icon={Ban}
                label={
                  props.contact.suppressed
                    ? "Contact suppressed"
                    : "Mute / suppress"
                }
                onClick={() =>
                  setNotice(
                    props.contact.suppressed
                      ? "Already suppressed from campaigns"
                      : "Suppression applies from Contacts",
                  )
                }
              />
            </div>

          </div>
        </aside>
      )}

      {/* Forward modal */}
      {forwardFor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-sm rounded-xl border border-white/10 bg-[#13201b] p-4">
            <div className="flex items-center justify-between">
              <p className="font-medium">Forward to…</p>
              <button type="button" onClick={() => setForwardFor(null)}>
                <X className="size-4 text-white/50" />
              </button>
            </div>
            <ul className="mt-3 max-h-60 space-y-1 overflow-y-auto">
              {props.otherConversations.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => onForward(c.id)}
                  className="flex w-full rounded-md px-3 py-2 text-left text-sm hover:bg-white/5"
                >
                  {c.label}
                </button>
              ))}
              {props.otherConversations.length === 0 && (
                <p className="px-2 text-xs text-white/45">
                  No other conversations to forward to.
                </p>
              )}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

function MessageBody({
  mediaType,
  body,
  mediaRef,
  mediaMeta,
}: {
  mediaType: string;
  body: string | null;
  mediaRef: string | null;
  mediaMeta: Record<string, unknown>;
}) {
  if (mediaType === "image" && mediaRef) {
    return (
      <div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={mediaRef}
          alt={String(mediaMeta.fileName ?? "image")}
          className="mb-1 max-h-56 w-full rounded-lg object-cover"
        />
        {body ? <p className="whitespace-pre-wrap">{body}</p> : null}
      </div>
    );
  }
  if (mediaType === "video") {
    return (
      <div>
        {mediaRef ? (
          <video src={mediaRef} controls className="mb-1 max-h-56 w-full rounded-lg" />
        ) : (
          <p>🎬 Video</p>
        )}
        {body ? <p className="whitespace-pre-wrap">{body}</p> : null}
      </div>
    );
  }
  if (mediaType === "audio") {
    return (
      <div className="flex items-center gap-2 py-1">
        <Mic className="size-4 text-[#3DDC97]" />
        <div>
          <p>{body ?? "Voice message"}</p>
          <p className="text-[10px] text-white/45">
            {String(mediaMeta.durationSec ?? "—")}s
          </p>
        </div>
      </div>
    );
  }
  if (mediaType === "document") {
    return (
      <div className="flex items-center gap-2 rounded-md bg-black/20 px-2 py-2">
        <FileText className="size-5 text-[#3DDC97]" />
        <div className="min-w-0">
          <p className="truncate font-medium">
            {String(mediaMeta.fileName ?? "Document")}
          </p>
          <p className="text-[10px] text-white/45">
            {String(mediaMeta.mimeType ?? "file")}
          </p>
        </div>
      </div>
    );
  }
  if (mediaType === "location") {
    return (
      <div className="rounded-md bg-black/20 px-2 py-2">
        <p className="flex items-center gap-1 font-medium">
          <MapPin className="size-3.5 text-[#3DDC97]" />
          {String(mediaMeta.name ?? body ?? "Location")}
        </p>
        <p className="text-[11px] text-white/55">
          {String(mediaMeta.address ?? "")}
        </p>
        <p className="text-[10px] text-white/40">
          {String(mediaMeta.lat)}, {String(mediaMeta.lng)}
        </p>
      </div>
    );
  }
  if (mediaType === "contact") {
    return (
      <div className="flex items-center gap-2 rounded-md bg-black/20 px-2 py-2">
        <UserRound className="size-5 text-[#3DDC97]" />
        <div>
          <p className="font-medium">{String(mediaMeta.name ?? body)}</p>
          <p className="text-[11px] text-white/55">
            {String(mediaMeta.phone ?? "")}
          </p>
        </div>
      </div>
    );
  }
  if (mediaType === "sticker") {
    return (
      <p className="text-4xl leading-none">{String(mediaMeta.sticker ?? body)}</p>
    );
  }
  if (mediaType === "template") {
    return (
      <div className="rounded-md border border-[#3DDC97]/30 bg-black/20 px-2 py-2">
        <p className="text-[10px] uppercase tracking-wide text-[#3DDC97]">
          Template · {String(mediaMeta.templateName ?? "")}
        </p>
        <p className="mt-1 whitespace-pre-wrap">{body}</p>
      </div>
    );
  }
  return <p className="whitespace-pre-wrap">{body}</p>;
}

function StatusTicks({ status }: { status: string }) {
  if (status === "READ") {
    return <CheckCheck className="size-3.5 text-sky-300" />;
  }
  if (status === "DELIVERED" || status === "SENT") {
    return <CheckCheck className="size-3.5 text-white/50" />;
  }
  if (status === "FAILED") {
    return <span className="text-red-300">!</span>;
  }
  return <Check className="size-3.5 text-white/40" />;
}

function MenuBtn({
  icon: Icon,
  label,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-white/75 hover:bg-white/5"
    >
      <Icon className="size-3.5" />
      {label}
    </button>
  );
}

function AttachBtn({
  icon: Icon,
  label,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-2 px-3 py-2 text-left text-[#e9edef] hover:bg-white/5"
    >
      <Icon className="size-4 text-[#00a884]" />
      {label}
    </button>
  );
}

function NoteForm({ onSave }: { onSave: (body: string) => Promise<void> }) {
  const [note, setNote] = useState("");
  const [pending, startTransition] = useTransition();
  return (
    <form
      className="mb-3 space-y-2"
      onSubmit={(e) => {
        e.preventDefault();
        const body = note.trim();
        if (!body) return;
        startTransition(async () => {
          await onSave(body);
          setNote("");
        });
      }}
    >
      <p className="text-xs uppercase tracking-wide text-[#8696a0]">Internal note</p>
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={2}
        placeholder="Visible to your team only"
        className="w-full rounded-md border border-white/10 bg-black/20 px-2 py-1.5 text-xs text-[#e9edef] outline-none"
      />
      <button
        type="submit"
        disabled={pending || !note.trim()}
        className="rounded-md bg-[#3a2f14] px-3 py-1 text-xs text-[#ffe7b3] disabled:opacity-50"
      >
        Save note
      </button>
    </form>
  );
}

function ActionRow({
  icon: Icon,
  label,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-xs text-white/70 hover:bg-white/5"
    >
      <Icon className="size-3.5 text-white/45" />
      {label}
    </button>
  );
}
