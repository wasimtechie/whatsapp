"use client";

import { useState, useTransition } from "react";

export function NewApiKey({
  action,
}: {
  action: (formData: FormData) => Promise<string>;
}) {
  const [key, setKey] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="flex flex-wrap items-end gap-3"
      action={(formData) => {
        startTransition(async () => {
          const created = await action(formData);
          setKey(created);
        });
      }}
    >
      <label className="text-sm">
        <span className="text-white/55">Name</span>
        <input
          name="name"
          placeholder="Production"
          className="mt-1 block rounded-md border border-white/15 bg-transparent px-3 py-2"
        />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-[#3DDC97] px-4 py-2 text-sm font-semibold text-[#0B1210]"
      >
        Create key
      </button>
      {key ? (
        <p className="w-full break-all rounded-md border border-[#3DDC97]/30 bg-[#3DDC97]/10 px-3 py-2 font-mono text-xs text-[#3DDC97]">
          Copy this key now. It will not be shown again: {key}
        </p>
      ) : null}
    </form>
  );
}
