"use client";

export default function FloatingOrbs() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <div className="absolute -left-24 top-1/4 h-72 w-72 rounded-full bg-[#3DDC97]/15 blur-[90px] animate-[orb-drift_14s_ease-in-out_infinite]" />
      <div className="absolute -right-16 top-1/3 h-80 w-80 rounded-full bg-[#1a9b6a]/20 blur-[100px] animate-[orb-drift_18s_ease-in-out_infinite_reverse]" />
      <div className="absolute bottom-10 left-1/3 h-56 w-56 rounded-full bg-[#3DDC97]/10 blur-[80px] animate-[orb-drift_12s_ease-in-out_infinite]" />
    </div>
  );
}
