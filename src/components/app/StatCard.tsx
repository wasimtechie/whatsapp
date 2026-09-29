"use client";

import {
  AreaSpark,
  BarSpark,
  ColumnSpark,
  DonutSpark,
} from "@/components/app/MiniCharts";

export type StatChart =
  | { type: "area"; data: number[] }
  | { type: "bars"; data: number[] }
  | { type: "donut"; value: number; total: number }
  | {
      type: "columns";
      segments: { label: string; value: number; color: string }[];
    };

export function StatCard({
  label,
  value,
  chart,
  hint,
}: {
  label: string;
  value: number;
  chart: StatChart;
  hint?: string;
}) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.02] p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-wide text-white/45">
            {label}
          </p>
          <p className="mt-1 font-[family-name:var(--font-display)] text-3xl text-[#3DDC97]">
            {value}
          </p>
          {hint ? (
            <p className="mt-1 text-[11px] text-white/40">{hint}</p>
          ) : null}
        </div>
        <div className="shrink-0 pt-1">
          {chart.type === "area" && <AreaSpark data={chart.data} />}
          {chart.type === "bars" && <BarSpark data={chart.data} />}
          {chart.type === "donut" && (
            <DonutSpark value={chart.value} total={chart.total} />
          )}
          {chart.type === "columns" && (
            <ColumnSpark segments={chart.segments} />
          )}
        </div>
      </div>
    </div>
  );
}
