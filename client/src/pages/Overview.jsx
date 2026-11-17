import { Link, useNavigate } from "react-router-dom";
import { useStore } from "../store.jsx";
import { ago, ambName, clock, liveEta, sortQueue } from "../lib.js";
import { Empty, Icon, PageHead, Severity, Unverified } from "../components/ui.jsx";
import CityMap from "../components/CityMap.jsx";

const TONE = { ok: "bg-ok", warn: "bg-warn", crit: "bg-brand", info: "bg-info" };

const Stat = ({ label, value, unit, tone = "text-ink" }) => (
  <div className="card px-4 py-3">
    <div className="text-[13px] text-muted">{label}</div>
    <div className={"text-[28px] leading-9 font-semibold tracking-tight " + tone}>{value}{unit && <span className="text-[15px] text-muted font-normal"> {unit}</span>}</div>
  </div>
);

export default function Overview() {
  const { st, api, run } = useStore();
  const nav = useNavigate();
  const waiting = sortQueue(st.emergencies.filter(e => e.status === "waiting"));
  const moving = st.emergencies.filter(e => ["en_route", "at_scene", "to_hospital"].includes(e.status));
  const free = st.ambulances.filter(a => a.status === "available").length;
  const icuFree = st.hospitals.reduce((s, h) => s + h.icuFree, 0), icuTotal = st.hospitals.reduce((s, h) => s + h.icuTotal, 0);
  const summary = waiting.length
    ? `${waiting.length} emergenc${waiting.length === 1 ? "y needs" : "ies need"} your decision. Review the suggestion and approve the dispatch.`
    : "Nothing is waiting. New SOS requests appear here immediately.";
  return (
    <>
      <PageHead title="Overview" desc={summary}>
        <button className="btn btn-line" onClick={() => run(() => api("/simulate", {}), "A new SOS request arrived")}><Icon name="bolt" />Simulate SOS</button>
        <button className="btn btn-red" onClick={() => nav("/patient")}><Icon name="add" />New emergency</button>
      </PageHead>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Stat label="Waiting for an ambulance" value={waiting.length} tone={waiting.length ? "text-brand" : "text-ink"} />
        <Stat label="Ambulances free" value={free} unit={"of " + st.ambulances.length} />
        <Stat label="ICU beds free" value={icuFree} unit={"of " + icuTotal} />
        <Stat label="Average response time" value={st.avgResponse} unit="min" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start mb-6">
        <div className="xl:col-span-7 card">
          <div className="px-4 py-3 border-b border-line flex items-center justify-between">
            <h3 className="text-[16px] font-semibold flex items-center gap-2">Needs action {waiting.length > 0 && <span className="min-w-6 h-6 px-1.5 rounded-full bg-brand text-white text-[12px] font-bold flex items-center justify-center">{waiting.length}</span>}</h3>
            <Link to="/emergencies" className="text-info font-semibold text-[13px] hover:underline">See all emergencies</Link>
          </div>
          {!waiting.length ? <Empty icon="task_alt" text="Every emergency has an ambulance assigned." /> : (
            <ul className="divide-y divide-line">
              {waiting.slice(0, 3).map((e, i) => (
                <li key={e.id} className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1"><Severity s={e.severity} />{e.unverified && <Unverified />}<span className="font-mono text-[12px] text-muted">{e.id}</span></div>
                    <div className="text-[16px] font-semibold">{e.type}</div>
                    <div className="text-muted text-[13px]">{e.area} · waiting {ago(e.createdAt)}</div>
                  </div>
                  <button className={"btn shrink-0 " + (i === 0 ? "btn-red" : "btn-line")} onClick={() => nav("/emergencies/" + e.id)}>Review and dispatch<Icon name="arrow_forward" className="!text-[18px]" /></button>
                </li>
              ))}
            </ul>
          )}
          {moving.length > 0 && (
            <div className="border-t border-line">
              <div className="px-4 pt-3 text-[13px] font-semibold text-muted">On the way</div>
              <ul className="px-4 pb-3 divide-y divide-[#F3F4F6]">
                {moving.slice(0, 3).map(e => { const eta = liveEta(e, st); return (
                  <li key={e.id} className="py-2 flex items-center justify-between gap-3">
                    <button className="text-left hover:underline min-w-0 truncate" onClick={() => nav("/emergencies/" + e.id)}><span className="font-semibold">{e.type}</span> <span className="text-muted">· {ambName(e.ambulanceId)} to {st.hospitals.find(h => h.id === e.hospitalId)?.name}</span></button>
                    <span className="text-[13px] font-semibold shrink-0">{eta ? eta.min + " min" : ""}</span>
                  </li>
                ); })}
              </ul>
            </div>
          )}
        </div>

        <div className="xl:col-span-5 card overflow-hidden">
          <div className="px-4 py-3 border-b border-line flex items-center justify-between"><h3 className="text-[16px] font-semibold">City map</h3><Link to="/ambulances" className="text-info font-semibold text-[13px] hover:underline">Follow ambulances</Link></div>
          <CityMap labels={false} height={250} />
          <div className="px-4 py-2.5 border-t border-line flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-muted">
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-brand" />Emergency</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-[#111827]" />Ambulance</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-info" />Hospital (ICU beds free)</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        <div className="xl:col-span-7 card p-4">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <h3 className="text-[16px] font-semibold">ICU beds by hospital</h3>
            <div className="flex items-center gap-3 text-[12px] text-muted"><span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-[#CBD5E1]" />Occupied</span><span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-warn" />Reserved</span><span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-ok" />Free</span></div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
            {st.hospitals.map(h => { const occ = h.icuTotal - h.icuFree - h.icuReserved; return (
              <button key={h.id} onClick={() => nav("/hospitals/" + h.id)} className="text-left group">
                <div className="flex items-center justify-between mb-1"><span className="font-semibold group-hover:underline truncate">{h.name}</span><span className="text-[13px] text-muted shrink-0">{h.icuFree} free{h.icuReserved > 0 ? ", " + h.icuReserved + " reserved" : ""}</span></div>
                <div className="flex h-2 rounded-full overflow-hidden bg-[#EEF0F3]" role="img" aria-label={`${h.name}: ${occ} occupied, ${h.icuReserved} reserved, ${h.icuFree} free of ${h.icuTotal} ICU beds`}>
                  <div className="bg-[#CBD5E1]" style={{ width: (occ / h.icuTotal) * 100 + "%" }} /><div className="bg-warn" style={{ width: (h.icuReserved / h.icuTotal) * 100 + "%" }} /><div className="bg-ok" style={{ width: (h.icuFree / h.icuTotal) * 100 + "%" }} />
                </div>
              </button>
            ); })}
          </div>
        </div>
        <div className="xl:col-span-5 card p-4">
          <h3 className="text-[16px] font-semibold mb-2">Recent activity</h3>
          <ul className="divide-y divide-[#F3F4F6]">
            {st.events.slice(0, 4).map((ev, i) => (
              <li key={i} className="py-2 flex items-start gap-3"><span className="font-mono text-[12px] text-muted w-11 shrink-0 pt-0.5">{clock(ev.t)}</span><span className={"w-1.5 h-1.5 rounded-full shrink-0 mt-2 " + (TONE[ev.kind] || "bg-info")} /><span>{ev.text}</span></li>
            ))}
          </ul>
        </div>
      </div>
    </>
  );
}
