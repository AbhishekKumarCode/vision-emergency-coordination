import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useStore } from "../store.jsx";
import { AMB_STATUS, ambName, areaOf, liveEta } from "../lib.js";
import { Dot, Icon, Kpi, PageHead } from "../components/ui.jsx";
import CityMap, { MapLegend } from "../components/CityMap.jsx";

export default function Ambulances() {
  const { st, api, run } = useStore();
  const nav = useNavigate();
  const [sel, setSel] = useState(null);
  const count = s => st.ambulances.filter(a => s.includes(a.status)).length;
  const a = st.ambulances.find(x => x.id === sel);
  const job = a && st.emergencies.find(e => e.id === a.emergencyId);
  const eta = job && liveEta(job, st);
  return (
    <>
      <PageHead title="Ambulances" desc="Where every ambulance is, what it is doing, and which ones are free to send.">
        <button className="btn btn-red" onClick={() => nav("/emergencies")}><Icon name="send" />Dispatch an ambulance</button>
      </PageHead>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Kpi label="Total fleet" value={st.ambulances.length} sub="Ambulances in the network" icon="ambulance" />
        <Kpi label="Available" value={count(["available"])} sub="Ready to dispatch" icon="check_circle" tone="text-ok" />
        <Kpi label="On a job" value={count(["dispatched", "at_scene", "to_hospital"])} sub="With or going to a patient" icon="route" tone="text-info" />
        <Kpi label="Out of service" value={count(["out_of_service"])} sub="Maintenance or crew break" icon="build" tone="text-muted" />
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        <div className="xl:col-span-7 card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse min-w-[620px]">
              <thead><tr className="border-b border-line"><th className="th pl-4">Unit</th><th className="th">Status</th><th className="th">Area</th><th className="th">Crew</th><th className="th">Current job</th><th className="th text-right pr-4">Action</th></tr></thead>
              <tbody className="divide-y divide-line">
                {st.ambulances.map(x => (
                  <tr key={x.id} onClick={() => setSel(x.id === sel ? null : x.id)} className={"cursor-pointer " + (sel === x.id ? "bg-soft shadow-[inset_4px_0_0_#D92D20]" : "hover:bg-[#FAFBFC]")}>
                    <td className="td pl-4 font-semibold">{ambName(x.id)}</td>
                    <td className="td"><Dot tone={AMB_STATUS[x.status].tone}>{AMB_STATUS[x.status].label}</Dot></td>
                    <td className="td text-muted">{areaOf(x)}</td>
                    <td className="td text-muted">{x.crew}</td>
                    <td className="td font-mono text-[12px]">{x.emergencyId || "-"}</td>
                    <td className="td text-right pr-4" onClick={ev => ev.stopPropagation()}>
                      {x.status === "available" && <button className="btn btn-line btn-sm" onClick={() => run(() => api("/ambulances/" + x.id + "/toggle", {}), ambName(x.id) + " is out of service")}>Take out of service</button>}
                      {x.status === "out_of_service" && <button className="btn btn-line btn-sm" onClick={() => run(() => api("/ambulances/" + x.id + "/toggle", {}), ambName(x.id) + " is back in service")}>Return to service</button>}
                      {x.emergencyId && <button className="btn btn-line btn-sm" onClick={() => nav("/emergencies/" + x.emergencyId)}>View job</button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="xl:col-span-5 card overflow-hidden">
          <div className="p-4 border-b border-line"><h3 className="text-[16px] font-semibold">{a ? ambName(a.id) : "Fleet map"}</h3><p className="text-muted text-[13px]">{a ? (job ? `On ${job.id}: ${job.type} in ${job.area}` + (eta ? `, about ${eta.min} min ${eta.text}` : "") : AMB_STATUS[a.status].label + " near " + areaOf(a)) : "Select an ambulance in the table to follow it."}</p></div>
          <CityMap amb={sel || undefined} labels={false} />
          <div className="p-4 border-t border-line"><MapLegend /></div>
        </div>
      </div>
    </>
  );
}
