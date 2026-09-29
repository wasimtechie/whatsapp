"use client";

import { useMemo, useState } from "react";
import { createBroadcast } from "@/app/app/broadcasts/actions";

export type ComposerTemplate = {
  id: string;
  name: string;
  language: string;
  category: string | null;
  body: string;
  placeholders: number[];
};

export function BroadcastComposer({
  templates,
  tags,
  initialTemplateId,
}: {
  templates: ComposerTemplate[];
  tags: string[];
  initialTemplateId?: string;
}) {
  const [templateId, setTemplateId] = useState(
    initialTemplateId && templates.some((t) => t.id === initialTemplateId)
      ? initialTemplateId
      : (templates[0]?.id ?? ""),
  );
  const selected = useMemo(
    () => templates.find((t) => t.id === templateId) ?? templates[0],
    [templateId, templates],
  );

  if (!selected) {
    return (
      <p className="text-sm text-white/55">
        No approved templates yet. Add one in Meta, then sync it into this workspace.
      </p>
    );
  }

  return (
    <form action={createBroadcast} className="space-y-4">
      <label className="block text-sm">
        <span className="text-white/55">Campaign name</span>
        <input
          name="name"
          required
          placeholder="Weekend offer"
          className="mt-1 w-full rounded-md border border-white/15 bg-white/5 px-3 py-2 outline-none focus:border-[#3DDC97]"
        />
      </label>

      <label className="block text-sm">
        <span className="text-white/55">Approved template</span>
        <select
          name="templateId"
          value={templateId}
          onChange={(e) => setTemplateId(e.target.value)}
          className="mt-1 w-full rounded-md border border-white/15 bg-[#0B1210] px-3 py-2"
        >
          {templates.map((template) => (
            <option key={template.id} value={template.id}>
              {template.name} · {template.language} · {template.category ?? "MARKETING"}
            </option>
          ))}
        </select>
      </label>

      <p className="rounded-md border border-white/10 bg-black/20 px-3 py-2 text-sm text-white/70">
        {selected.body || "This template has no body text."}
      </p>

      <label className="block text-sm">
        <span className="text-white/55">Audience tag</span>
        <select
          name="tag"
          className="mt-1 w-full rounded-md border border-white/15 bg-[#0B1210] px-3 py-2"
          defaultValue=""
        >
          <option value="">All contacts</option>
          {tags.map((tag) => (
            <option key={tag} value={tag}>
              {tag}
            </option>
          ))}
        </select>
      </label>

      {selected.placeholders.map((index) => (
        <label key={index} className="block text-sm">
          <span className="text-white/55">Variable {`{{${index}}}`}</span>
          <input
            name={`var_${index}`}
            required
            placeholder={index === 1 ? "{{name}}" : "Offer code"}
            defaultValue={index === 1 ? "{{name}}" : ""}
            className="mt-1 w-full rounded-md border border-white/15 bg-white/5 px-3 py-2 outline-none focus:border-[#3DDC97]"
          />
        </label>
      ))}
      <p className="text-xs text-white/40">
        Use {"{{name}}"} or {"{{phone}}"} to fill each contact. Suppressed contacts and anyone without consent or the template&apos;s category permission are excluded before send.
      </p>

      <label className="block text-sm">
        <span className="text-white/55">Schedule (IST, optional)</span>
        <input
          type="datetime-local"
          name="scheduledAt"
          className="mt-1 w-full rounded-md border border-white/15 bg-white/5 px-3 py-2 outline-none focus:border-[#3DDC97]"
        />
      </label>

      <button
        type="submit"
        className="rounded-md bg-[#3DDC97] px-4 py-2 text-sm font-semibold text-[#0B1210]"
      >
        Save audience check
      </button>
    </form>
  );
}
