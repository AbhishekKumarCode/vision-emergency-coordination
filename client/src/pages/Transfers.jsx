import { useEffect, useState } from "react";
import { useStore } from "../store.jsx";
import { ago, clock } from "../lib.js";
import { AiNote, Chip, Empty, Icon, Loading, PageHead } from "../components/ui.jsx";

const TABS = [["requested", "Requests"], ["in_progress", "In progress"], ["completed", "Completed"]];
const URG = { Urgent: "crit", Soon: "warn", Planned: "info" };

export default function Transfers() {
  const { st, api, run } = useStore();
  const [tab, setTab] = useState("requested");
  const [selId, setSelId] = useState(null);
  const [form, setForm] = useState(null);
  const list = st.transfers.filter(t => t.status === tab);
  const sel = st.transfers.find(t => t.id === selId) || list[0];
  const H = id => st.hospitals.find(h => h.id === id);
  const create = async ev => { ev.preventDefault(); const t = await run(() => api("/transfers", form), "Transfer request created"); if (t) { setForm(null); setTab("requested"); setSelId(t.id); } };
  return (
    <>
      <PageHead title="Patient transfers" desc="Move patients from a full hospital to one with space, with a suggested destination.">
        <button className="btn btn-red" onClick={() => setForm(f => f ? null : { from: st.hospitals[0].id, need: "ICU bed", urgency: "Urgent", reason: "" })}><Icon name="add" />New transfer request</button>
      </PageHead>
      {form && (
        <form onSubmit={create} className="card p-4 mb-6 grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
          <label className="block"><span className="lbl block mb-1">From hospital</span><select className="field" value={form.from} onChange={e => setForm({ ...form, from: e.target.value })}>{st.hospitals.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}</select></label>
          <label className="block"><span className="lbl block mb-1">Bed needed</span><select className="field" value={form.need} onChange={e => setForm({ ...form, need: e.target.value })}><option>ICU bed</option><option>General bed</option></select></label>
          <label className="block"><span className="lbl block mb-1">Urgency</span><select className="field" value={form.urgency} onChange={e => setForm({ ...form, urgency: e.target.value })}><option>Urgent</option><option>Soon</option><option>Planned</option></select></label>
          <label className="block"><span className="lbl block mb-1">Reason</span><input className="field" maxLength={160} placeholder="e.g. ICU is full" value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} /></label>
          <button className="btn btn-red">Create request</button>
        </form>
      )}
      <div className="card p-3 mb-6 flex items-center gap-1 overflow-x-auto">
        {TABS.map(([k, l]) => <button key={k} onClick={() => { setTab(k); setSelId(null); }} className={"px-3 h-10 rounded-lg flex items-center gap-2 shrink-0 " + (tab === k ? "bg-soft text-[#B50C08] font-semibold" : "text-muted hover:bg-soft hover:text-ink")}>{l}<span className="font-mono text-[12px] bg-white border border-line px-1.5 rounded">{st.transfers.filter(t => t.status === k).length}</span></button>)}
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        <div className="xl:col-span-7 card">
          {!list.length ? <Empty text="No transfers in this list." /> : (
            <ul className="divide-y divide-line">{list.map(t => (
              <li key={t.id}><button onClick={() => setSelId(t.id)} className={"w-full text-left p-4 flex items-center justify-between gap-3 " + (sel && sel.id === t.id ? "bg-soft shadow-[inset_4px_0_0_#D92D20]" : "hover:bg-[#FAFBFC]")}>
                <div><div className="font-semibold flex items-center gap-2 flex-wrap">{H(t.from).name}<Icon name="arrow_forward" className="!text-[16px] text-muted" />{t.to ? H(t.to).name : "Destination not chosen"}</div><div className="text-muted text-[13px]">{t.id} · {t.need} · {t.reason} · {ago(t.createdAt)} ago</div></div>
                <Chip tone={URG[t.urgency]}>{t.urgency}</Chip>
              </button></li>
            ))}</ul>
          )}
        </div>
        <div className="xl:col-span-5">{sel ? <TransferDetail key={sel.id} t={sel} /> : <div className="card"><Empty text="Select a transfer to see details." /></div>}</div>
      </div>
    </>
  );
}

function TransferDetail({ t }) {
  const { st, api, run } = useStore();
  const [sug, setSug] = useState(null);
  const H = id => st.hospitals.find(h => h.id === id);
  const key = st.hospitals.map(h => h.icuFree + ":" + h.bedsFree).join();
  useEffect(() => { if (t.status !== "requested") return; let live = true; api("/transfers/" + t.id + "/suggest").then(r => live && setSug(r)).catch(() => live && setSug({ ok: false, message: "Could not load a suggestion." })); return () => { live = false; }; }, [api, t.id, t.status, key]);
  const approve = to => run(() => api("/transfers/" + t.id + "/approve", { to }), "Transfer approved");
  return (
    <div className="card p-5 space-y-4">
      <div className="pb-3 border-b border-line"><div className="lbl">Transfer {t.id}</div><h2 className="text-[20px] font-semibold">From {H(t.from).name}</h2><p className="text-muted">{t.need} · {t.urgency} · {t.reason}</p></div>
      {t.status === "requested" && (!sug ? <Loading text="Finding a hospital with space..." /> : (
        <div className="rounded-lg border-2 border-brand p-4">
          <h3 className="font-semibold text-[#B50C08] flex items-center gap-2 mb-3"><Icon name="psychology" />Suggested destination</h3>
          {!sug.ok ? <p className="bg-[#FEF3C7] text-[#92400E] rounded-lg p-3">{sug.message}</p> : (
            <>
              <p className="bg-[#FFF6F5] border border-[#FFDAD6] rounded-lg p-3 text-[18px] font-semibold mb-3">Move the patient to {sug.toName}.</p>
              <ul className="space-y-2 mb-4">{sug.reasons.map(r => <li key={r} className="flex items-start gap-2"><Icon name="check_circle" className="text-ok !text-[18px] mt-0.5" />{r}</li>)}</ul>
              {sug.alternatives.length > 0 && <div className="border-t border-line pt-3 mb-4"><div className="lbl mb-2">Other options</div><div className="space-y-1.5">{sug.alternatives.map(a => <button key={a.to} onClick={() => approve(a.to)} className="w-full text-left p-2.5 rounded-lg border border-line hover:border-ink flex justify-between gap-3"><span>{a.toName}</span><span className="font-mono text-[12px] text-muted">{a.km} km · {a.icuFree} ICU · ER {a.erLoad}%</span></button>)}</div></div>}
              <button className="btn btn-red w-full" onClick={() => approve(sug.to)}><Icon name="check" />Approve transfer to {sug.toName}</button>
            </>
          )}
          <div className="mt-3 pt-3 border-t border-line"><AiNote /></div>
        </div>
      ))}
      {t.to && <div className="bg-soft rounded-lg p-3"><div className="lbl">Destination</div><div className="font-semibold">{H(t.to).name}</div></div>}
      <div><div className="lbl mb-2">Timeline</div><ol className="space-y-2">{t.timeline.map((x, i) => <li key={i} className="flex items-start gap-3"><span className="font-mono text-[12px] text-muted w-12 shrink-0 pt-0.5">{clock(x.t)}</span><span className="w-2 h-2 rounded-full bg-brand mt-1.5 shrink-0" /><span>{x.text}</span></li>)}</ol></div>
    </div>
  );
}
