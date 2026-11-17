import { useEffect, useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { useStore } from "../store.jsx";
import { ambName, erWord, liveEta } from "../lib.js";
import { AiNote, Bar, Empty, HospStatus, Icon, PageHead, Severity, SupplyStatus } from "../components/ui.jsx";

export default function HospitalDetail() {
  const { st, api, run } = useStore();
  const { id } = useParams();
  const nav = useNavigate();
  const h = st.hospitals.find(x => x.id === id);
  const [sug, setSug] = useState([]);
  const supKey = st.hospitals.map(x => Object.values(x.supplies).map(s => s.stock).join()).join("|");
  useEffect(() => { let live = true; api("/supplies/suggestions").then(r => live && setSug(r.filter(s => s.to === id))).catch(() => {}); return () => { live = false; }; }, [api, id, supKey]);
  if (!h) return <Navigate to="/hospitals" replace />;
  const incoming = st.emergencies.filter(e => e.hospitalId === h.id && e.status !== "completed");
  const transfersIn = st.transfers.filter(t => t.to === h.id && t.status === "in_progress");
  const requestTransfer = async () => { const t = await run(() => api("/transfers", { from: h.id, need: "ICU bed", urgency: "Urgent", reason: "Capacity at " + h.name }), "Transfer request created"); if (t) nav("/transfers"); };
  const cap = [["ICU beds free", h.icuFree, h.icuTotal, "bed", h.icuReserved], ["General beds free", h.bedsFree, h.bedsTotal, "hotel", h.bedsReserved]];
  return (
    <>
      <Link to="/hospitals" className="inline-flex items-center gap-1 text-muted hover:text-ink mb-3"><Icon name="arrow_back" className="!text-[18px]" />All hospitals</Link>
      <PageHead title={h.name} desc={"Capacity, incoming patients and supplies. Specialist units: " + h.specialties.join(", ") + "."}>
        <HospStatus s={h.status} />
        <button className="btn btn-line" onClick={() => nav("/staff?h=" + h.id)}><Icon name="edit_note" />Update availability</button>
        <button className="btn btn-red" onClick={requestTransfer}><Icon name="swap_horiz" />Request patient transfer</button>
      </PageHead>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {cap.map(([l, free, tot, ic, resv]) => (
          <div key={l} className="card p-4"><div className="flex justify-between"><span className="lbl">{l}</span><Icon name={ic} className="text-info" /></div><div className="mt-2 text-[36px] leading-10 font-semibold">{free}<span className="text-[18px] text-muted font-normal"> / {tot}</span></div><div className="mt-3"><Bar value={tot - free} max={tot} /></div><div className="mt-2 text-[13px] text-muted">{resv} reserved for incoming ambulances · {tot - free - resv} occupied</div></div>
        ))}
        <div className="card p-4"><div className="flex justify-between"><span className="lbl">Emergency room</span><Icon name="monitor_heart" className="text-brand" /></div><div className="mt-2 text-[36px] leading-10 font-semibold">{erWord(h.erLoad)}<span className="text-[18px] text-muted font-normal"> {h.erLoad}%</span></div><div className="mt-3"><Bar value={h.erLoad} /></div></div>
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        <div className="xl:col-span-7 card overflow-hidden">
          <div className="p-4 border-b border-line"><h3 className="text-[16px] font-semibold">Critical supplies</h3></div>
          <table className="w-full border-collapse">
            <thead><tr className="border-b border-line"><th className="th pl-4">Item</th><th className="th">In stock</th><th className="th">Minimum</th><th className="th">Status</th></tr></thead>
            <tbody className="divide-y divide-line">{Object.entries(h.supplies).map(([k, s]) => <tr key={k}><td className="td pl-4 font-semibold">{s.label}</td><td className="td font-mono">{s.stock}</td><td className="td font-mono text-muted">{s.min}</td><td className="td"><SupplyStatus s={s.status} /></td></tr>)}</tbody>
          </table>
          {sug.map(s => (
            <div key={s.id} className="m-4 rounded-lg border-2 border-brand p-4">
              <h4 className="font-semibold text-[#B50C08] flex items-center gap-2 mb-1"><Icon name="psychology" />Suggested supply request</h4>
              <p className="text-[16px] font-semibold">{s.text}.</p><p className="text-muted mb-3">{s.why}</p>
              <button className="btn btn-red" onClick={() => run(() => api("/supplies/reallocate", s), s.qty + " " + s.label.toLowerCase() + " are on the way")}>Approve and request</button>
              <div className="mt-3"><AiNote /></div>
            </div>
          ))}
        </div>
        <div className="xl:col-span-5 card">
          <div className="p-4 border-b border-line"><h3 className="text-[16px] font-semibold">Incoming patients</h3></div>
          {!incoming.length && !transfersIn.length && <Empty icon="airline_seat_flat" text="No patients are on the way right now." />}
          <ul className="divide-y divide-line">
            {incoming.map(e => { const eta = liveEta(e, st); return (
              <li key={e.id} className="p-4 flex items-center justify-between gap-3"><div><div className="font-semibold">{e.type} <span className="font-mono text-[12px] text-muted">{e.id}</span></div><div className="text-muted text-[13px]">{ambName(e.ambulanceId)} · {e.bed} reserved</div></div><div className="text-right"><Severity s={e.severity} /><div className="text-[13px] mt-1">{eta ? "about " + eta.min + " min" : ""}</div></div></li>
            ); })}
            {transfersIn.map(t => <li key={t.id} className="p-4"><div className="font-semibold">Transfer {t.id}</div><div className="text-muted text-[13px]">From {st.hospitals.find(x => x.id === t.from)?.name} · {t.need}</div></li>)}
          </ul>
        </div>
      </div>
    </>
  );
}
