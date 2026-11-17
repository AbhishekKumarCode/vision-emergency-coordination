import { useStore } from "../store.jsx";

// Schematic city map (100 x 60 units). Shows hospitals, ambulances and active emergencies live.
export default function CityMap({ focus, amb, pick, onPick, labels = true, className = "" }) {
  const { st } = useStore();
  if (!st) return null;
  const ems = st.emergencies.filter(e => e.status !== "completed");
  const H = id => st.hospitals.find(h => h.id === id), A = id => st.ambulances.find(a => a.id === id);
  const routes = ems.filter(e => e.ambulanceId && (!focus || e.id === focus) && (!amb || e.ambulanceId === amb)).map(e => {
    const a = A(e.ambulanceId), h = H(e.hospitalId);
    const pts = e.status === "en_route" ? [a, e, h] : [a, h];
    return { id: e.id, d: pts.map(p => p.x.toFixed(1) + "," + p.y.toFixed(1)).join(" ") };
  });
  const click = ev => {
    if (!onPick) return;
    const r = ev.currentTarget.getBoundingClientRect();
    onPick({ x: Math.round(((ev.clientX - r.left) / r.width) * 100), y: Math.round(((ev.clientY - r.top) / r.height) * 60) });
  };
  const ambFill = s => (s === "available" ? "#111827" : s === "out_of_service" ? "#9CA3AF" : "#B45309");
  return (
    <div className={"relative bg-[#EEF2F6] overflow-hidden " + className} style={{ aspectRatio: "100 / 60" }}>
      <svg viewBox="0 0 100 60" className={"absolute inset-0 w-full h-full " + (onPick ? "cursor-crosshair" : "")} onClick={click} role="img" aria-label="City map with hospitals, ambulances and emergencies">
        <defs><pattern id="grid" width="5" height="5" patternUnits="userSpaceOnUse"><path d="M5 0H0V5" fill="none" stroke="#E2E8F0" strokeWidth=".15" /></pattern></defs>
        <rect width="100" height="60" fill="url(#grid)" />
        <path d="M-5,34 C18,28 30,50 55,42 C72,36 84,48 105,40" fill="none" stroke="#D3E2F4" strokeWidth="3.2" strokeLinecap="round" />
        <path d="M12,-2 L16,62 M-2,16 L102,16 M46,-2 L42,62 M-2,38 L102,38 M78,-2 L80,62" fill="none" stroke="#CBD5E1" strokeWidth=".7" />
        {routes.map(r => <polyline key={r.id} points={r.d} fill="none" stroke="#D92D20" strokeWidth=".5" strokeDasharray="1.4 1" />)}
        {st.hospitals.map(h => (
          <g key={h.id}>
            <rect x={h.x - 2.2} y={h.y - 2.2} width="4.4" height="4.4" rx=".9" fill={h.status === "Diverting" ? "#6B7280" : "#2563EB"} stroke="#fff" strokeWidth=".4" />
            <text x={h.x} y={h.y + .8} textAnchor="middle" fontSize="2.3" fontWeight="700" fill="#fff">{h.icuFree}</text>
            {labels && <text x={h.x} y={h.y + 4.6} textAnchor="middle" fontSize="1.55" fontWeight="600" fill="#374151">{h.name}</text>}
          </g>
        ))}
        {st.ambulances.map(a => (
          <g key={a.id} opacity={amb && amb !== a.id ? 0.35 : 1}>
            <rect x={a.x - 1.5} y={a.y - 1.5} width="3" height="3" rx=".6" fill={ambFill(a.status)} stroke="#fff" strokeWidth=".35" />
            <text x={a.x} y={a.y + .6} textAnchor="middle" fontSize="1.7" fontWeight="700" fill="#fff">{+a.id.slice(-2)}</text>
          </g>
        ))}
        {ems.map(e => (
          <g key={e.id} opacity={focus && focus !== e.id ? 0.4 : 1}>
            {e.status === "waiting" && <circle cx={e.x} cy={e.y} r="1.6" fill="#D92D20" className="pulse" />}
            <circle cx={e.x} cy={e.y} r="1.6" fill="#D92D20" stroke="#fff" strokeWidth=".45" />
            <text x={e.x} y={e.y + .65} textAnchor="middle" fontSize="1.9" fontWeight="800" fill="#fff">!</text>
            {labels && <text x={e.x} y={e.y - 2.4} textAnchor="middle" fontSize="1.45" fontWeight="700" fill="#B50C08">{e.id}</text>}
          </g>
        ))}
        {pick && <g><circle cx={pick.x} cy={pick.y} r="2.6" fill="#D92D20" opacity=".2" /><circle cx={pick.x} cy={pick.y} r="1.3" fill="#D92D20" stroke="#fff" strokeWidth=".45" /></g>}
      </svg>
    </div>
  );
}

export const MapLegend = () => (
  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-muted">
    <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-brand" />Emergency</span>
    <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-[#111827]" />Ambulance free</span>
    <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-[#B45309]" />Ambulance on a job</span>
    <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-info" />Hospital (number = ICU beds free)</span>
  </div>
);
