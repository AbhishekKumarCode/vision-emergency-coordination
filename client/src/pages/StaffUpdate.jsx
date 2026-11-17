import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useStore } from "../store.jsx";
import { ago, ambName, erWord, liveEta } from "../lib.js";
import { HospStatus, Icon, PageHead, SupplyStatus } from "../components/ui.jsx";

const ER = [["Quiet", 40], ["Busy", 78], ["Full", 96]];
const fromServer = h => ({ icuFree: h.icuFree, bedsFree: h.bedsFree, er: erWord(h.erLoad), supplies: Object.fromEntries(Object.entries(h.supplies).map(([k, s]) => [k, s.stock])) });

// All hospitals on one page. Each row can be edited and saved on its own, or all changes can be saved together.
export default function StaffUpdate() {
  const { st, api, run, notify } = useStore();
  const [sp] = useSearchParams();
  const [drafts, setDrafts] = useState({});          // unsaved edits, by hospital id
  const [open, setOpen] = useState(() => (st.hospitals.some(h => h.id === sp.get("h")) ? { [sp.get("h")]: true } : {}));
  const [saving, setSaving] = useState(false);
  const [q, setQ] = useState("");

  const val = h => drafts[h.id] || fromServer(h);
  const edit = (h, change) => setDrafts(d => ({ ...d, [h.id]: { ...(d[h.id] || fromServer(h)), ...change } }));
  const discard = id => setDrafts(d => { const n = { ...d }; delete n[id]; return n; });
  const payload = v => ({ icuFree: v.icuFree, bedsFree: v.bedsFree, erLoad: ER.find(e => e[0] === v.er)[1], supplies: v.supplies });
  const dirty = Object.keys(drafts);

  const save = async h => { setSaving(true); const r = await run(() => api("/hospitals/" + h.id, payload(drafts[h.id])), h.name + " saved. Dispatchers can see it now."); if (r) discard(h.id); setSaving(false); };
  const saveAll = async () => {
    setSaving(true); let ok = 0;
    for (const id of dirty) { try { await api("/hospitals/" + id, payload(drafts[id])); ok++; discard(id); } catch (e) { notify(e.message); } }
    if (ok) notify(ok + " hospital" + (ok === 1 ? "" : "s") + " saved. Dispatchers can see the updates now.");
    setSaving(false);
  };
  const walkIn = async (h, kind) => { const r = await run(() => api("/hospitals/" + h.id + "/walkin", { kind })); if (r) { notify(r.message); if (drafts[h.id]) edit(h, { icuFree: r.icuFree, bedsFree: r.bedsFree }); } };

  const list = st.hospitals.filter(h => h.name.toLowerCase().includes(q.toLowerCase()));
  return (
    <>
      <PageHead title="Update hospitals" desc="Keep beds and stock up to date for every hospital. Dispatchers see each saved change immediately.">
        <div className="relative"><Icon name="search" className="absolute left-3 top-3 text-muted" /><input className="field pl-10 !w-56" placeholder="Find a hospital" aria-label="Find a hospital" value={q} onChange={e => setQ(e.target.value)} /></div>
        <button className="btn btn-red" disabled={!dirty.length || saving} onClick={saveAll}><Icon name="cloud_upload" />{dirty.length ? `Save all changes (${dirty.length})` : "No changes to save"}</button>
      </PageHead>

      <div className="space-y-4">
        {list.map(h => {
          const v = val(h), isDirty = !!drafts[h.id], isOpen = !!open[h.id];
          const incoming = st.emergencies.filter(e => e.hospitalId === h.id && e.status !== "completed");
          const Stepper = ({ label, k, max, reserved }) => (
            <div>
              <div className="text-[13px] text-muted mb-1">{label}{reserved > 0 && <span className="text-[#92400E]"> · {reserved} reserved</span>}</div>
              <div className="flex items-center gap-2">
                <button className="btn btn-line !w-10 !h-10 !px-0" aria-label={`Decrease ${label} at ${h.name}`} onClick={() => edit(h, { [k]: Math.max(0, v[k] - 1) })}><Icon name="remove" /></button>
                <span className="text-[22px] font-semibold w-12 text-center tabular-nums">{v[k]}</span>
                <button className="btn btn-line !w-10 !h-10 !px-0" aria-label={`Increase ${label} at ${h.name}`} onClick={() => edit(h, { [k]: Math.min(max, v[k] + 1) })}><Icon name="add" /></button>
                <span className="text-[13px] text-muted">of {max + reserved}</span>
              </div>
            </div>
          );
          return (
            <section key={h.id} className={"card " + (isDirty ? "!border-warn" : "")} aria-label={h.name}>
              <div className="p-4 flex flex-col xl:flex-row xl:items-center gap-4">
                <div className="xl:w-56 shrink-0">
                  <div className="flex items-center gap-2 flex-wrap"><h2 className="text-[16px] font-semibold">{h.name}</h2><HospStatus s={h.status} /></div>
                  <p className="text-[12px] text-muted mt-0.5">{isDirty ? <span className="text-[#92400E] font-semibold">Unsaved changes</span> : "Updated " + ago(h.updatedAt) + " ago"}{incoming.length > 0 && ` · ${incoming.length} incoming`}</p>
                </div>
                <div className="flex flex-wrap items-end gap-x-6 gap-y-3 flex-1">
                  <Stepper label="ICU beds free" k="icuFree" max={h.icuTotal - h.icuReserved} reserved={h.icuReserved} />
                  <Stepper label="General beds free" k="bedsFree" max={h.bedsTotal - h.bedsReserved} reserved={h.bedsReserved} />
                  <div>
                    <div className="text-[13px] text-muted mb-1">Emergency room</div>
                    <div className="inline-flex rounded-lg border border-line overflow-hidden" role="group" aria-label={"Emergency room status at " + h.name}>
                      {ER.map(([l]) => <button key={l} onClick={() => edit(h, { er: l })} className={"h-10 px-3.5 font-semibold text-[13px] " + (v.er === l ? "bg-ink text-white" : "bg-white text-muted hover:text-ink")}>{l}</button>)}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {isDirty && <button className="btn btn-line btn-sm !w-[34px] !px-0" title="Discard changes" aria-label={"Discard changes for " + h.name} onClick={() => discard(h.id)}><Icon name="undo" className="!text-[18px]" /></button>}
                  <button className="btn btn-red btn-sm" disabled={!isDirty || saving} onClick={() => save(h)}>Save</button>
                  <button className="btn btn-line btn-sm" aria-expanded={isOpen} onClick={() => setOpen(o => ({ ...o, [h.id]: !o[h.id] }))}>{isOpen ? "Less" : "Supplies and walk-ins"}<Icon name={isOpen ? "expand_less" : "expand_more"} className="!text-[18px]" /></button>
                </div>
              </div>

              {isOpen && (
                <div className="border-t border-line p-4 grid grid-cols-1 xl:grid-cols-12 gap-6">
                  <div className="xl:col-span-7">
                    <h3 className="lbl mb-2">Critical supplies in stock</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {Object.entries(h.supplies).map(([k, s]) => { const n = v.supplies[k], stt = n <= 0 ? "Out" : n < s.min ? "Low" : "OK"; return (
                        <label key={k} className="rounded-lg border border-line p-3 flex items-center justify-between gap-3">
                          <span><span className="font-semibold block">{s.label}</span><span className="text-muted text-[12px]">Minimum {s.min}</span></span>
                          <span className="flex items-center gap-2"><input type="number" min="0" max="9999" className="field !w-24 !h-10 text-right tabular-nums" value={n} onChange={e => edit(h, { supplies: { ...v.supplies, [k]: Math.max(0, Math.min(9999, Math.round(+e.target.value || 0))) } })} /><SupplyStatus s={stt} /></span>
                        </label>
                      ); })}
                    </div>
                  </div>
                  <div className="xl:col-span-5 space-y-4">
                    <div>
                      <h3 className="lbl mb-2">Walk-in patient arrived</h3>
                      <p className="text-muted text-[13px] mb-2">Admit a patient who came in directly. If the only bed left is reserved for an ambulance, the dispatcher gets a short countdown to decide.</p>
                      <div className="grid grid-cols-2 gap-2"><button className="btn btn-red btn-sm !h-10" onClick={() => walkIn(h, "icu")}>Admit to ICU bed</button><button className="btn btn-line btn-sm !h-10" onClick={() => walkIn(h, "bed")}>Admit to general bed</button></div>
                    </div>
                    <div>
                      <h3 className="lbl mb-2">Incoming patients</h3>
                      {!incoming.length ? <p className="text-muted text-[13px]">No patients are on the way right now.</p> : (
                        <ul className="divide-y divide-line border border-line rounded-lg">{incoming.map(e => { const eta = liveEta(e, st); return <li key={e.id} className="p-3"><div className="font-semibold">{e.type} <span className="text-[12px] text-muted tabular-nums">{e.id}</span></div><div className="text-muted text-[13px]">{ambName(e.ambulanceId)} · {e.bed} reserved{eta ? " · about " + eta.min + " min" : ""}</div></li>; })}</ul>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </section>
          );
        })}
        {!list.length && <div className="card p-8 text-center text-muted">No hospital matches "{q}".</div>}
      </div>
    </>
  );
}
