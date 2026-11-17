// Shared helpers. The city map is a 100 x 60 grid; 1 unit = 0.2 km.
export const KM = 0.2;
export const km = (a, b) => Math.hypot(a.x - b.x, a.y - b.y) * KM;
export const etaMin = d => Math.max(1, Math.round(d / 0.6));
export const ago = t => { const m = Math.max(0, Math.round((Date.now() - t) / 60000)); return m < 1 ? "just now" : m + " min"; };
export const clock = t => new Date(t).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
export const ambName = id => (id ? id.replace("AMB-0", "Ambulance ") : "None");
export const SEV_ORDER = { Critical: 0, Serious: 1, Moderate: 2 };
export const sortQueue = list => [...list].sort((a, b) => SEV_ORDER[a.severity] - SEV_ORDER[b.severity] || a.createdAt - b.createdAt);
export const EM_STATUS = {
  waiting: { label: "Needs ambulance", tone: "warn", step: 0 },
  en_route: { label: "Ambulance on the way", tone: "info", step: 2 },
  at_scene: { label: "With the patient", tone: "info", step: 3 },
  to_hospital: { label: "Going to hospital", tone: "info", step: 3 },
  completed: { label: "Completed", tone: "ok", step: 4 }
};
export const AMB_STATUS = {
  available: { label: "Available", tone: "ok" },
  dispatched: { label: "Going to patient", tone: "info" },
  at_scene: { label: "With the patient", tone: "info" },
  to_hospital: { label: "Going to hospital", tone: "info" },
  out_of_service: { label: "Out of service", tone: "muted" }
};
export const erWord = n => (n >= 90 ? "Full" : n >= 70 ? "Busy" : "Quiet");
export const AREAS = [["Birnin Zana Sector 4", 38, 30], ["North Corridor", 66, 22], ["Golden City District 3", 26, 20], ["Bashenga Heights", 82, 44], ["Old Market", 48, 48], ["Industrial Ward East", 90, 14], ["River Province", 14, 40]];
export const areaOf = p => AREAS.map(d => [d[0], Math.hypot(d[1] - p.x, d[2] - p.y)]).sort((a, b) => a[1] - b[1])[0][0];
// Live ETA text for an emergency that already has an ambulance.
export function liveEta(e, st) {
  const a = st.ambulances.find(x => x.id === e.ambulanceId), h = st.hospitals.find(x => x.id === e.hospitalId);
  if (!a || !h) return null;
  if (e.status === "en_route") return { min: etaMin(km(a, e)), text: "until the ambulance arrives" };
  if (e.status === "at_scene") return { min: etaMin(km(e, h)), text: "to the hospital once the patient is on board" };
  if (e.status === "to_hospital") return { min: etaMin(km(a, h)), text: "until arrival at " + h.name };
  return null;
}
