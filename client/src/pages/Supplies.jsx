import { useEffect, useState } from "react";
import { useStore } from "../store.jsx";
import { AiNote, Empty, Icon, Kpi, PageHead, SupplyStatus } from "../components/ui.jsx";

const ITEMS = [["oxygen", "Oxygen cylinders"], ["blood", "Blood units"], ["ventilators", "Ventilators"], ["medicines", "Key medicines"]];

export default function Supplies() {
  const { st, api, run } = useStore();
  const [sug, setSug] = useState(null);
  const [hidden, setHidden] = useState([]);
  const key = st.hospitals.map(h => Object.values(h.supplies).map(s => s.stock).join()).join("|");
  useEffect(() => { let live = true; api("/supplies/suggestions").then(r => live && setSug(r)).catch(() => live && setSug([])); return () => { live = false; }; }, [api, key]);
  const all = st.hospitals.flatMap(h => Object.entries(h.supplies).map(([k, s]) => ({ h, k, s })));
  const low = all.filter(x => x.s.status === "Low"), out = all.filter(x => x.s.status === "Out");
  const affected = new Set([...low, ...out].map(x => x.h.id)).size;
  const shown = (sug || []).filter(s => !hidden.includes(s.id));
  return (
    <>
      <PageHead title="Supplies" desc="Critical stock at every hospital, with shortages flagged and a suggested fix." />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <Kpi label="Items running low" value={low.length} sub="Below the minimum level" icon="warning" tone="text-warn" />
        <Kpi label="Items out of stock" value={out.length} sub="Need immediate action" icon="error" tone="text-brand" />
        <Kpi label="Hospitals affected" value={affected} sub={"Out of " + st.hospitals.length} icon="local_hospital" tone="text-info" />
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        <div className="xl:col-span-7 space-y-6">
          <div className="card">
            <div className="p-4 border-b border-line"><h3 className="text-[16px] font-semibold">Alerts</h3></div>
            {![...out, ...low].length ? <Empty icon="task_alt" text="All supplies are above their minimum level." /> : (
              <ul className="divide-y divide-line">{[...out, ...low].map(x => (
                <li key={x.h.id + x.k} className="p-4 flex items-center justify-between gap-3"><span className="flex items-center gap-3"><Icon name={x.s.status === "Out" ? "error" : "warning"} className={x.s.status === "Out" ? "text-brand" : "text-warn"} /><span><b>{x.s.label}</b> {x.s.status === "Out" ? "have run out" : "are low"} at <b>{x.h.name}</b> ({x.s.stock} in stock, minimum {x.s.min})</span></span><SupplyStatus s={x.s.status} /></li>
              ))}</ul>
            )}
          </div>
          <div className="card overflow-hidden">
            <div className="p-4 border-b border-line"><h3 className="text-[16px] font-semibold">Stock by hospital</h3></div>
            <div className="overflow-x-auto"><table className="w-full border-collapse min-w-[600px]">
              <thead><tr className="border-b border-line"><th className="th pl-4">Hospital</th>{ITEMS.map(([k, l]) => <th key={k} className="th">{l}</th>)}</tr></thead>
              <tbody className="divide-y divide-line">{st.hospitals.map(h => (
                <tr key={h.id}><td className="td pl-4 font-semibold">{h.name}</td>{ITEMS.map(([k]) => <td key={k} className="td"><div className="flex items-center gap-2"><span className="font-mono w-9">{h.supplies[k].stock}</span><SupplyStatus s={h.supplies[k].status} /></div></td>)}</tr>
              ))}</tbody>
            </table></div>
          </div>
        </div>
        <div className="xl:col-span-5 card p-4">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-line"><h3 className="text-[16px] font-semibold text-[#B50C08] flex items-center gap-2"><Icon name="psychology" />Suggested re-allocation</h3><span className="font-mono text-[11px] text-muted bg-soft px-2 py-0.5 rounded">{st.ai}</span></div>
          {sug === null ? <p className="text-muted p-4 text-center">Checking stock levels...</p> : !shown.length ? <Empty icon="task_alt" text="No stock needs to move right now." /> : (
            <div className="space-y-3">{shown.map(s => (
              <div key={s.id} className="rounded-lg border border-line p-4">
                <p className="text-[16px] font-semibold">{s.text}.</p><p className="text-muted mt-1 mb-3">{s.why}</p>
                <div className="flex gap-2"><button className="btn btn-red btn-sm" onClick={() => run(() => api("/supplies/reallocate", s), "Stock moved to " + s.toName)}>Approve</button><button className="btn btn-line btn-sm" onClick={() => setHidden(h => [...h, s.id])}>Dismiss</button></div>
              </div>
            ))}</div>
          )}
          <div className="mt-4 pt-3 border-t border-line"><AiNote /></div>
        </div>
      </div>
    </>
  );
}
