"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

interface FadeContentProps {
  children: ReactNode;
  blur?: boolean;
  duration?: number;
  ease?: string;
  delay?: number;
  threshold?: number;
  initialOpacity?: number;
  className?: string;
}

export default function FadeContent({
  children,
  blur = false,
  duration = 1,
  ease = "power2.out",
  delay = 0,
  threshold = 0.1,
  initialOpacity = 0,
  className = "",
}: FadeContentProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    setReduced(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el || reduced) return;

    const startPct = (1 - threshold) * 100;
    gsap.set(el, {
      autoAlpha: initialOpacity,
      filter: blur ? "blur(10px)" : "blur(0px)",
      willChange: "opacity, filter, transform",
    });

    const tl = gsap.timeline({ paused: true, delay });
    tl.to(el, {
      autoAlpha: 1,
      filter: "blur(0px)",
      duration,
      ease,
    });

    const st = ScrollTrigger.create({
      trigger: el,
      start: `top ${startPct}%`,
      once: true,
      onEnter: () => tl.play(),
    });

    return () => {
      st.kill();
      tl.kill();
      gsap.killTweensOf(el);
    };
  }, [blur, duration, ease, delay, threshold, initialOpacity, reduced]);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
