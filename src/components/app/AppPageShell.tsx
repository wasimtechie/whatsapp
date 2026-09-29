import Link from "next/link";

export function AppPageShell({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description?: string;
  action?: { href: string; label: string };
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-3xl">
            {title}
          </h1>
          {description ? (
            <p className="mt-1 text-sm text-white/55">{description}</p>
          ) : null}
        </div>
        {action ? (
          <Link
            href={action.href}
            className="rounded-md bg-[#3DDC97] px-4 py-2 text-sm font-semibold text-[#0B1210] hover:bg-[#5ae5a8]"
          >
            {action.label}
          </Link>
        ) : null}
      </div>
      {children}
    </div>
  );
}

export function EmptyState({
  title,
  body,
  href,
  cta,
}: {
  title: string;
  body: string;
  href?: string;
  cta?: string;
}) {
  return (
    <div className="rounded-lg border border-dashed border-white/15 px-6 py-16 text-center">
      <p className="font-[family-name:var(--font-display)] text-xl">{title}</p>
      <p className="mt-2 text-sm text-white/55">{body}</p>
      {href && cta ? (
        <Link
          href={href}
          className="mt-4 inline-flex text-sm text-[#3DDC97] hover:underline"
        >
          {cta}
        </Link>
      ) : null}
    </div>
  );
}
