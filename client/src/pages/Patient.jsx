import { useState } from "react";
import { useStore } from "../store.jsx";
import { EM_STATUS, ambName, areaOf, etaMin, km, liveEta } from "../lib.js";
import { HospStatus, Icon, PageHead, Steps } from "../components/ui.jsx";
import CityMap from "../components/CityMap.jsx";

// "Not sure" is never ranked low: it is treated as serious and flagged for the dispatcher to confirm.
const SEV = [["Life-threatening", "Critical"], ["Serious", "Serious"], ["Not sure", "Serious"]];
const TYPES = [["Accident", "car_crash"], ["Chest pain", "cardiology"], ["Breathing problem", "pulmonology"], ["Pregnancy", "pregnant_woman"], ["Burns", "local_fire_department"], ["Other", "more_horiz"]];
const KEY = "vision.myRequest";
const read = () => { try { return localStorage.getItem(KEY); } catch (e) { return null; } };
const write = v => { try { v ? localStorage.setItem(KEY, v) : localStorage.removeItem(KEY); } catch (e) {} };

export default function Patient() {
  const { st } = useStore();
  const [mine, setMine] = useState(read);
  const e = st.emergencies.find(x => x.id === mine);
  const [tab, setTab] = useState(e ? "status" : "sos");
  const [loc, setLoc] = useState({ x: 44, y: 28 });
  const tabs = [["sos", "sos", "Send SOS"], ["status", "location_searching", "My status"], ["near", "near_me", "Nearby help"]];
  return (
    <>
      <PageHead title="Patient app" desc="What a citizen sees on their phone: send an SOS, follow the ambulance, find help nearby." />
      <div className="mx-auto w-full max-w-[400px] card overflow-hidden">
        <div className="grid grid-cols-3 border-b border-line">
          {tabs.map(([k, ic, l]) => <button key={k} onClick={() => setTab(k)} className={"h-14 flex flex-col items-center justify-center text-[12px] gap-0.5 " + (tab === k ? "text-[#B50C08] font-semibold shadow-[inset_0_-2px_0_#D92D20]" : "text-muted")}><Icon name={ic} />{l}</button>)}
        </div>
        <div className="p-4">
          {tab === "sos" && <Sos loc={loc} setLoc={setLoc} onSent={id => { write(id); setMine(id); setTab("status"); }} />}
          {tab === "status" && <Status e={e} onNew={() => { write(null); setMine(null); setTab("sos"); }} />}
          {tab === "near" && <Nearby from={e || loc} />}
        </div>
      </div>
    </>
  );
}

function Sos({ loc, setLoc, onSent }) {
  const { api, run, notify } = useStore();
  const [f, setF] = useState({ sev: "", type: "", phone: "", notes: "" });
  const [busy, setBusy] = useState(false);
  const send = async () => {
    if (!f.sev || !f.type) return notify("Please choose how serious it is and what happened.");
    setBusy(true);
    const r = await run(() => api("/sos", { type: f.type, phone: f.phone, notes: f.notes, severity: SEV.find(s => s[0] === f.sev)[1], unverified: f.sev === "Not sure", ...loc }), "SOS sent. Help is being arranged.");
    setBusy(false);
    if (r) onSent(r.id);
  };
  return (
    <div className="space-y-4">
      <div><h2 className="text-[22px] font-semibold leading-7">Need emergency help?</h2><p className="text-muted">Tell us what is happening. Help will be sent.</p></div>
      <div>
        <div className="flex items-center justify-between mb-1.5"><span className="font-semibold">Where are you?</span><button className="text-info font-semibold text-[13px] flex items-center gap-1" onClick={() => { setLoc({ x: Math.round(12 + Math.random() * 76), y: Math.round(8 + Math.random() * 44) }); notify("Location set (simulated GPS)."); }}><Icon name="my_location" className="!text-[16px]" />Use my location</button></div>
        <CityMap pick={loc} onPick={setLoc} labels={false} className="rounded-lg border border-line" />
        <p className="text-[12px] text-muted mt-1">Tap the map to move the pin. Near {areaOf(loc)}.</p>
      </div>
      <div><div className="font-semibold mb-1.5">How serious is it?</div>
        <div className="grid grid-cols-3 gap-2">{SEV.map(([l]) => <button key={l} onClick={() => setF({ ...f, sev: l })} className={"h-12 rounded-lg border text-[13px] font-semibold " + (f.sev === l ? "border-brand bg-[#FFF6F5] text-[#B50C08]" : "border-line")}>{l}</button>)}</div></div>
      <div><div className="font-semibold mb-1.5">What happened?</div>
        <div className="grid grid-cols-2 gap-2">{TYPES.map(([t, ic]) => <button key={t} onClick={() => setF({ ...f, type: t })} className={"h-12 rounded-lg border flex items-center gap-2 px-3 text-left " + (f.type === t ? "border-brand bg-[#FFF6F5] text-[#B50C08] font-semibold" : "border-line")}><Icon name={ic} className="!text-[18px]" />{t}</button>)}</div></div>
      <input className="field" type="tel" inputMode="tel" maxLength={20} placeholder="Phone number (optional)" aria-label="Phone number" value={f.phone} onChange={ev => setF({ ...f, phone: ev.target.value })} />
      <input className="field" maxLength={200} placeholder="Anything we should know? (optional)" aria-label="Notes" value={f.notes} onChange={ev => setF({ ...f, notes: ev.target.value })} />
      <button className="btn btn-red w-full !h-14 !text-[16px]" disabled={busy} onClick={send}><Icon name="sos" />{busy ? "Sending..." : "Send SOS"}</button>
      <p className="text-[12px] text-muted text-center">Help is coordinated by the city emergency council.</p>
    </div>
  );
}

