import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useStore } from "../store.jsx";
import { AiNote, Empty, Icon, Loading, PageHead } from "../components/ui.jsx";

export default function Insights() {
  const { st, api, run } = useStore();
  const nav = useNavigate();
  const [d, setD] = useState(null);
  const load = useCallback(() => api("/insights").then(setD).catch(() => setD({ error: true })), [api]);
  const key = st.hospitals.map(h => h.icuFree + ":" + h.erLoad + ":" + Object.values(h.supplies).map(s => s.stock).join()).join("|") + st.emergencies.filter(e => e.status === "waiting").length;
  useEffect(() => { load(); }, [load, key]);
  if (!d) return <Loading text="Preparing the situation summary..." />;
  if (d.error) return <Empty icon="error" text="Insights could not be loaded. Please try again." />;
  const waiting = st.emergencies.filter(e => e.status === "waiting").length;
  return (
    <>
      <PageHead title="AI Insights" desc="A plain-language briefing, a 6-hour ICU forecast and suggested actions.">
        <button className="btn btn-line" onClick={() => { setD(null); load(); }}><Icon name="refresh" />Refresh</button>
      </PageHead>
      <div className="card p-5 mb-6">
        <div className="flex items-center justify-between mb-2"><h3 className="text-[16px] font-semibold text-[#B50C08] flex items-center gap-2"><Icon name="psychology" />Situation summary</h3><span className="font-mono text-[11px] text-muted bg-soft px-2 py-0.5 rounded">{d.source}</span></div>
        <p className="text-[16px] leading-7">{d.summary}</p>
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        <div className="xl:col-span-7 space-y-6">
          <div className="card p-5">
            <h3 className="text-[16px] font-semibold">ICU beds free, next 6 hours</h3>
            <p className="text-muted text-[13px] mb-3">Forecast based on simulated data: current free beds and how busy each emergency room is.</p>
            <Chart f={d.forecast} />
          </div>
          <div className="card">
            <div className="p-4 border-b border-line"><h3 className="text-[16px] font-semibold">Hospitals likely to reach capacity</h3></div>
            {!d.risk.length ? <Empty icon="task_alt" text="No hospital is forecast to run out of ICU beds in the next 6 hours." /> : (
              <ul className="divide-y divide-line">{d.risk.map(r => (
                <li key={r.id} className="p-4 flex items-center justify-between gap-3"><button className="text-left" onClick={() => nav("/hospitals/" + r.id)}><div className="font-semibold hover:underline">{r.name}</div><div className="text-muted text-[13px]">Emergency room is {r.erLoad}% full</div></button><span className={"font-semibold " + (r.hoursToFull <= 2 ? "text-brand" : "text-[#92400E]")}>{r.hoursToFull === 0 ? "ICU full now" : "ICU full in about " + r.hoursToFull + " h"}</span></li>
              ))}</ul>
            )}
          </div>
        </div>
        <div className="xl:col-span-5 card p-4">
          <h3 className="text-[16px] font-semibold pb-3 mb-3 border-b border-line">Suggested actions</h3>
          <div className="space-y-3">
            {waiting > 0 && <div className="rounded-lg border border-line p-4"><p className="font-semibold">{waiting} emergenc{waiting === 1 ? "y is" : "ies are"} waiting for an ambulance.</p><p className="text-muted mb-3">Review the dispatch suggestion for the most urgent request.</p><button className="btn btn-red btn-sm" onClick={() => nav("/emergencies")}>Open the queue</button></div>}
            {d.divert.map(n => <div key={n} className="rounded-lg border border-line p-4"><p className="font-semibold">Send new critical cases away from {n}.</p><p className="text-muted">It is diverting. Dispatch suggestions already avoid it.</p></div>)}
            {d.supply.map(s => <div key={s.id} className="rounded-lg border border-line p-4"><p className="font-semibold">{s.text}.</p><p className="text-muted mb-3">{s.why}</p><button className="btn btn-red btn-sm" onClick={() => run(() => api("/supplies/reallocate", s), "Stock moved to " + s.toName)}>Approve</button></div>)}
            {!waiting && !d.divert.length && !d.supply.length && <Empty icon="task_alt" text="Nothing needs action right now." />}
          </div>
          <div className="mt-4 pt-3 border-t border-line"><AiNote /></div>
        </div>
      </div>
    </>
  );
}

function Chart({ f }) {
  const W = 600, Ht = 220, P = { l: 36, r: 12, t: 12, b: 28 };
  const max = Math.max(4, Math.ceil(Math.max(...f.total) / 4) * 4);
  const x = i => P.l + (i / (f.hours.length - 1)) * (W - P.l - P.r), y = v => P.t + (1 - v / max) * (Ht - P.t - P.b);
  const line = f.total.map((v, i) => (i ? "L" : "M") + x(i).toFixed(1) + " " + y(v).toFixed(1)).join(" ");
  return (
    <svg viewBox={`0 0 ${W} ${Ht}`} className="w-full h-auto" role="img" aria-label={"Forecast of free ICU beds: " + f.total.join(", ")}>
      {[0, 0.25, 0.5, 0.75, 1].map(t => <g key={t}><line x1={P.l} x2={W - P.r} y1={y(max * t)} y2={y(max * t)} stroke="#E5E7EB" /><text x={P.l - 6} y={y(max * t) + 4} textAnchor="end" fontSize="11" fill="#575E70">{Math.round(max * t)}</text></g>)}
      <path d={line + ` L${x(f.hours.length - 1)} ${y(0)} L${x(0)} ${y(0)} Z`} fill="#D92D20" opacity=".08" />
      <path d={line} fill="none" stroke="#D92D20" strokeWidth="2.5" strokeLinejoin="round" />
      {f.total.map((v, i) => <g key={i}><circle cx={x(i)} cy={y(v)} r="4" fill="#fff" stroke="#D92D20" strokeWidth="2" /><text x={x(i)} y={y(v) - 9} textAnchor="middle" fontSize="11" fontWeight="600" fill="#151C27">{Math.round(v)}</text><text x={x(i)} y={Ht - 8} textAnchor="middle" fontSize="11" fill="#575E70">{i === 0 ? "Now" : "+" + f.hours[i] + "h"}</text></g>)}
    </svg>
  );
}
