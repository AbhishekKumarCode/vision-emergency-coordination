import { NavLink, Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { useStore } from "./store.jsx";
import { Icon, Loading } from "./components/ui.jsx";
import Overview from "./pages/Overview.jsx";
import Emergencies from "./pages/Emergencies.jsx";
import Ambulances from "./pages/Ambulances.jsx";
import Hospitals from "./pages/Hospitals.jsx";
import HospitalDetail from "./pages/HospitalDetail.jsx";
import Supplies from "./pages/Supplies.jsx";
import Transfers from "./pages/Transfers.jsx";
import Insights from "./pages/Insights.jsx";
import StaffUpdate from "./pages/StaffUpdate.jsx";
import Patient from "./pages/Patient.jsx";
import Conflicts from "./components/Conflicts.jsx";

const NAV = [
  ["Operations", [["/overview", "dashboard", "Overview"], ["/emergencies", "e911_emergency", "Emergencies"], ["/ambulances", "ambulance", "Ambulances"]]],
  ["Resources", [["/hospitals", "local_hospital", "Hospitals"], ["/supplies", "inventory_2", "Supplies"], ["/transfers", "swap_horiz", "Transfers"]]],
  ["Intelligence", [["/insights", "psychology", "AI Insights"]]],
  ["Portals", [["/staff", "edit_note", "Hospital staff update"], ["/patient", "sos", "Patient app"]]]
];

export default function App() {
  const { st, live, api, run } = useStore();
  const nav = useNavigate(), loc = useLocation();
  const role = loc.pathname.startsWith("/patient") ? "/patient" : loc.pathname.startsWith("/staff") ? "/staff" : "/overview";
  const waiting = st ? st.emergencies.filter(e => e.status === "waiting").length : 0;
  return (
    <>
      <aside className="hidden lg:flex fixed left-0 top-0 h-full w-60 bg-white border-r border-line z-40 flex-col justify-between">
        <div className="min-h-0 flex flex-col">
          <div className="h-16 px-4 border-b border-line flex items-center gap-3 shrink-0">
            <div className="w-8 h-8 rounded-lg bg-brand text-white flex items-center justify-center"><Icon name="emergency" /></div>
            <div><div className="text-[18px] font-semibold tracking-tight leading-none">VISION</div><div className="lbl !text-[10px] mt-0.5">Emergency Coordination</div></div>
          </div>
          <nav className="p-2 space-y-4 overflow-y-auto">
            {NAV.map(([group, items]) => (
              <div key={group} className="space-y-0.5">
                <div className="lbl px-3 py-1">{group}</div>
                {items.map(([to, icon, label]) => (
                  <NavLink key={to} to={to} className={({ isActive }) => "flex items-center gap-3 px-3 h-10 rounded-lg transition-colors " + (isActive ? "bg-soft text-[#B50C08] font-semibold shadow-[inset_2px_0_0_#B50C08]" : "text-muted hover:bg-soft hover:text-ink")}>
                    <Icon name={icon} /><span className="flex-1">{label}</span>
                    {to === "/emergencies" && waiting > 0 && <span className="w-5 h-5 rounded-full bg-brand text-white text-[11px] font-bold flex items-center justify-center">{waiting}</span>}
                  </NavLink>
                ))}
              </div>
            ))}
          </nav>
        </div>
        <div className="p-3 border-t border-line space-y-2 shrink-0">
          <label className="lbl block" htmlFor="role">Viewing as</label>
          <select id="role" className="w-full h-9 bg-white border border-line rounded-lg px-2" value={role} onChange={e => nav(e.target.value)}>
            <option value="/overview">Admin (HQ)</option><option value="/staff">Hospital staff</option><option value="/patient">Patient view</option>
          </select>
          <div className="flex items-center gap-2 pt-1"><span className={"w-2 h-2 rounded-full " + (live ? "bg-ok" : "bg-warn")} /><span className="text-[12px] text-muted">{live ? "Live system, simulated data" : "Reconnecting..."}</span></div>
        </div>
      </aside>
      <div className="lg:pl-60 min-h-screen flex flex-col">
        <header className="sticky top-0 h-16 bg-white border-b border-line z-30 flex items-center justify-between px-4 lg:px-6 gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="lg:hidden w-8 h-8 rounded-lg bg-brand text-white flex items-center justify-center shrink-0"><Icon name="emergency" /></div>
            <select aria-label="Go to page" className="lg:hidden h-9 border border-line rounded-lg px-2 bg-white max-w-[180px]" value={"/" + loc.pathname.split("/")[1]} onChange={e => nav(e.target.value)}>
              {NAV.flatMap(g => g[1]).map(([to, , label]) => <option key={to} value={to}>{label}</option>)}
            </select>
            <span className="hidden lg:inline font-mono text-[12px] text-muted bg-soft px-2 py-1 rounded border border-line">Wakanda Emergency Council</span>
            <span className="hidden md:inline text-muted truncate">Emergency Healthcare Network</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="hidden sm:inline-flex items-center gap-1 font-mono text-[11px] text-muted border border-line rounded px-2 py-1" title="Engine used for AI suggestions"><Icon name="psychology" className="!text-[15px]" />{st ? st.ai : "AI"}</span>
            <span className="font-mono text-[11px] text-[#92400E] bg-[#FEF3C7] rounded px-2 py-1">Demo data</span>
            <button className="btn btn-line btn-sm" title="Reset the demo data" onClick={() => run(() => api("/reset", {}), "Demo data was reset")}><Icon name="restart_alt" className="!text-[18px]" /><span className="hidden sm:inline">Reset</span></button>
          </div>
        </header>
        <main className="flex-1 p-4 lg:p-6">
          {st && !loc.pathname.startsWith("/patient") && <Conflicts />}
          {!st ? <Loading text="Connecting to the VISION network..." /> : (
            <Routes>
              <Route path="/overview" element={<Overview />} />
              <Route path="/emergencies" element={<Emergencies />} />
              <Route path="/emergencies/:id" element={<Emergencies />} />
              <Route path="/ambulances" element={<Ambulances />} />
              <Route path="/hospitals" element={<Hospitals />} />
              <Route path="/hospitals/:id" element={<HospitalDetail />} />
              <Route path="/supplies" element={<Supplies />} />
              <Route path="/transfers" element={<Transfers />} />
              <Route path="/insights" element={<Insights />} />
              <Route path="/staff" element={<StaffUpdate />} />
              <Route path="/patient" element={<Patient />} />
              <Route path="*" element={<Navigate to="/overview" replace />} />
            </Routes>
          )}
        </main>
        <footer className="px-4 lg:px-6 py-4 border-t border-line text-[12px] text-muted flex flex-wrap justify-between gap-2">
          <span>Demo data. VISION coordinates dispatch, beds, supplies and transfers. It never diagnoses patients or replaces medical judgement.</span>
          <span>Cognition AI Hackathon · Track 3: Project Vision</span>
        </footer>
      </div>
    </>
  );
}
