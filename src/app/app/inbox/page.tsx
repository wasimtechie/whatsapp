export default function InboxIndexPage() {
  return (
    <div className="relative hidden h-full flex-1 flex-col items-center justify-center bg-[#222e35] md:flex">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
        }}
      />
      <div className="relative z-10 max-w-sm px-6 text-center">
        <div className="mx-auto mb-6 flex size-20 items-center justify-center rounded-full bg-[#00a884]/15 text-4xl">
          💬
        </div>
        <h2 className="text-2xl font-light text-[#e9edef]">beyond impossible</h2>
        <p className="mt-3 text-sm leading-relaxed text-[#8696a0]">
          Select a chat from the left to read messages and reply — just like
          WhatsApp Web.
        </p>
        <div className="mx-auto mt-8 h-px w-40 bg-[#00a884]/40" />
        <p className="mt-4 text-xs text-[#667781]">
          Official Cloud API ready · Demo replies work without Meta
        </p>
      </div>
    </div>
  );
}
