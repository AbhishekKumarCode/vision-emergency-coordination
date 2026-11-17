import { Link } from "react-router-dom";
import { useStore } from "../store.jsx";
import { Icon } from "../components/ui.jsx";
import CityMap from "../components/CityMap.jsx";

const STEPS = [
  ["sos", "A patient sends an SOS", "Location, how serious it is and what happened. It takes a few taps."],
  ["psychology", "VISION suggests a plan", "The nearest free ambulance and the best hospital, with the reasons shown."],
  ["how_to_reg", "A dispatcher approves", "One click. A person always makes the final decision."],
  ["route", "Everyone sees it live", "The ambulance moves, a bed is reserved, and the hospital knows who is coming."]
];
const FEATURES = [
  ["e911_emergency", "Emergency queue", "Every SOS in one list, sorted by urgency and waiting time."],
  ["ambulance", "Ambulance fleet", "Live position, status and route for every unit."],
  ["bed", "Bed capacity", "Free, reserved and occupied beds at every hospital."],
  ["inventory_2", "Critical supplies", "Oxygen, blood, ventilators and medicines, with shortage alerts."],
  ["swap_horiz", "Patient transfers", "Move patients from a full hospital to one with space."],
  ["timer", "Walk-in time rule", "A reserved bed is protected by a clear, time-based rule when a walk-in arrives."],
  ["monitoring", "6-hour forecast", "See which hospitals are likely to run out of ICU beds."],
  ["edit_note", "Hospital updates", "Staff update beds and stock; dispatch sees it immediately."]
];
const ROLES = [
  ["person", "Patients", "Send an SOS and follow the ambulance.", "/patient", "Open patient app"],
  ["support_agent", "Dispatchers", "See everything and approve the plan.", "/overview", "Open dashboard"],
  ["local_hospital", "Hospital staff", "Keep beds and supplies up to date.", "/staff", "Open staff page"],
  ["admin_panel_settings", "Administrators", "Watch capacity, supplies and forecasts.", "/insights", "Open AI insights"]
];

const go = id => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });

