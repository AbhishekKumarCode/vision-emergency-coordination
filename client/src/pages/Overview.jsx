import { Link, useNavigate } from "react-router-dom";
import { useStore } from "../store.jsx";
import { ago, clock, sortQueue } from "../lib.js";
import { Empty, Icon, Kpi, PageHead, Severity } from "../components/ui.jsx";
import CityMap, { MapLegend } from "../components/CityMap.jsx";

const TONE = { ok: "bg-ok", warn: "bg-warn", crit: "bg-brand", info: "bg-info" };

export default function Overview() {
  const { st, api, run } = useStore();
  const nav = useNavigate();
  const waiting = sortQueue(st.emergencies.filter(e => e.status === "waiting"));
  const active = st.emergencies.filter(e => e.status !== "completed");
  const free = st.ambulances.filter(a => a.status === "available").length;
  const onJob = st.ambulances.filter(a => ["dispatched", "at_scene", "to_hospital"].includes(a.status)).length;
  const icuFree = st.hospitals.reduce((s, h) => s + h.icuFree, 0), icuTotal = st.hospitals.reduce((s, h) => s + h.icuTotal, 0);
  const used = Math.round((1 - icuFree / icuTotal) * 100);
  return (
    <>
      <PageHead title="Overview" desc="What is happening across the city right now, and what needs your decision.">
        <button className="btn btn-line" onClick={() => run(() => api("/simulate", {}), "A new SOS request arrived")}><Icon name="bolt" />Simulate SOS</button>
        <button className="btn btn-red" onClick={() => nav("/patient")}><Icon name="add" />New emergency</button>
      </PageHead>

      <div className="card p-4 flex items-center gap-4 mb-4">
        <div className={"w-10 h-10 rounded-lg flex items-center justify-center shrink-0 " + (waiting.length ? "bg-brand/10 text-brand" : "bg-ok/10 text-ok")}><Icon name={waiting.length ? "notifications_active" : "check_circle"} className="!text-[24px]" /></div>
        <div>
          <h2 className="text-[16px] font-semibold">{waiting.length} emergenc{waiting.length === 1 ? "y needs" : "ies need"} action. {free} ambulance{free === 1 ? "" : "s"} free. ICU capacity at {used}%.</h2>
          <p className="text-muted text-[13px]">{waiting.length ? "Open the most urgent request, review the AI suggestion, and approve the dispatch." : "Nothing is waiting. New SOS requests will appear here immediately."}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Kpi label="Active emergencies" value={active.length} sub={waiting.length + " waiting for an ambulance"} icon="crisis_alert" tone="text-brand" />
        <Kpi label="Ambulances free" value={free} unit={"/ " + st.ambulances.length} sub={onJob + " on a job"} icon="ambulance" tone="text-ok" />
        <Kpi label="ICU beds free" value={icuFree} unit={"/ " + icuTotal} sub={"Across " + st.hospitals.length + " hospitals"} icon="bed" tone="text-info" />
        <Kpi label="Avg response time" value={st.avgResponse} unit="min" sub="From SOS to ambulance arrival" icon="timer" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        <div className="xl:col-span-8 card overflow-hidden">
          <div className="p-4 border-b border-line flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-[16px] font-semibold flex items-center gap-2"><Icon name="map" className="text-muted" />City map</h3>
            <MapLegend />
          </div>
          <CityMap />
          <div className="p-4 border-t border-line">
            <div className="flex items-center justify-between mb-2"><h3 className="font-semibold flex items-center gap-2"><Icon name="history" className="text-muted !text-[18px]" />Recent activity</h3><span className="text-[12px] text-muted">Updates live</span></div>
            <ul className="divide-y divide-[#F3F4F6]">
              {st.events.slice(0, 6).map((ev, i) => (
                <li key={i} className="py-2 flex items-center gap-3"><span className="font-mono text-[12px] text-muted w-12 shrink-0">{clock(ev.t)}</span><span className={"w-1.5 h-1.5 rounded-full shrink-0 " + (TONE[ev.kind] || "bg-info")} /><span>{ev.text}</span></li>
              ))}
            </ul>
          </div>
        </div>

        <div className="xl:col-span-4 card p-4">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-line">
            <h3 className="text-[18px] font-semibold flex items-center gap-2">Needs action {waiting.length > 0 && <span className="w-6 h-6 rounded-full bg-brand text-white text-[12px] font-bold flex items-center justify-center">{waiting.length}</span>}</h3>
            <Link to="/emergencies" className="text-info font-semibold text-[13px] hover:underline">See all</Link>
          </div>
          {!waiting.length && <Empty icon="task_alt" text="All emergencies have an ambulance assigned." />}
          <div className="space-y-3">
            {waiting.slice(0, 4).map((e, i) => (
              <div key={e.id} className={"rounded-lg p-4 " + (i === 0 ? "border-2 border-brand" : "border border-line")}>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2"><Severity s={e.severity} /><span className="font-mono text-[12px] font-semibold">{e.id}</span></div>
                  <span className="text-[12px] text-muted flex items-center gap-1"><Icon name="schedule" className="!text-[14px]" />waiting {ago(e.createdAt)}</span>
                </div>
                <h4 className="text-[16px] font-semibold">{e.type}</h4>
                <p className="text-muted flex items-center gap-1 mb-3"><Icon name="location_on" className="!text-[16px]" />{e.area}</p>
                <button className={"btn w-full " + (i === 0 ? "btn-red" : "btn-line")} onClick={() => nav("/emergencies/" + e.id)}>View suggestion and dispatch<Icon name="arrow_forward" className="!text-[18px]" /></button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
