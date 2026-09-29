"use client";

import {
  useRef,
  useState,
  type MouseEvent,
  type ReactNode,
} from "react";

type TiltCardProps = {
  children: ReactNode;
  className?: string;
  maxTilt?: number;
};

export default function TiltCard({
  children,
  className = "",
  maxTilt = 8,
}: TiltCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [transform, setTransform] = useState(
    "perspective(900px) rotateX(0deg) rotateY(0deg) scale3d(1,1,1)",
  );

  const onMove = (e: MouseEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const rect = el.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    const rotateY = (x - 0.5) * maxTilt * 2;
    const rotateX = (0.5 - y) * maxTilt * 2;
    setTransform(
      `perspective(900px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02,1.02,1.02)`,
    );
  };

  const onLeave = () => {
    setTransform(
      "perspective(900px) rotateX(0deg) rotateY(0deg) scale3d(1,1,1)",
    );
  };

  return (
    <div
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      className={`will-change-transform transition-transform duration-200 ease-out ${className}`}
      style={{ transform }}
    >
      {children}
    </div>
  );
}
