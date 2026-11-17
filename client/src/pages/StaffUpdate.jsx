import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useStore } from "../store.jsx";
import { ago, ambName, erWord, liveEta } from "../lib.js";
import { Empty, HospStatus, Icon, PageHead, SupplyStatus } from "../components/ui.jsx";

const ER = [["Quiet", 40], ["Busy", 78], ["Full", 96]];

export default function StaffUpdate() {
  const { st, api, run, notify } = useStore();
  const [sp, setSp] = useSearchParams();
  const id = st.hospitals.some(h => h.id === sp.get("h")) ? sp.get("h") : st.hospitals[1].id;
  const h = st.hospitals.find(x => x.id === id);
  const [f, setF] = useState(null);
  const [saving, setSaving] = useState(false);
  // Load the form when the hospital changes (not on every live update, so typing is never interrupted).
  useEffect(() => { setF({ icuFree: h.icuFree, bedsFree: h.bedsFree, er: erWord(h.erLoad), supplies: Object.fromEntries(Object.entries(h.supplies).map(([k, s]) => [k, s.stock])) }); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!f) return null;
  const step = (k, d, max) => setF(v => ({ ...v, [k]: Math.max(0, Math.min(max, v[k] + d)) }));
  const save = async () => { setSaving(true); await run(() => api("/hospitals/" + id, { icuFree: f.icuFree, bedsFree: f.bedsFree, erLoad: ER.find(e => e[0] === f.er)[1], supplies: f.supplies }), "Saved. Dispatchers can see the update now."); setSaving(false); };
  const walkIn = async kind => { const r = await run(() => api("/hospitals/" + id + "/walkin", { kind })); if (r) { notify(r.message); setF(v => ({ ...v, icuFree: r.icuFree, bedsFree: r.bedsFree })); } };
  const incoming = st.emergencies.filter(e => e.hospitalId === id && e.status !== "completed");
  const Row = ({ label, hint, k, max }) => (
    <div className="flex items-center justify-between gap-4 py-4 border-b border-line">
      <div><div className="text-[16px] font-semibold">{label}</div><div className="text-muted text-[13px]">{hint}</div></div>
      <div className="flex items-center gap-3">
        <button className="btn btn-line !w-11 !px-0" aria-label={"Decrease " + label} onClick={() => step(k, -1, max)}><Icon name="remove" /></button>
        <span className="text-[28px] font-semibold w-14 text-center">{f[k]}</span>
        <button className="btn btn-line !w-11 !px-0" aria-label={"Increase " + label} onClick={() => step(k, 1, max)}><Icon name="add" /></button>
      </div>
    </div>
  );
  return (
    <>
      <PageHead title="Update your hospital" desc="Hospital staff keep beds and stock up to date here. Dispatchers see every change immediately.">
        <label className="flex items-center gap-2"><span className="text-muted">Hospital</span>
          <select className="field !w-auto" value={id} onChange={e => setSp({ h: e.target.value })}>{st.hospitals.map(x => <option key={x.id} value={x.id}>{x.name}</option>)}</select></label>
        <HospStatus s={h.status} />
      </PageHead>
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        <div className="xl:col-span-8 card p-5">
          <h3 className="lbl">Beds</h3>
          <Row label="ICU beds free" hint={`Out of ${h.icuTotal}. ${h.icuReserved} reserved for incoming ambulances, ${h.icuTotal - h.icuFree - h.icuReserved} occupied.`} k="icuFree" max={h.icuTotal - h.icuReserved} />
          <Row label="General beds free" hint={`Out of ${h.bedsTotal}. ${h.bedsReserved} reserved for incoming ambulances, ${h.bedsTotal - h.bedsFree - h.bedsReserved} occupied.`} k="bedsFree" max={h.bedsTotal - h.bedsReserved} />
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-4 border-b border-line">
            <div><div className="text-[16px] font-semibold">Emergency room</div><div className="text-muted text-[13px]">How busy is it right now?</div></div>
            <div className="inline-flex rounded-lg border border-line overflow-hidden" role="group" aria-label="Emergency room status">
              {ER.map(([l]) => <button key={l} onClick={() => setF(v => ({ ...v, er: l }))} className={"h-11 px-5 font-semibold " + (f.er === l ? "bg-ink text-white" : "bg-white text-muted hover:text-ink")}>{l}</button>)}
            </div>
          </div>
          <h3 className="lbl mt-6 mb-2">Critical supplies in stock</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {Object.entries(h.supplies).map(([k, s]) => { const v = f.supplies[k], stt = v <= 0 ? "Out" : v < s.min ? "Low" : "OK"; return (
              <label key={k} className="rounded-lg border border-line p-3 flex items-center justify-between gap-3">
                <span><span className="font-semibold block">{s.label}</span><span className="text-muted text-[12px]">Minimum {s.min}</span></span>
                <span className="flex items-center gap-2"><input type="number" min="0" max="9999" className="field !w-24 text-right font-mono" value={v} onChange={e => setF(x => ({ ...x, supplies: { ...x.supplies, [k]: Math.max(0, Math.min(9999, Math.round(+e.target.value || 0))) } }))} /><SupplyStatus s={stt} /></span>
              </label>
            ); })}
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-6">
            <span className="text-muted text-[13px]">{h.updatedAt ? "Last updated " + ago(h.updatedAt) + " ago" : "Not updated yet in this session"}</span>
            <button className="btn btn-red" disabled={saving} onClick={save}><Icon name="cloud_upload" />Save and share with dispatchers</button>
          </div>
        </div>
        <div className="xl:col-span-4 space-y-6">
        <div className="card p-4">
          <h3 className="text-[16px] font-semibold flex items-center gap-2"><Icon name="directions_walk" className="text-brand" />Walk-in patient arrived</h3>
          <p className="text-muted text-[13px] mt-1 mb-3">Admit a patient who came in directly. If the only bed left is reserved for an ambulance, the dispatcher gets a short countdown to decide, then the time rule applies.</p>
          <div className="grid grid-cols-2 gap-2">
            <button className="btn btn-red" onClick={() => walkIn("icu")}>Admit to ICU bed</button>
            <button className="btn btn-line" onClick={() => walkIn("bed")}>Admit to general bed</button>
          </div>
        </div>
        <div className="card">
          <div className="p-4 border-b border-line"><h3 className="text-[16px] font-semibold">Incoming patients</h3></div>
          {!incoming.length ? <Empty icon="airline_seat_flat" text="No patients are on the way right now." /> : (
            <ul className="divide-y divide-line">{incoming.map(e => { const eta = liveEta(e, st); return <li key={e.id} className="p-4"><div className="font-semibold">{e.type} <span className="font-mono text-[12px] text-muted">{e.id}</span></div><div className="text-muted text-[13px]">{ambName(e.ambulanceId)} · {e.bed} reserved{eta ? " · about " + eta.min + " min" : ""}</div></li>; })}</ul>
          )}
        </div>
        </div>
      </div>
    </>
  );
}
