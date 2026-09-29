"use client";

import { useState, useTransition } from "react";
import {
  commitContactImport,
  previewContactImport,
  type ImportPreview,
} from "@/app/app/contacts/actions";

const SAMPLE = `phone,name,tags,consent,permissions
+919800000001,Asha Rao,lead,yes,marketing
+919800000002,Dev Patel,customer,no,utility`;

export function ContactImport() {
  const [csv, setCsv] = useState(SAMPLE);
  const [rows, setRows] = useState<ImportPreview[] | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <section className="space-y-3 rounded-lg border border-white/10 bg-white/[0.02] p-5">
      <h2 className="font-[family-name:var(--font-display)] text-lg">Import CSV</h2>
      <p className="text-sm text-white/55">
        Columns: phone, name, tags, consent, permissions. Rows without consent or a valid +E.164 number are skipped.
      </p>
      <textarea
        value={csv}
        onChange={(e) => setCsv(e.target.value)}
        rows={6}
        className="w-full rounded-md border border-white/15 bg-transparent px-3 py-2 font-mono text-xs outline-none focus:border-[#3DDC97]"
      />
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            setError(null);
            startTransition(async () => {
              const result = await previewContactImport(csv);
              if (!result.ok) {
                setError(result.error);
                return;
              }
              setRows(result.rows);
            });
          }}
          className="rounded-md border border-white/15 px-4 py-2 text-sm"
        >
          Preview
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            setError(null);
            startTransition(async () => {
              const result = await commitContactImport(csv);
              if (!result.ok) {
                setError(result.error);
                return;
              }
              setNotice(
                `Imported ${result.created} new, updated ${result.updated}, skipped ${result.skipped}.`,
              );
              const preview = await previewContactImport(csv);
              if (preview.ok) setRows(preview.rows);
            });
          }}
          className="rounded-md bg-[#3DDC97] px-4 py-2 text-sm font-semibold text-[#0B1210]"
        >
          Import consented rows
        </button>
      </div>
      {error ? <p className="text-sm text-red-300">{error}</p> : null}
      {notice ? <p className="text-sm text-[#3DDC97]">{notice}</p> : null}
      {rows ? (
        <div className="overflow-x-auto rounded-lg border border-white/10">
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase text-white/45">
              <tr>
                <th className="px-3 py-2">Phone</th>
                <th className="px-3 py-2">Name</th>
                <th className="px-3 py-2">Check</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={`${row.phone}-${i}`} className="border-t border-white/5">
                  <td className="px-3 py-2 font-mono text-xs">{row.phone || "—"}</td>
                  <td className="px-3 py-2">{row.name || "—"}</td>
                  <td className="px-3 py-2">
                    {row.issue ? (
                      <span className="text-red-300">{row.issue}</span>
                    ) : (
                      <span className="text-[#3DDC97]">Ready</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
}
