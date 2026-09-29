"use client";

import type { ReactNode } from "react";

type ShinyTextProps = {
  children: ReactNode;
  className?: string;
  speed?: number;
};

export default function ShinyText({
  children,
  className = "",
  speed = 3,
}: ShinyTextProps) {
  return (
    <span
      className={`inline-block bg-[linear-gradient(120deg,#3DDC97_0%,#a8f5d0_35%,#F4F7F5_50%,#a8f5d0_65%,#3DDC97_100%)] bg-[length:200%_auto] bg-clip-text text-transparent ${className}`}
      style={{ animation: `shiny-text ${speed}s linear infinite` }}
    >
      {children}
    </span>
  );
}
