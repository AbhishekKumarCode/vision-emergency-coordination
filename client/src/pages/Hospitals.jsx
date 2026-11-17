import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useStore } from "../store.jsx";
import { ago, erWord } from "../lib.js";
import { Bar, HospStatus, Icon, Kpi, PageHead, SupplyStatus } from "../components/ui.jsx";

export default function Hospitals() {
  const { st } = useStore();
  const nav = useNavigate();
  const [sort, setSort] = useState("icu");
  const [only, setOnly] = useState(false);
  const list = useMemo(() => {
    const l = st.hospitals.filter(h => !only || h.icuFree > 0);
    return [...l].sort((a, b) => sort === "icu" ? b.icuFree - a.icuFree : sort === "er" ? a.erLoad - b.erLoad : a.name.localeCompare(b.name));
  }, [st.hospitals, sort, only]);
  const n = s => st.hospitals.filter(h => h.status === s).length;
  return (
    <>
      <PageHead title="Hospitals" desc="Which hospitals have space right now, and which are under pressure.">
        <button className="btn btn-line" onClick={() => nav("/staff")}><Icon name="edit_note" />Update a hospital</button>
      </PageHead>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Kpi label="Accepting" value={n("Accepting")} sub="Normal capacity" icon="check_circle" tone="text-ok" />
        <Kpi label="Limited" value={n("Limited")} sub="Busy, still taking patients" icon="warning" tone="text-warn" />
        <Kpi label="Diverting" value={n("Diverting")} sub="Full, send patients elsewhere" icon="block" tone="text-brand" />
        <Kpi label="ICU beds free" value={st.hospitals.reduce((s, h) => s + h.icuFree, 0)} sub="Across the region" icon="bed" tone="text-info" />
      </div>
      <div className="card p-3 mb-6 flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2"><span className="text-muted">Sort by</span>
          <select className="field !w-auto !h-10" value={sort} onChange={e => setSort(e.target.value)}><option value="icu">Most ICU beds free</option><option value="er">Quietest emergency room</option><option value="name">Name</option></select></label>
        <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" className="w-4 h-4 accent-[#D92D20]" checked={only} onChange={e => setOnly(e.target.checked)} />Only hospitals with a free ICU bed</label>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {list.map(h => (
          <button key={h.id} onClick={() => nav("/hospitals/" + h.id)} className="card p-5 text-left hover:border-ink transition-colors">
            <div className="flex items-start justify-between gap-2 mb-4"><div><h3 className="text-[18px] font-semibold">{h.name}</h3><p className="text-muted text-[13px]">{h.specialties.join(" · ")}</p><p className={"text-[12px] mt-0.5 " + (Date.now() - h.updatedAt > 600000 ? "text-[#92400E] font-semibold" : "text-muted")}>Updated {ago(h.updatedAt)} ago{Date.now() - h.updatedAt > 600000 ? " · may be out of date" : ""}</p></div><HospStatus s={h.status} /></div>
            <div className="space-y-3">
              <div><div className="flex justify-between mb-1"><span>ICU beds free{h.icuReserved > 0 && <span className="text-[#92400E]"> · {h.icuReserved} reserved</span>}</span><b>{h.icuFree} / {h.icuTotal}</b></div><Bar value={h.icuTotal - h.icuFree} max={h.icuTotal} /></div>
              <div><div className="flex justify-between mb-1"><span>General beds free</span><b>{h.bedsFree} / {h.bedsTotal}</b></div><Bar value={h.bedsTotal - h.bedsFree} max={h.bedsTotal} /></div>
              <div><div className="flex justify-between mb-1"><span>Emergency room</span><b>{erWord(h.erLoad)} ({h.erLoad}%)</b></div><Bar value={h.erLoad} /></div>
            </div>
            <div className="flex items-center justify-between mt-4 pt-3 border-t border-line"><span className="flex items-center gap-2 text-muted">Oxygen <SupplyStatus s={h.supplies.oxygen.status} /></span><span className="text-info font-semibold flex items-center gap-1">Details<Icon name="chevron_right" className="!text-[18px]" /></span></div>
          </button>
        ))}
      </div>
    </>
  );
}