export default function Landing() {
  const { st } = useStore();
  const n = v => (st ? v : "-");
  const waiting = st ? st.emergencies.filter(e => e.status === "waiting").length : 0;
  const free = st ? st.ambulances.filter(a => a.status === "available").length : 0;
  const icu = st ? st.hospitals.reduce((s, h) => s + h.icuFree, 0) : 0;
  return (
    <div className="min-h-screen bg-white">
      <header className="sticky top-0 z-30 bg-white/95 border-b border-line">
        <div className="max-w-6xl mx-auto h-16 px-4 flex items-center justify-between gap-4">
          <button onClick={() => go("top")} className="flex items-center gap-3"><span className="w-8 h-8 rounded-lg bg-brand text-white flex items-center justify-center"><Icon name="emergency" /></span><span className="text-[18px] font-semibold tracking-tight">VISION</span></button>
          <nav className="hidden md:flex items-center gap-7 text-muted"><button className="hover:text-ink" onClick={() => go("how")}>How it works</button><button className="hover:text-ink" onClick={() => go("features")}>Features</button><button className="hover:text-ink" onClick={() => go("roles")}>Who it is for</button></nav>
          <Link to="/overview" className="btn btn-red btn-sm !h-10">Open dashboard<Icon name="arrow_forward" className="!text-[18px]" /></Link>
        </div>
      </header>

      <section id="top" className="max-w-6xl mx-auto px-4 pt-12 pb-14 lg:pt-20 lg:pb-20 grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
        <div className="land-rise">
          <span className="lbl inline-flex items-center gap-2 border border-line rounded-full px-3 py-1"><span className="w-2 h-2 rounded-full bg-brand" />Emergency healthcare coordination</span>
          <h1 className="mt-5 text-[40px] leading-[1.08] sm:text-[52px] font-semibold tracking-tight">The right ambulance, to the right hospital, <span className="text-brand">in seconds.</span></h1>
          <p className="mt-5 text-[18px] leading-7 text-muted max-w-xl">VISION connects patients, ambulances, hospitals and administrators during a crisis. It suggests where help should go and which hospital has space. A person approves every decision.</p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link to="/overview" className="btn btn-red !h-12 !px-6 !text-[15px]">Open the dashboard<Icon name="arrow_forward" /></Link>
            <Link to="/patient" className="btn btn-line !h-12 !px-6 !text-[15px]"><Icon name="sos" />Send an SOS</Link>
          </div>
          <svg viewBox="0 0 320 40" className="w-[260px] mt-8" aria-hidden="true"><path className="land-ecg" d="M0 20 H96 L108 20 L116 6 L128 34 L138 2 L150 30 L158 20 H200 L208 14 L216 26 L222 20 H320" fill="none" stroke="#D92D20" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" pathLength="1" /></svg>
        </div>
        <div className="land-rise card overflow-hidden" style={{ animationDelay: ".12s" }}>
          <div className="px-4 py-3 border-b border-line flex items-center justify-between"><span className="font-semibold flex items-center gap-2"><span className={"w-2 h-2 rounded-full " + (st ? "bg-ok" : "bg-warn")} />Live network</span><span className="font-mono text-[11px] text-[#92400E] bg-[#FEF3C7] rounded px-2 py-0.5">Demo data</span></div>
          {st ? <CityMap labels={false} /> : <div className="bg-[#EEF2F6]" style={{ aspectRatio: "100 / 60" }} />}
          <div className="grid grid-cols-3 divide-x divide-line border-t border-line">
            {[["Waiting for help", waiting], ["Ambulances free", free], ["ICU beds free", icu]].map(([l, v]) => <div key={l} className="p-4"><div className="text-[28px] leading-8 font-semibold">{n(v)}</div><div className="text-[13px] text-muted">{l}</div></div>)}
          </div>
        </div>
      </section>

      <section className="border-y border-line bg-page">
        <div className="max-w-6xl mx-auto px-4 py-12 grid grid-cols-1 md:grid-cols-3 gap-6">
          {[["visibility_off", "Nobody sees the whole picture", "Beds, ambulances and supplies are tracked in separate places."], ["wrong_location", "Ambulances reach full hospitals", "Patients are turned away and lose time on the road."], ["hourglass_bottom", "Decisions are made under pressure", "Dispatchers choose with scattered, out-of-date information."]].map(([ic, t, d]) => (
            <div key={t}><Icon name={ic} className="text-brand !text-[26px]" /><h3 className="mt-2 text-[18px] font-semibold">{t}</h3><p className="text-muted mt-1">{d}</p></div>
          ))}
        </div>
      </section>

      <section id="how" className="max-w-6xl mx-auto px-4 py-16 scroll-mt-16">
        <span className="lbl">How it works</span>
        <h2 className="mt-2 text-[32px] leading-10 font-semibold tracking-tight">From SOS to hospital bed in four steps</h2>
        <ol className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {STEPS.map(([ic, t, d], i) => (
            <li key={t} className="card p-5"><div className="flex items-center justify-between"><span className="w-10 h-10 rounded-lg bg-brand/10 text-brand flex items-center justify-center"><Icon name={ic} /></span><span className="font-mono text-[13px] text-muted">0{i + 1}</span></div><h3 className="mt-4 text-[16px] font-semibold">{t}</h3><p className="text-muted mt-1">{d}</p></li>
          ))}
        </ol>
      </section>

      <section id="features" className="border-y border-line bg-page scroll-mt-16">
        <div className="max-w-6xl mx-auto px-4 py-16">
          <span className="lbl">Features</span>
          <h2 className="mt-2 text-[32px] leading-10 font-semibold tracking-tight">Everything a crisis room needs, on one screen</h2>
          <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {FEATURES.map(([ic, t, d]) => <div key={t} className="card p-5"><Icon name={ic} className="text-brand" /><h3 className="mt-3 font-semibold text-[16px]">{t}</h3><p className="text-muted mt-1">{d}</p></div>)}
          </div>
        </div>
      </section>

      <section id="roles" className="max-w-6xl mx-auto px-4 py-16 scroll-mt-16">
        <span className="lbl">Who it is for</span>
        <h2 className="mt-2 text-[32px] leading-10 font-semibold tracking-tight">One system, four views</h2>
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {ROLES.map(([ic, t, d, to, cta]) => <Link key={t} to={to} className="card p-5 hover:border-ink transition-colors group"><Icon name={ic} className="text-info" /><h3 className="mt-3 font-semibold text-[16px]">{t}</h3><p className="text-muted mt-1">{d}</p><span className="mt-4 inline-flex items-center gap-1 text-brand font-semibold">{cta}<Icon name="arrow_forward" className="!text-[18px] group-hover:translate-x-0.5 transition-transform" /></span></Link>)}
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 pb-16">
        <div className="rounded-2xl bg-ink text-white p-8 md:p-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="max-w-2xl"><h2 className="text-[26px] leading-8 font-semibold">AI suggests. A person decides.</h2><p className="mt-2 text-white/75">VISION coordinates dispatch, beds, supplies and transfers. It never diagnoses patients, prescribes treatment or replaces medical judgement. This build runs on simulated demo data.</p></div>
          <Link to="/overview" className="btn bg-white text-ink hover:bg-white/90 !h-12 !px-6 shrink-0">Open the dashboard<Icon name="arrow_forward" /></Link>
        </div>
      </section>

      <footer className="border-t border-line">
        <div className="max-w-6xl mx-auto px-4 py-6 flex flex-wrap items-center justify-between gap-2 text-[13px] text-muted"><span>VISION · Cognition AI Hackathon · Track 3: Project Vision</span><a className="hover:text-ink" href="https://github.com/AbhishekKumarCode/vision-emergency-coordination" target="_blank" rel="noopener">Source on GitHub</a></div>
      </footer>
    </div>
  );
}
