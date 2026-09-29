"use client";

type AreaSparkProps = {
  data: number[];
  className?: string;
};

export function AreaSpark({ data, className = "" }: AreaSparkProps) {
  const w = 120;
  const h = 44;
  const pad = 2;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = Math.max(max - min, 1);

  const coords = data.map((v, i) => {
    const x = pad + (i / Math.max(data.length - 1, 1)) * (w - pad * 2);
    const y = h - pad - ((v - min) / range) * (h - pad * 2);
    return { x, y };
  });

  const line = coords.map((c, i) => `${i === 0 ? "M" : "L"}${c.x},${c.y}`).join(" ");
  const area = `${line} L${coords[coords.length - 1]?.x ?? w},${h} L${coords[0]?.x ?? 0},${h} Z`;

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      className={`h-11 w-[7.5rem] ${className}`}
      aria-hidden
    >
      <defs>
        <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3DDC97" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#3DDC97" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#areaFill)" />
      <path
        d={line}
        fill="none"
        stroke="#3DDC97"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {coords.length > 0 && (
        <circle
          cx={coords[coords.length - 1].x}
          cy={coords[coords.length - 1].y}
          r="2.5"
          fill="#3DDC97"
        />
      )}
    </svg>
  );
}

type BarSparkProps = {
  data: number[];
  className?: string;
};

export function BarSpark({ data, className = "" }: BarSparkProps) {
  const w = 120;
  const h = 44;
  const gap = 3;
  const max = Math.max(...data, 1);
  const barW = (w - gap * (data.length - 1)) / data.length;

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      className={`h-11 w-[7.5rem] ${className}`}
      aria-hidden
    >
      {data.map((v, i) => {
        const bh = Math.max((v / max) * (h - 4), 3);
        const x = i * (barW + gap);
        const y = h - bh;
        const hot = i === data.length - 1;
        return (
          <rect
            key={i}
            x={x}
            y={y}
            width={barW}
            height={bh}
            rx="2"
            fill={hot ? "#3DDC97" : "rgba(61, 220, 151, 0.35)"}
          />
        );
      })}
    </svg>
  );
}

type DonutSparkProps = {
  value: number;
  total: number;
  className?: string;
};

export function DonutSpark({ value, total, className = "" }: DonutSparkProps) {
  const size = 48;
  const stroke = 5;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = total > 0 ? Math.min(value / total, 1) : 0;
  const dash = pct * c;

  return (
    <div className={`relative ${className}`}>
      <svg viewBox={`0 0 ${size} ${size}`} className="h-12 w-12" aria-hidden>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="#3DDC97"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${c - dash}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-[10px] font-semibold text-[#3DDC97]">
        {total > 0 ? `${Math.round(pct * 100)}%` : "0%"}
      </span>
    </div>
  );
}

type ColumnSparkProps = {
  segments: { label: string; value: number; color: string }[];
  className?: string;
};

export function ColumnSpark({ segments, className = "" }: ColumnSparkProps) {
  const max = Math.max(...segments.map((s) => s.value), 1);
  const h = 44;

  return (
    <div className={`flex h-11 items-end gap-1.5 ${className}`} aria-hidden>
      {segments.map((s) => {
        const bh = Math.max((s.value / max) * h, s.value > 0 ? 6 : 2);
        return (
          <div key={s.label} className="flex flex-col items-center gap-1">
            <div
              className="w-3.5 rounded-sm"
              style={{ height: bh, backgroundColor: s.color }}
              title={`${s.label}: ${s.value}`}
            />
          </div>
        );
      })}
    </div>
  );
}
