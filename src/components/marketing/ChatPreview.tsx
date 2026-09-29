"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";

const script = [
  {
    side: "in" as const,
    text: "Hi! Looking for pricing on WhatsApp automation.",
  },
  {
    side: "out" as const,
    text: "Happy to help — how many conversations do you handle monthly?",
  },
  {
    side: "in" as const,
    text: "Around 2,000. Mostly sales inquiries.",
  },
  {
    side: "out" as const,
    text: "Perfect. I can qualify leads 24/7 and hand hot ones to your team instantly.",
  },
];

export default function ChatPreview() {
  const [visible, setVisible] = useState(0);
  const [typing, setTyping] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let timeoutId = 0;

    const run = async () => {
      while (!cancelled) {
        setVisible(0);
        setTyping(false);
        await wait(600);
        if (cancelled) return;

        for (let i = 0; i < script.length; i++) {
          if (cancelled) return;
          setTyping(true);
          await wait(700);
          if (cancelled) return;
          setTyping(false);
          setVisible(i + 1);
          await wait(1400);
        }

        await wait(2200);
      }
    };

    function wait(ms: number) {
      return new Promise<void>((resolve) => {
        timeoutId = window.setTimeout(resolve, ms);
      });
    }

    void run();

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, []);

  return (
    <div className="relative mx-auto w-full max-w-md">
      <div className="absolute -inset-4 rounded-[2rem] bg-[#3DDC97]/10 blur-2xl" />
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#111b21] shadow-[0_30px_80px_rgba(0,0,0,0.45)]">
        <div className="flex items-center gap-3 border-b border-white/5 bg-[#202c33] px-4 py-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#3DDC97]/25 text-sm font-semibold text-[#3DDC97]">
            AI
          </div>
          <div>
            <p className="text-sm font-medium text-[#e9edef]">beyond impossible</p>
            <p className="text-xs text-[#3DDC97]">online · auto-replying</p>
          </div>
        </div>

        <div
          className="relative flex min-h-[340px] flex-col gap-2 px-3 py-4"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 20%, rgba(61,220,151,0.04), transparent 40%), radial-gradient(circle at 80% 80%, rgba(0,0,0,0.35), transparent 45%)",
            backgroundColor: "#0b141a",
          }}
        >
          <AnimatePresence>
            {script.slice(0, visible).map((msg, i) => (
              <motion.div
                key={`${msg.text}-${i}`}
                initial={{ opacity: 0, y: 12, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ type: "spring", stiffness: 320, damping: 24 }}
                className={`max-w-[82%] rounded-lg px-3 py-2 text-[13px] leading-relaxed ${
                  msg.side === "out"
                    ? "ml-auto rounded-tr-sm bg-[#005c4b] text-[#e9edef]"
                    : "mr-auto rounded-tl-sm bg-[#202c33] text-[#e9edef]"
                }`}
              >
                {msg.text}
                <span className="mt-1 block text-right text-[10px] text-white/35">
                  {msg.side === "out" ? "✓✓ " : ""}
                  just now
                </span>
              </motion.div>
            ))}
          </AnimatePresence>

          {typing && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mr-auto flex w-fit items-center gap-1 rounded-lg rounded-tl-sm bg-[#202c33] px-3 py-2.5"
            >
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-white/50 [animation-delay:0ms]" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-white/50 [animation-delay:120ms]" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-white/50 [animation-delay:240ms]" />
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
