"use client";

import { useEffect, useState } from "react";

type Particle = {
  left: string;
  delay: string;
  duration: string;
  size: number;
  opacity: number;
};

function generateParticles(count: number): Particle[] {
  return Array.from({ length: count }).map(() => {
    const left = `${Math.floor(Math.random() * 100)}%`;
    const delay = `${(Math.random() * 10).toFixed(2)}s`;
    const duration = `${(14 + Math.random() * 18).toFixed(2)}s`;
    const size = 3 + Math.floor(Math.random() * 3);
    const opacity = 0.35 + Math.random() * 0.45;

    return { left, delay, duration, size, opacity };
  });
}

export default function AnimatedBackground() {
  const [particles, setParticles] = useState<Particle[]>([]);

  // IMPORTANT: run only on client after hydration
  useEffect(() => {
    setParticles(generateParticles(26));
  }, []);

  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {/* Orbs */}
      <div
        className="absolute -top-56 right-[-260px] h-[520px] w-[520px] rounded-full blur-[90px] opacity-50 animate-[orb_26s_ease-in-out_infinite]"
        style={{ background: "radial-gradient(circle, rgba(124,58,237,.55), transparent 60%)" }}
      />
      <div
        className="absolute -bottom-64 left-[-280px] h-[560px] w-[560px] rounded-full blur-[100px] opacity-45 animate-[orb_28s_ease-in-out_infinite]"
        style={{ background: "radial-gradient(circle, rgba(236,72,153,.45), transparent 60%)" }}
      />
      <div
        className="absolute left-1/2 top-1/2 h-[420px] w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-full blur-[110px] opacity-40 animate-[orb_30s_ease-in-out_infinite]"
        style={{ background: "radial-gradient(circle, rgba(99,102,241,.35), transparent 60%)" }}
      />

      {/* Soft shapes */}
      <div
        className="absolute left-[8%] top-[14%] h-[110px] w-[110px] opacity-20 animate-[shape_16s_ease-in-out_infinite]"
        style={{
          background: "linear-gradient(45deg, var(--re-primary), var(--re-accent))",
          borderRadius: "30% 70% 70% 30% / 30% 30% 70% 70%",
        }}
      />
      <div
        className="absolute right-[12%] bottom-[18%] h-[90px] w-[90px] opacity-20 animate-[shape_18s_ease-in-out_infinite]"
        style={{
          background: "linear-gradient(135deg, var(--re-accent), var(--re-primary))",
          borderRadius: "63% 37% 54% 46% / 55% 48% 52% 45%",
        }}
      />

      {/* Particles (client-only) */}
      {particles.map((p, i) => (
        <span
          key={i}
          className="absolute bottom-[-12px] rounded-full"
          style={{
            left: p.left,
            width: `${p.size}px`,
            height: `${p.size}px`,
            opacity: p.opacity,
            background: "rgba(124,58,237,.7)",
            boxShadow: "0 0 10px rgba(124,58,237,.35)",
            animation: `particle ${p.duration} linear ${p.delay} infinite`,
          }}
        />
      ))}
    </div>
  );
}
