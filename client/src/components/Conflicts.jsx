import { useStore } from "../store.jsx";
import { ambName } from "../lib.js";
import { Icon } from "./ui.jsx";

// Bed conflicts: a walk-in patient needs a bed that is reserved for an incoming ambulance.
// The dispatcher has a short time to decide; after that the recommended option is applied.
export default function Conflicts() {
  const { st, api, run } = useStore();
  if (!st || !st.conflicts.length) return null;
  const resolve = (c, choice) => run(() => api("/conflicts/" + c.id + "/resolve", { choice }), choice === "reroute" ? ambName(c.ambulanceId) + " re-routed" : "Reservation kept, transfer created");
  return (
    <div className="space-y-3 mb-6">
      {st.conflicts.map(c => {
        const pct = Math.max(0, Math.min(100, (c.secondsLeft / c.totalSeconds) * 100));
        const Opt = ({ choice, title, sub, disabled }) => (
          <button disabled={disabled} onClick={() => resolve(c, choice)} className={"flex-1 text-left rounded-lg p-3 border-2 transition-colors disabled:opacity-50 disabled:pointer-events-none " + (c.recommended === choice ? "border-brand bg-[#FFF6F5]" : "border-line bg-white hover:border-ink")}>
            <span className="flex items-center gap-2 font-semibold">{title}{c.recommended === choice && <span className="font-mono text-[10px] uppercase tracking-wider bg-brand text-white rounded px-1.5 py-0.5">Recommended</span>}</span>
            <span className="block text-muted text-[13px] mt-0.5">{sub}</span>
          </button>
        );
        return (
          <div key={c.id} className="card border-2 !border-brand overflow-hidden" role="alert">
            <div className="p-4">
              <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-brand/10 text-brand flex items-center justify-center shrink-0"><Icon name="bed" className="!text-[24px]" /></div>
                  <div>
                    <h2 className="text-[16px] font-semibold">Bed conflict at {c.hospitalName}</h2>
                    <p className="text-muted">A walk-in patient needs an {c.label}, but the last one is reserved for {c.emergencyId} ({ambName(c.ambulanceId)}{c.remaining != null ? ", arriving in " + c.remaining + " min" : ""}).</p>
                  </div>
                </div>
                <div className="text-right shrink-0"><div className="text-[28px] leading-8 font-semibold text-brand font-mono">{c.secondsLeft}s</div><div className="text-[12px] text-muted">to decide</div></div>
              </div>
              <p className="mb-3 flex items-start gap-2"><Icon name="psychology" className="text-brand !text-[18px] mt-0.5 shrink-0" /><span><b>Time rule:</b> {c.why}</span></p>
              <div className="flex flex-col md:flex-row gap-3">
                <Opt choice="keep" title="Keep the reservation" sub={"The ambulance patient keeps the bed. A transfer is created for the walk-in patient."} />
                <Opt choice="reroute" disabled={!c.alt} title={c.alt ? "Give the bed to the walk-in" : "Re-route not possible"} sub={c.alt ? `${ambName(c.ambulanceId)} is re-routed to ${c.alt.name}, about ${c.alt.eta} min.` : "No other hospital has a suitable bed."} />
              </div>
              <p className="text-[12px] text-muted mt-3">If nobody decides in time, the safe default applies: the reservation is kept and a transfer is created for the walk-in patient. Who is treated first is a clinical decision; VISION only manages beds and routes.</p>
            </div>
            <div className="h-1 bg-[#FFDAD6]"><div className="h-full bg-brand transition-[width] duration-1000 ease-linear" style={{ width: pct + "%" }} /></div>
          </div>
        );
      })}
    </div>
  );
}
