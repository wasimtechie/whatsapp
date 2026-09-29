"use client";

import {
  useRef,
  useState,
  type MouseEvent,
  type ReactNode,
} from "react";

type SpotlightCardProps = {
  children: ReactNode;
  className?: string;
  spotlightColor?: string;
};

export default function SpotlightCard({
  children,
  className = "",
  spotlightColor = "rgba(61, 220, 151, 0.18)",
}: SpotlightCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [active, setActive] = useState(false);

  const onMove = (e: MouseEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  return (
    <div
      ref={ref}
      onMouseMove={onMove}
      onMouseEnter={() => setActive(true)}
      onMouseLeave={() => setActive(false)}
      className={`relative overflow-hidden rounded-2xl border border-white/10 bg-[#121a17]/80 backdrop-blur-sm transition-colors duration-300 hover:border-[#3DDC97]/35 ${className}`}
    >
      <div
        className="pointer-events-none absolute inset-0 transition-opacity duration-300"
        style={{
          opacity: active ? 1 : 0,
          background: `radial-gradient(420px circle at ${pos.x}px ${pos.y}px, ${spotlightColor}, transparent 55%)`,
        }}
      />
      <div className="relative z-10">{children}</div>
    </div>
  );
}
