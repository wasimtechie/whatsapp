"use client";

import type { ReactNode } from "react";

type MarqueeProps = {
  items: ReactNode[];
  className?: string;
  speed?: number;
};

export default function Marquee({
  items,
  className = "",
  speed = 35,
}: MarqueeProps) {
  const track = [...items, ...items];

  return (
    <div
      className={`group relative overflow-hidden ${className}`}
      style={{
        maskImage:
          "linear-gradient(to right, transparent, black 8%, black 92%, transparent)",
        WebkitMaskImage:
          "linear-gradient(to right, transparent, black 8%, black 92%, transparent)",
      }}
    >
      <div
        className="flex w-max gap-10 group-hover:[animation-play-state:paused]"
        style={{ animation: `marquee ${speed}s linear infinite` }}
      >
        {track.map((item, i) => (
          <div
            key={i}
            className="flex shrink-0 items-center gap-3 whitespace-nowrap text-sm text-white/55"
          >
            {item}
          </div>
        ))}
      </div>
    </div>
  );
}
