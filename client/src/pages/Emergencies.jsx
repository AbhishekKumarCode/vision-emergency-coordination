import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useStore } from "../store.jsx";
import { EM_STATUS, ago, ambName, liveEta, sortQueue } from "../lib.js";
import { AiNote, EmStatus, Empty, Icon, Loading, PageHead, Severity, Steps, Unverified } from "../components/ui.jsx";
import CityMap from "../components/CityMap.jsx";

const TABS = [["all", "All"], ["critical", "Critical"], ["waiting", "Waiting"], ["progress", "In progress"], ["completed", "Completed"]];
const match = (e, t) => t === "all" || (t === "critical" && e.severity === "Critical" && e.status !== "completed") || (t === "waiting" && e.status === "waiting") || (t === "progress" && ["en_route", "at_scene", "to_hospital"].includes(e.status)) || (t === "completed" && e.status === "completed");

export default function Emergencies() {
  const { st, api, run } = useStore();
  const { id } = useParams();
  const nav = useNavigate();
  const [tab, setTab] = useState("all");
  const [q, setQ] = useState("");
  const list = useMemo(() => {
    const open = sortQueue(st.emergencies.filter(e => e.status === "waiting"));
    const rest = st.emergencies.filter(e => e.status !== "waiting").sort((a, b) => (a.status === "completed") - (b.status === "completed") || b.createdAt - a.createdAt);
    return [...open, ...rest].filter(e => match(e, tab) && (e.id + e.type + e.area).toLowerCase().includes(q.toLowerCase()));
  }, [st.emergencies, tab, q]);
  const sel = st.emergencies.find(e => e.id === id) || list[0];

  return (
    <>
      <PageHead title="Emergencies" desc="Every SOS request in one queue. Pick one, review the suggestion, and send help.">
        <button className="btn btn-line" onClick={() => run(() => api("/simulate", {}), "A new SOS request arrived")}><Icon name="bolt" />Simulate SOS</button>
        <button className="btn btn-red" onClick={() => nav("/patient")}><Icon name="add_call" />Log emergency</button>
      </PageHead>

      <div className="card p-3 mb-6 flex flex-col md:flex-row gap-3 md:items-center justify-between">
        <div className="flex items-center gap-1 overflow-x-auto">
          {TABS.map(([k, l]) => (
            <button key={k} onClick={() => setTab(k)} className={"px-3 h-10 rounded-lg flex items-center gap-2 shrink-0 " + (tab === k ? "bg-soft text-[#B50C08] font-semibold" : "text-muted hover:bg-soft hover:text-ink")}>
              {l}<span className="font-mono text-[12px] bg-white border border-line px-1.5 rounded">{st.emergencies.filter(e => match(e, k)).length}</span>
            </button>
          ))}
        </div>
        <div className="relative md:w-72"><Icon name="search" className="absolute left-3 top-3 text-muted" /><input className="field pl-10" placeholder="Search ID, need or area" value={q} onChange={e => setQ(e.target.value)} aria-label="Search emergencies" /></div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        <div className="xl:col-span-7 card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse min-w-[640px]">
              <thead><tr className="border-b border-line"><th className="th pl-4">ID</th><th className="th">Patient need</th><th className="th">Severity</th><th className="th">Area</th><th className="th">Waiting</th><th className="th">Status</th><th className="th">Unit</th></tr></thead>
              <tbody className="divide-y divide-line">
                {list.map(e => (
                  <tr key={e.id} onClick={() => nav("/emergencies/" + e.id)} className={"cursor-pointer " + (sel && sel.id === e.id ? "bg-soft shadow-[inset_4px_0_0_#D92D20]" : "hover:bg-[#FAFBFC]")}>
                    <td className="td pl-4 font-mono text-[12px] font-semibold">{e.id}</td>
                    <td className="td font-semibold">{e.type}</td>
                    <td className="td"><span className="flex flex-col items-start gap-1"><Severity s={e.severity} />{e.unverified && <Unverified />}</span></td>
                    <td className="td text-muted">{e.area}</td>
                    <td className="td font-mono text-[12px]">{e.status === "completed" ? "-" : ago(e.createdAt)}</td>
                    <td className="td"><EmStatus s={e.status} /></td>
                    <td className="td font-mono text-[12px]">{e.ambulanceId || "None"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!list.length && <Empty text="No emergencies match this filter." />}
        </div>
        <div className="xl:col-span-5">{sel ? <Detail key={sel.id} e={sel} /> : <div className="card"><Empty text="Select an emergency to see details." /></div>}</div>
      </div>
    </>
  );
}

function Detail({ e }) {
  const { st, api, run } = useStore();
  const H = id => st.hospitals.find(h => h.id === id);
  const eta = liveEta(e, st);
  return (
    <div className="card p-5 space-y-4">
      <div className="flex items-start justify-between gap-3 pb-3 border-b border-line">
        <div><div className="lbl">Selected emergency</div><h2 className="text-[22px] font-semibold leading-7">{e.type}</h2><p className="text-muted">{e.id} · {e.area}</p></div>
        <span className="flex flex-col items-end gap-1"><Severity s={e.severity} />{e.unverified && <Unverified />}</span>
      </div>
      <Steps step={e.status === "waiting" ? 0 : EM_STATUS[e.status].step} />
      {e.notes && <div className="bg-soft rounded-lg p-3"><div className="lbl mb-1">Caller notes</div><p>{e.notes}</p></div>}
      <CityMap focus={e.id} labels={false} className="rounded-lg border border-line" />
      {e.status === "waiting" ? <Recommendation e={e} /> : (
        <div className="rounded-lg border border-line p-4 space-y-2">
          <div className="flex items-center justify-between"><h3 className="font-semibold">{EM_STATUS[e.status].label}</h3>{eta && <span className="text-[22px] font-semibold">{eta.min} min</span>}</div>
          {eta && <p className="text-muted text-[13px]">About {eta.min} min {eta.text}.</p>}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="bg-soft rounded-lg p-3"><div className="lbl">Ambulance</div><div className="font-semibold">{ambName(e.ambulanceId)}</div></div>
            <div className="bg-soft rounded-lg p-3"><div className="lbl">Hospital</div><div className="font-semibold">{H(e.hospitalId)?.name}</div><div className="text-[12px] text-muted">{e.bed} reserved</div></div>
          </div>
        </div>
      )}
    </div>
  );
}

function Recommendation({ e }) {
  const { st, api, run } = useStore();
  const [rec, setRec] = useState(null);
  const [manual, setManual] = useState(false);
  const [pick, setPick] = useState({ a: "", h: "" });
  const [busy, setBusy] = useState(false);
  // Refresh the suggestion whenever ambulance availability or hospital capacity changes.
  const key = st.ambulances.filter(a => a.status === "available").map(a => a.id).join() + "|" + st.hospitals.map(h => h.icuFree + ":" + h.bedsFree).join();
  useEffect(() => {
    let live = true;
    api("/emergencies/" + e.id + "/recommend").then(r => live && setRec(r)).catch(() => live && setRec({ ok: false, message: "Could not load a suggestion. Use manual dispatch." }));
    return () => { live = false; };
  }, [e.id, key, api]);
  const send = async (ambulanceId, hospitalId) => { setBusy(true); await run(() => api("/emergencies/" + e.id + "/dispatch", { ambulanceId, hospitalId }), ambName(ambulanceId) + " dispatched"); setBusy(false); };
  const freeAmb = st.ambulances.filter(a => a.status === "available"), okHosp = st.hospitals.filter(h => h.status !== "Diverting");
  if (!rec) return <div className="rounded-lg border border-line"><Loading text="Finding the best ambulance and hospital..." /></div>;
  return (
    <div className="rounded-lg border-2 border-brand p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-[#B50C08] flex items-center gap-2"><Icon name="psychology" />Recommended next step</h3>
        <span className="font-mono text-[11px] text-muted bg-soft px-2 py-0.5 rounded">{rec.source || st.ai}</span>
      </div>
      {!rec.ok ? <p className="bg-[#FEF3C7] text-[#92400E] rounded-lg p-3 mb-3">{rec.message}</p> : (
        <>
          <p className="bg-[#FFF6F5] border border-[#FFDAD6] rounded-lg p-3 text-[18px] leading-snug font-semibold mb-3">{rec.headline}</p>
          {rec.explanation && <p className="text-muted mb-3">{rec.explanation}</p>}
          <ul className="space-y-2 mb-4">{rec.reasons.map(r => <li key={r} className="flex items-start gap-2"><Icon name="check_circle" className="text-ok !text-[18px] mt-0.5 shrink-0" /><span>{r}</span></li>)}</ul>
          <p className="text-[13px] text-muted mb-3">Estimated total time to hospital: <b className="text-ink">{rec.best.totalEta} min</b></p>
          {rec.alternatives.length > 0 && (
            <div className="border-t border-line pt-3 mb-4">
              <div className="lbl mb-2">Other options</div>
              <div className="space-y-1.5">{rec.alternatives.map(o => (
                <button key={o.ambulanceId + o.hospitalId} disabled={busy} onClick={() => send(o.ambulanceId, o.hospitalId)} className="w-full text-left p-2.5 rounded-lg border border-line hover:border-ink flex items-center justify-between gap-3">
                  <span>Send {ambName(o.ambulanceId)} to {o.hospitalName}</span><span className="font-mono text-[12px] text-muted shrink-0">{o.totalEta} min · {o.icuFree} ICU</span>
                </button>
              ))}</div>
            </div>
          )}
          <button className="btn btn-red w-full" disabled={busy} onClick={() => send(rec.best.ambulanceId, rec.best.hospitalId)}><Icon name="send" />Approve and dispatch {ambName(rec.best.ambulanceId)}</button>
        </>
      )}
      <button className="btn btn-line w-full mt-2" onClick={() => setManual(m => !m)}>{manual ? "Hide manual choice" : "Choose another ambulance or hospital"}</button>
      {manual && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3">
          <select className="field" value={pick.a} onChange={ev => setPick({ ...pick, a: ev.target.value })} aria-label="Ambulance"><option value="">Choose ambulance</option>{freeAmb.map(a => <option key={a.id} value={a.id}>{ambName(a.id)}</option>)}</select>
          <select className="field" value={pick.h} onChange={ev => setPick({ ...pick, h: ev.target.value })} aria-label="Hospital"><option value="">Choose hospital</option>{okHosp.map(h => <option key={h.id} value={h.id}>{h.name} ({h.icuFree} ICU free)</option>)}</select>
          <button className="btn btn-line sm:col-span-2" disabled={!pick.a || !pick.h || busy} onClick={() => send(pick.a, pick.h)}>Dispatch my choice</button>
        </div>
      )}
      <div className="mt-3 pt-3 border-t border-line"><AiNote /></div>
    </div>
  );
}