function Status({ e, onNew }) {
  const { st, notify } = useStore();
  if (!e) return <div className="text-center py-8"><Icon name="location_searching" className="!text-[32px] text-muted" /><p className="font-semibold mt-2">No active request</p><p className="text-muted mb-4">Send an SOS and you can follow the ambulance here.</p><button className="btn btn-red" onClick={onNew}>Send SOS</button></div>;
  const h = st.hospitals.find(x => x.id === e.hospitalId), eta = liveEta(e, st);
  const head = { waiting: "We have your request", en_route: "Ambulance is on its way", at_scene: "The ambulance has arrived", to_hospital: "On the way to hospital", completed: "You have reached the hospital" }[e.status];
  const step = e.status === "waiting" ? 0 : e.status === "en_route" ? 2 : e.status === "completed" ? 3 : 2;
  return (
    <div className="space-y-4">
      <div><div className="font-mono text-[12px] text-muted">{e.id}</div><h2 className="text-[22px] font-semibold leading-7">{head}</h2>
        {eta ? <p className="text-[40px] leading-[48px] font-semibold text-brand">{eta.min} min</p> : <p className="text-muted">{e.status === "waiting" ? "A dispatcher is assigning the nearest ambulance now." : "The hospital team has been informed."}</p>}
        {eta && <p className="text-muted text-[13px]">{eta.text}</p>}</div>
      <Steps step={step} labels={["Request sent", "Ambulance assigned", "On the way", "At hospital"]} />
      <CityMap focus={e.id} labels={false} className="rounded-lg border border-line" />
      {e.ambulanceId && <div className="rounded-lg border border-line p-3 flex items-center gap-3"><Icon name="ambulance" className="text-brand" /><div><div className="font-semibold">{ambName(e.ambulanceId)}</div><div className="text-muted text-[13px]">{EM_STATUS[e.status].label}</div></div></div>}
      {h && <div className="rounded-lg border border-line p-3 flex items-center gap-3"><Icon name="local_hospital" className="text-info" /><div><div className="font-semibold">Going to: {h.name}</div><div className="text-muted text-[13px]">{km(e, h).toFixed(1)} km away · {e.bed} reserved</div></div></div>}
      <button className="btn btn-line w-full" onClick={() => notify("Calling the dispatcher (demo).")}><Icon name="call" />Call the dispatcher</button>
      <button className="w-full text-center text-muted text-[13px] hover:text-ink" onClick={onNew}>Send a new request</button>
    </div>
  );
}

function Nearby({ from }) {
  const { st } = useStore();
  const [kind, setKind] = useState("Hospitals");
  const items = (kind === "Hospitals" ? st.hospitals.map(h => ({ name: h.name, x: h.x, y: h.y, hosp: h })) : st.services.filter(s => s.kind === kind)).map(i => ({ ...i, d: km(from, i) })).sort((a, b) => a.d - b.d);
  return (
    <div className="space-y-4">
      <div><h2 className="text-[22px] font-semibold leading-7">Help near you</h2><p className="text-muted">Sorted by distance from {areaOf(from)}.</p></div>
      <div className="flex gap-2">{["Hospitals", "Pharmacies", "Blood banks"].map(k => <button key={k} onClick={() => setKind(k)} className={"h-9 px-3 rounded-full border text-[13px] font-semibold " + (kind === k ? "bg-ink text-white border-ink" : "border-line text-muted")}>{k}</button>)}</div>
      <ul className="space-y-2">{items.map(i => (
        <li key={i.name} className="rounded-lg border border-line p-3 flex items-center justify-between gap-3">
          <div className="min-w-0"><div className="font-semibold truncate">{i.name}</div><div className="text-muted text-[13px]">{i.d.toFixed(1)} km · about {etaMin(i.d)} min{i.hosp ? " · " + i.hosp.icuFree + " ICU, " + i.hosp.bedsFree + " beds free" : " · " + i.note}</div></div>
          {i.hosp && <HospStatus s={i.hosp.status} />}
        </li>
      ))}</ul>
    </div>
  );
}
