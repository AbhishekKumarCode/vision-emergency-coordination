import { useEffect, useState } from "react";
import { Icon } from "./ui.jsx";

// Short opening animation shown each time the dashboard is opened.
export default function Intro() {
  const reduced = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const [phase, setPhase] = useState(reduced ? "gone" : "show");
  useEffect(() => {
    if (phase === "gone") return;
    const a = setTimeout(() => setPhase("out"), 1700), b = setTimeout(() => setPhase("gone"), 2150);
    return () => { clearTimeout(a); clearTimeout(b); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  if (phase === "gone") return null;
  return (
    <div className={"fixed inset-0 z-[100] bg-white flex flex-col items-center justify-center transition-opacity duration-[450ms] " + (phase === "out" ? "opacity-0 pointer-events-none" : "opacity-100")} role="status" aria-label="Opening VISION">
      <div className="intro-mark w-16 h-16 rounded-2xl bg-brand text-white flex items-center justify-center"><Icon name="emergency" className="!text-[36px]" /></div>
      <div className="intro-rise mt-5 text-[32px] font-semibold tracking-tight leading-none">VISION</div>
      <div className="intro-rise lbl mt-2" style={{ animationDelay: ".15s" }}>Emergency Coordination</div>
      <svg viewBox="0 0 320 60" className="w-[300px] max-w-[80vw] mt-6" aria-hidden="true">
        <path d="M0 30 H96 L108 30 L116 12 L128 50 L138 4 L150 44 L158 30 H200 L208 22 L216 36 L222 30 H320" fill="none" stroke="#FFDAD6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        <path className="intro-ecg" d="M0 30 H96 L108 30 L116 12 L128 50 L138 4 L150 44 L158 30 H200 L208 22 L216 36 L222 30 H320" fill="none" stroke="#D92D20" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" pathLength="1" />
      </svg>
      <div className="intro-rise mt-4 text-muted" style={{ animationDelay: ".3s" }}>Connecting ambulances, hospitals and dispatch</div>
    </div>
  );
}
