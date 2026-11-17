/* VISION core: state, simulation, AI recommendations and the REST API handler.
   Used by server.js (local / any Node host) and by api/index.js (Vercel function). Zero dependencies. */
const KM = 0.2;                       // 1 map unit = 0.2 km (city is 20 x 12 km)
const SPEED = 1.5;                    // map units per tick (demo speed)
const km = (a, b) => Math.hypot(a.x - b.x, a.y - b.y) * KM;
const etaMin = d => Math.max(1, Math.round(d / 0.6));   // ~36 km/h
const now = () => Date.now();
const DISTRICTS = [["Birnin Zana Sector 4", 38, 30], ["North Corridor", 66, 22], ["Golden City District 3", 26, 20], ["Bashenga Heights", 82, 44], ["Old Market", 48, 48], ["Industrial Ward East", 90, 14], ["River Province", 14, 40]];
const areaOf = p => DISTRICTS.map(d => [d[0], Math.hypot(d[1] - p.x, d[2] - p.y)]).sort((a, b) => a[1] - b[1])[0][0];
const SPECIALTY = { "Chest pain": "Cardiac", "Accident": "Trauma", "Breathing problem": "Respiratory", "Pregnancy": "Maternity", "Burns": "Burns" };
const HOLD_MIN = 5;                   // a reserved bed is protected when the ambulance is this close (minutes)
const DECIDE_MS = 15000;              // time the dispatcher has to decide a bed conflict (short, because the demo runs faster than real time)
const ITEMS = { oxygen: "Oxygen cylinders", blood: "Blood units", ventilators: "Ventilators", medicines: "Key medicines" };

let S, seq, clients = [];
function seed() {
  const sup = (o, b, v, m) => ({ oxygen: { stock: o, min: 60 }, blood: { stock: b, min: 40 }, ventilators: { stock: v, min: 6 }, medicines: { stock: m, min: 80 } });
  seq = { sos: 145, tr: 12 };
  S = {
    hospitals: [
      { id: "H1", name: "Central General", x: 52, y: 18, icuTotal: 12, icuFree: 2, bedsTotal: 120, bedsFree: 21, erLoad: 64, specialties: ["Cardiac", "Trauma", "Respiratory"], supplies: sup(180, 95, 14, 210) },
      { id: "H2", name: "Riverside Medical", x: 20, y: 42, icuTotal: 14, icuFree: 6, bedsTotal: 140, bedsFree: 34, erLoad: 89, specialties: ["Maternity", "Respiratory"], supplies: sup(38, 70, 9, 150) },
      { id: "H3", name: "Northgate Clinic", x: 74, y: 10, icuTotal: 6, icuFree: 0, bedsTotal: 60, bedsFree: 4, erLoad: 97, specialties: ["Trauma"], supplies: sup(75, 22, 5, 60) },
      { id: "H4", name: "Eastside Hospital", x: 86, y: 36, icuTotal: 10, icuFree: 4, bedsTotal: 100, bedsFree: 27, erLoad: 52, specialties: ["Burns", "Trauma", "Cardiac"], supplies: sup(140, 88, 11, 175) },
      { id: "H5", name: "Harbour Medical", x: 40, y: 52, icuTotal: 8, icuFree: 3, bedsTotal: 90, bedsFree: 18, erLoad: 58, specialties: ["Maternity", "Cardiac"], supplies: sup(96, 51, 8, 72) },
      { id: "H6", name: "St. Marin Clinic", x: 10, y: 14, icuTotal: 4, icuFree: 1, bedsTotal: 40, bedsFree: 9, erLoad: 41, specialties: ["Respiratory"], supplies: sup(64, 44, 4, 110) }
    ],
    ambulances: [[1, 48, 22], [2, 22, 38], [3, 60, 12], [4, 84, 32], [5, 42, 48], [6, 12, 18], [7, 30, 26], [8, 70, 40], [9, 56, 34]].map(([n, x, y], i) => ({ id: "AMB-0" + n, x, y, status: n === 8 ? "out_of_service" : "available", crew: ["Okoye / Ayo", "Nakia / Zuri", "M'Baku / Aneka", "Shuri / Tolu", "Ramonda / Idris", "W'Kabi / Lina", "Everett / Nia", "Maintenance", "Dora / Kemi"][i], emergencyId: null, wait: 0 })),
    emergencies: [
      { id: "SOS-0142", type: "Chest pain", severity: "Critical", x: 38, y: 30, notes: "Caller reports chest tightness, conscious.", phone: "", createdAt: now() - 3 * 60000, status: "waiting", ambulanceId: null, hospitalId: null },
      { id: "SOS-0143", type: "Accident", severity: "Serious", x: 66, y: 24, notes: "Two vehicles involved on the highway.", phone: "", createdAt: now() - 5 * 60000, status: "waiting", ambulanceId: null, hospitalId: null },
      { id: "SOS-0144", type: "Breathing problem", severity: "Serious", x: 26, y: 20, notes: "Difficulty breathing, needs oxygen support.", phone: "", createdAt: now() - 8 * 60000, status: "waiting", ambulanceId: null, hospitalId: null }
    ],
    transfers: [
      { id: "TR-0011", from: "H3", to: null, need: "ICU bed", urgency: "Urgent", reason: "ICU is full at Northgate Clinic", status: "requested", createdAt: now() - 6 * 60000, timeline: [{ t: now() - 6 * 60000, text: "Transfer requested by Northgate Clinic" }], ticks: 0 }
    ],
    services: [
      { name: "CityCare Pharmacy", kind: "Pharmacies", x: 44, y: 26, note: "Open 24 hours" }, { name: "Golden City Pharmacy", kind: "Pharmacies", x: 24, y: 24, note: "Open until 11 pm" }, { name: "Harbour Chemists", kind: "Pharmacies", x: 46, y: 50, note: "Open 24 hours" },
      { name: "Central Blood Bank", kind: "Blood banks", x: 56, y: 22, note: "All groups available" }, { name: "Riverside Blood Centre", kind: "Blood banks", x: 18, y: 38, note: "O- and B- running low" }
    ],
    events: [], responseTimes: [7, 6, 9], startedAt: now(), conflicts: []
  };
  S.hospitals.forEach(h => { h.icuReserved = 0; h.bedsReserved = 0; });
  seq.cf = 1;
  S.emergencies.forEach(e => e.area = areaOf(e));
  log("Riverside Medical reported oxygen below minimum level", "warn");
  log("Northgate Clinic is diverting: ICU full", "crit");
  log("VISION network online: 6 hospitals, 9 ambulances connected", "ok");
}
function log(text, kind = "info") { S.events.unshift({ t: now(), text, kind }); S.events = S.events.slice(0, 40); }
const H = id => S.hospitals.find(h => h.id === id), A = id => S.ambulances.find(a => a.id === id), E = id => S.emergencies.find(e => e.id === id);
const hStatus = h => (h.icuFree <= 0 || h.erLoad >= 95) ? "Diverting" : (h.erLoad >= 80 || h.bedsFree < 8) ? "Limited" : "Accepting";
const supStatus = s => s.stock <= 0 ? "Out" : s.stock < s.min ? "Low" : "OK";

function publicState() {
  return {
    hospitals: S.hospitals.map(h => ({ ...h, status: hStatus(h), supplies: Object.fromEntries(Object.entries(h.supplies).map(([k, v]) => [k, { ...v, status: supStatus(v), label: ITEMS[k] }])) })),
    ambulances: S.ambulances, emergencies: S.emergencies.map(({ phone, ...e }) => e), transfers: S.transfers, services: S.services,
    conflicts: S.conflicts.filter(c => c.status === "open").map(c => ({ ...c, secondsLeft: Math.max(0, Math.round((c.deadline - now()) / 1000)), totalSeconds: DECIDE_MS / 1000, remaining: remainingMin(E(c.emergencyId)) })), events: S.events.slice(0, 14),
    avgResponse: +(S.responseTimes.reduce((a, b) => a + b, 0) / S.responseTimes.length).toFixed(1),
    ai: process.env.GEMINI_API_KEY ? "Gemini" : process.env.ANTHROPIC_API_KEY ? "Claude" : "Rules engine", t: now()
  };
}
function broadcast() { const d = "data: " + JSON.stringify(publicState()) + "\n\n"; clients.forEach(c => c.write(d)); }

/* ---------- AI: scoring engine + optional LLM explanation ---------- */
async function llm(prompt) {
  const ctl = new AbortController(), to = setTimeout(() => ctl.abort(), 7000);
  try {
    if (process.env.GEMINI_API_KEY) {
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${process.env.GEMINI_MODEL || "gemini-2.0-flash"}:generateContent?key=${process.env.GEMINI_API_KEY}`, { method: "POST", signal: ctl.signal, headers: { "content-type": "application/json" }, body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }) });
      const j = await r.json(); return j.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || null;
    }
    if (process.env.ANTHROPIC_API_KEY) {
      const r = await fetch("https://api.anthropic.com/v1/messages", { method: "POST", signal: ctl.signal, headers: { "content-type": "application/json", "x-api-key": process.env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01" }, body: JSON.stringify({ model: process.env.ANTHROPIC_MODEL || "claude-haiku-5-5", max_tokens: 300, messages: [{ role: "user", content: prompt }] }) });
      const j = await r.json(); return j.content?.[0]?.text?.trim() || null;
    }
  } catch (e) { } finally { clearTimeout(to); }
  return null;
}
const GUARD = "You are a logistics assistant for an emergency coordination centre. You only coordinate ambulances, beds and supplies. Never diagnose, never give medical or treatment advice. Reply in plain English, max 2 short sentences, no markdown.";

function rankHospitals(p, needICU, spec) {
  return S.hospitals.map(h => {
    const d = km(p, h), ok = (needICU ? h.icuFree > 0 : h.bedsFree > 0) && hStatus(h) !== "Diverting";
    const match = spec && h.specialties.includes(spec);
    const score = d + h.erLoad * 0.08 - (match ? 3 : 0) - Math.min(h.icuFree, 4) * 0.4 + (supStatus(h.supplies.oxygen) !== "OK" ? 1.5 : 0) + (ok ? 0 : 1000);
    return { h, d, ok, match, score };
  }).sort((a, b) => a.score - b.score);
}
function recommend(e) {
  const needICU = e.severity === "Critical", spec = SPECIALTY[e.type];
  const ambs = S.ambulances.filter(a => a.status === "available").map(a => ({ a, d: km(a, e) })).sort((x, y) => x.d - y.d);
  const hs = rankHospitals(e, needICU, spec).filter(x => x.ok);
  if (!ambs.length || !hs.length) return { ok: false, message: !ambs.length ? "No ambulance is free right now. The request stays at the top of the queue." : "No hospital has a free bed right now. Consider a transfer or update hospital capacity." };
  const opt = (am, ho) => ({ ambulanceId: am.a.id, ambKm: +am.d.toFixed(1), ambEta: etaMin(am.d), hospitalId: ho.h.id, hospitalName: ho.h.name, hospKm: +ho.d.toFixed(1), totalEta: etaMin(am.d) + etaMin(ho.d), icuFree: ho.h.icuFree, bedsFree: ho.h.bedsFree, erLoad: ho.h.erLoad, match: ho.match });
  const best = opt(ambs[0], hs[0]);
  const reasons = [
    `Nearest free ambulance: ${best.ambulanceId} is ${best.ambKm} km away, about ${best.ambEta} min`,
    needICU ? `${best.hospitalName} has ${best.icuFree} ICU bed${best.icuFree === 1 ? "" : "s"} free` : `${best.hospitalName} has ${best.bedsFree} beds free`,
    hs[1] ? `Emergency room is less busy (${best.erLoad}% full vs ${hs[1].h.erLoad}% at ${hs[1].h.name})` : `Emergency room load is ${best.erLoad}%`
  ];
  if (best.match) reasons.push(`Has a ${spec.toLowerCase()} unit that fits this type of request`);
  const alternatives = [];
  if (hs[1]) alternatives.push(opt(ambs[0], hs[1]));
  if (ambs[1]) alternatives.push(opt(ambs[1], hs[0]));
  return { ok: true, best, reasons, alternatives, headline: `Send ${best.ambulanceId.replace("AMB-0", "Ambulance ")} to ${best.hospitalName}.`, source: "Rules engine" };
}

/* ---------- beds: free / reserved / occupied, walk-ins and time-based conflict rule ---------- */
const FK = k => (k === "icu" ? "icuFree" : "bedsFree"), RK = k => (k === "icu" ? "icuReserved" : "bedsReserved");
function reserve(h, kind, n) { h[FK(kind)] -= n; h[RK(kind)] += n; }      // free -> reserved
// Minutes until the ambulance of an emergency reaches its hospital.
function remainingMin(e) {
  if (!e || !e.ambulanceId) return null; const a = A(e.ambulanceId), h = H(e.hospitalId);
  if (e.status === "en_route") return etaMin(km(a, e)) + etaMin(km(e, h));
  if (e.status === "at_scene") return etaMin(km(e, h));
  if (e.status === "to_hospital") return etaMin(km(a, h));
  return null;
}
function altHospital(e, excludeId) {
  const r = rankHospitals(e, e.bedKind === "icu", SPECIALTY[e.type]).filter(x => x.ok && x.h.id !== excludeId)[0];
  if (!r) return null; const a = A(e.ambulanceId);
  const eta = e.status === "en_route" ? etaMin(km(a, e)) + etaMin(km(e, r.h)) : etaMin(km(e.status === "at_scene" ? e : a, r.h));
  return { hospitalId: r.h.id, name: r.h.name, eta };
}
function walkIn(h, kind) {
  const label = kind === "icu" ? "ICU bed" : "bed";
  if (h[FK(kind)] > 0) { h[FK(kind)]--; h.erLoad = Math.min(100, h.erLoad + 2); log(`Walk-in patient admitted to an ${label} at ${h.name}`, "info"); return { outcome: "admitted", message: `Walk-in admitted. ${h.name} now has ${h[FK(kind)]} ${label}s free.` }; }
  const held = S.emergencies.filter(e => e.hospitalId === h.id && e.bedKind === kind && ["en_route", "at_scene", "to_hospital"].includes(e.status) && !S.conflicts.some(c => c.status === "open" && c.emergencyId === e.id))
    .map(e => ({ e, rem: remainingMin(e) })).sort((a, b) => b.rem - a.rem)[0];
  if (!held) { const t = newTransfer(h, kind === "icu" ? "ICU bed" : "General bed", "Urgent", `Walk-in patient, no free ${label} at ${h.name}`); return { outcome: "transfer", transferId: t.id, message: `No ${label} is free or reserved here. A transfer request was created for the walk-in patient.` }; }
  const alt = altHospital(held.e, h.id), protect = held.rem <= HOLD_MIN || !alt;
  const c = { id: "BC-" + (seq.cf++), hospitalId: h.id, hospitalName: h.name, kind, label, emergencyId: held.e.id, ambulanceId: held.e.ambulanceId, alt, recommended: protect ? "keep" : "reroute",
    why: !alt ? "No other hospital has a suitable bed, so the ambulance cannot be re-routed." : protect ? `The ambulance arrives in ${held.rem} min, inside the ${HOLD_MIN}-minute hold window, so the reserved bed stays protected.` : `The ambulance is still ${held.rem} min away, outside the ${HOLD_MIN}-minute hold window, and ${alt.name} can take that patient.`,
    createdAt: now(), deadline: now() + DECIDE_MS, status: "open" };
  S.conflicts.unshift(c); log(`Bed conflict at ${h.name}: walk-in needs the ${label} reserved for ${held.e.id}`, "crit");
  return { outcome: "conflict", conflictId: c.id, message: `The last ${label} is reserved for ${held.e.id}. The dispatcher has ${DECIDE_MS / 1000} seconds to decide.` };
}
function newTransfer(f, need, urgency, reason) {
  const t = { id: "TR-00" + (seq.tr++), from: f.id, to: null, need, urgency, reason, status: "requested", createdAt: now(), timeline: [{ t: now(), text: `Transfer requested by ${f.name}` }], ticks: 0 };
  S.transfers.unshift(t); log(`${f.name} requested a patient transfer (${need})`, "warn"); return t;
}
function resolveConflict(c, choice, by) {
  if (!c || c.status !== "open") return "This conflict is already resolved.";
  const e = E(c.emergencyId), h = H(c.hospitalId), who = by === "timer" ? `automatically after ${DECIDE_MS / 1000} s with no decision` : "by the dispatcher";
  let alt = e && e.status !== "completed" ? altHospital(e, h.id) : null;
  if (choice === "reroute" && !alt) choice = "keep";
  if (choice === "reroute") {
    h[RK(c.kind)]--;                                  // the reserved bed goes to the walk-in (now occupied)
    const nh = H(alt.hospitalId); reserve(nh, c.kind, 1); e.hospitalId = nh.id; e.rerouted = true;
    log(`${e.ambulanceId} re-routed to ${nh.name}; walk-in takes the ${c.label} at ${h.name} (${who})`, "warn");
    c.result = `Walk-in admitted at ${h.name}. ${e.ambulanceId} re-routed to ${nh.name}.`;
  } else {
    const t = newTransfer(h, c.kind === "icu" ? "ICU bed" : "General bed", "Urgent", `Walk-in patient: the ${c.label} is held for ${c.emergencyId}`);
    log(`Reservation kept for ${c.emergencyId} at ${h.name}; walk-in will be transferred (${who})`, "info");
    c.result = `Reservation kept. Transfer ${t.id} created for the walk-in patient.`;
  }
  c.status = "resolved"; c.choice = choice; c.by = by; return null;
}

function dispatch(e, ambId, hospId) {
  const a = A(ambId), h = H(hospId);
  if (!e || e.status !== "waiting") return "This emergency is already being handled.";
  if (!a || a.status !== "available") return "That ambulance is no longer free.";
  if (!h) return "Hospital not found.";
  const icu = e.severity === "Critical";
  if (icu ? h.icuFree <= 0 : h.bedsFree <= 0) return "That hospital has no free bed.";
  reserve(h, icu ? "icu" : "bed", 1);
  e.bedKind = icu ? "icu" : "bed"; e.bed = icu ? "ICU bed" : "bed";
  Object.assign(e, { status: "en_route", ambulanceId: a.id, hospitalId: h.id, dispatchedAt: now() });
  Object.assign(a, { status: "dispatched", emergencyId: e.id });
  S.responseTimes.push(Math.round((now() - e.createdAt) / 60000) + etaMin(km(a, e))); S.responseTimes = S.responseTimes.slice(-12);
  log(`${a.id} dispatched to ${e.id} (${e.type}, ${e.area})`, "info");
  log(`${h.name} reserved an ${e.bed} for ${e.id}`, "ok");
  return null;
}

function supplySuggestions() {
  const out = [];
  S.hospitals.forEach(h => Object.entries(h.supplies).forEach(([k, v]) => {
    if (v.stock >= v.min) return;
    const donor = S.hospitals.filter(d => d.id !== h.id).map(d => ({ d, surplus: d.supplies[k].stock - Math.round(d.supplies[k].min * 1.5) })).filter(x => x.surplus > 0).sort((a, b) => b.surplus - a.surplus)[0];
    if (!donor) return;
    const qty = Math.min(donor.surplus, Math.round(v.min * 1.3) - v.stock);
    out.push({ id: h.id + k, to: h.id, toName: h.name, from: donor.d.id, fromName: donor.d.name, item: k, label: ITEMS[k], qty, text: `Move ${qty} ${ITEMS[k].toLowerCase()} from ${donor.d.name} to ${h.name}`, why: `${h.name} has ${v.stock} (minimum ${v.min}). ${donor.d.name} has ${donor.d.supplies[k].stock}, well above its minimum of ${donor.d.supplies[k].min}.` });
  }));
  return out;
}
function transferSuggestion(t) {
  const from = H(t.from), spec = null;
  const r = rankHospitals(from, t.need === "ICU bed", spec).filter(x => x.ok && x.h.id !== from.id);
  if (!r.length) return { ok: false, message: "No hospital can receive this patient right now." };
  const b = r[0];
  return { ok: true, to: b.h.id, toName: b.h.name, km: +b.d.toFixed(1), eta: etaMin(b.d), reasons: [`${b.h.name} has ${t.need === "ICU bed" ? b.h.icuFree + " ICU beds" : b.h.bedsFree + " beds"} free`, `${b.d.toFixed(1)} km away, about ${etaMin(b.d)} min by ambulance`, `Emergency room is ${b.h.erLoad}% full`], alternatives: r.slice(1, 3).map(x => ({ to: x.h.id, toName: x.h.name, km: +x.d.toFixed(1), icuFree: x.h.icuFree, erLoad: x.h.erLoad })) };
}
function forecast() {
  const hours = [0, 1, 2, 3, 4, 5, 6];
  const per = S.hospitals.map(h => { const rate = Math.max(-0.4, (h.erLoad - 55) / 28); const series = hours.map(t => Math.max(0, Math.min(h.icuTotal, +(h.icuFree - rate * t).toFixed(1)))); const full = rate > 0 ? +(h.icuFree / rate).toFixed(1) : null; return { id: h.id, name: h.name, series, hoursToFull: h.icuFree <= 0 ? 0 : (full !== null && full <= 6 ? full : null), erLoad: h.erLoad }; });
  return { hours, per, total: hours.map((_, i) => +per.reduce((s, p) => s + p.series[i], 0).toFixed(1)) };
}

/* ---------- simulation tick ---------- */
function step(a, target) { const dx = target.x - a.x, dy = target.y - a.y, d = Math.hypot(dx, dy); if (d <= SPEED) { a.x = target.x; a.y = target.y; return true; } a.x += dx / d * SPEED; a.y += dy / d * SPEED; return false; }
function tickOnce() {
  S.ambulances.forEach(a => {
    const e = a.emergencyId && E(a.emergencyId); if (!e) return;
    if (a.status === "dispatched") { if (step(a, e)) { a.status = "at_scene"; a.wait = 3; e.status = "at_scene"; log(`${a.id} reached the patient for ${e.id}`, "ok"); } }
    else if (a.status === "at_scene") { if (--a.wait <= 0) { a.status = "to_hospital"; e.status = "to_hospital"; log(`${a.id} is taking the patient to ${H(e.hospitalId).name}`, "info"); } }
    else if (a.status === "to_hospital") { const h = H(e.hospitalId); if (step(a, h)) { e.status = "completed"; e.completedAt = now(); h[RK(e.bedKind || "bed")] = Math.max(0, h[RK(e.bedKind || "bed")] - 1); h.erLoad = Math.min(100, h.erLoad + 3); a.status = "available"; a.emergencyId = null; log(`${e.id} completed: patient handed over at ${h.name}`, "ok"); } }
  });
  S.transfers.forEach(t => { if (t.status === "in_progress" && ++t.ticks >= 14) { t.status = "completed"; t.timeline.push({ t: now(), text: `Patient received at ${H(t.to).name}` }); log(`Transfer ${t.id} completed at ${H(t.to).name}`, "ok"); } });
}
// The simulation is advanced lazily from the clock, so it also works on serverless hosts with no background timer.
let lastTick = Date.now();
function advance() { let n = Math.min(45, Math.floor((Date.now() - lastTick) / 1000)); if (n > 0) { lastTick = Date.now(); while (n--) tickOnce(); }
  // Time constraint: an undecided bed conflict is settled by the recommended option when its deadline passes.
  S.conflicts.forEach(c => { if (c.status !== "open") return; const e = E(c.emergencyId); if (!e || e.status === "completed") resolveConflict(c, "keep", "timer"); else if (now() >= c.deadline) resolveConflict(c, c.recommended, "timer"); }); }

/* ---------- http ---------- */
const send = (res, code, obj) => { res.writeHead(code, { "content-type": "application/json", "cache-control": "no-store" }); res.end(JSON.stringify(obj)); };
const body = req => new Promise(r => { if (req.body !== undefined) { try { return r(typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {})); } catch (e) { return r({}); } } let b = ""; req.on("data", c => { b += c; if (b.length > 1e5) req.destroy(); }); req.on("end", () => { try { r(JSON.parse(b || "{}")); } catch (e) { r({}); } }); });
const clampN = (v, a, b) => Math.max(a, Math.min(b, Math.round(Number(v) || 0)));
const txt = (v, n) => String(v || "").slice(0, n);

async function handle(req, res) {
  const u = new URL(req.url, "http://x"), m = req.method;
  // On Vercel the original path arrives in the __p query parameter (see vercel.json).
  const p = u.searchParams.get("__p") != null ? "/api/" + u.searchParams.get("__p") : u.pathname;
  try {
    advance();
    if (p === "/api/state") return send(res, 200, publicState());
    if (p === "/api/stream") { res.writeHead(200, { "content-type": "text/event-stream", "cache-control": "no-cache", connection: "keep-alive", "x-accel-buffering": "no" }); res.write("data: " + JSON.stringify(publicState()) + "\n\n"); clients.push(res); req.on("close", () => { clients = clients.filter(c => c !== res); }); return; }
    if (p === "/api/sos" && m === "POST") {
      const b = await body(req);
      const e = { id: "SOS-0" + (seq.sos++), type: ["Accident", "Chest pain", "Breathing problem", "Pregnancy", "Burns", "Other"].includes(b.type) ? b.type : "Other", severity: ["Critical", "Serious", "Moderate"].includes(b.severity) ? b.severity : "Serious", x: clampN(b.x, 2, 98), y: clampN(b.y, 2, 58), notes: txt(b.notes, 200), phone: txt(b.phone, 20), createdAt: now(), status: "waiting", ambulanceId: null, hospitalId: null };
      e.area = areaOf(e); S.emergencies.unshift(e); log(`New SOS ${e.id}: ${e.type} (${e.severity}) in ${e.area}`, e.severity === "Critical" ? "crit" : "warn"); broadcast(); return send(res, 200, e);
    }
    if (p === "/api/simulate" && m === "POST") {
      const types = ["Accident", "Chest pain", "Breathing problem", "Pregnancy", "Burns"], sev = ["Critical", "Serious", "Serious", "Moderate"];
      const e = { id: "SOS-0" + (seq.sos++), type: types[Math.floor(Math.random() * types.length)], severity: sev[Math.floor(Math.random() * sev.length)], x: 8 + Math.random() * 84, y: 6 + Math.random() * 48, notes: "Simulated request for the demo.", phone: "", createdAt: now(), status: "waiting", ambulanceId: null, hospitalId: null };
      e.area = areaOf(e); S.emergencies.unshift(e); log(`New SOS ${e.id}: ${e.type} (${e.severity}) in ${e.area}`, e.severity === "Critical" ? "crit" : "warn"); broadcast(); return send(res, 200, e);
    }
    let mt;
    if ((mt = p.match(/^\/api\/emergencies\/([\w-]+)\/recommend$/))) {
      const e = E(mt[1]); if (!e) return send(res, 404, { error: "Not found" });
      const r = recommend(e);
      if (r.ok && u.searchParams.get("explain") !== "0") {
        const t = await llm(`${GUARD}\nExplain to the dispatcher why this plan is sensible. Request: ${e.type}, urgency ${e.severity}, area ${e.area}. Plan: ${r.headline} Facts: ${r.reasons.join("; ")}.`);
        if (t) { r.explanation = t; r.source = publicState().ai; }
      }
      return send(res, 200, r);
    }
    if ((mt = p.match(/^\/api\/emergencies\/([\w-]+)\/dispatch$/)) && m === "POST") { const b = await body(req), err = dispatch(E(mt[1]), b.ambulanceId, b.hospitalId); if (err) return send(res, 400, { error: err }); broadcast(); return send(res, 200, { ok: true }); }
    if ((mt = p.match(/^\/api\/ambulances\/([\w-]+)\/toggle$/)) && m === "POST") { const a = A(mt[1]); if (!a) return send(res, 404, { error: "Not found" }); if (a.status === "available") { a.status = "out_of_service"; log(`${a.id} marked out of service`, "warn"); } else if (a.status === "out_of_service") { a.status = "available"; log(`${a.id} is back in service`, "ok"); } else return send(res, 400, { error: "This ambulance is on a job." }); broadcast(); return send(res, 200, { ok: true }); }
    if ((mt = p.match(/^\/api\/hospitals\/(\w+)$/)) && m === "POST") {
      const h = H(mt[1]); if (!h) return send(res, 404, { error: "Not found" }); const b = await body(req);
      if (b.icuFree != null) h.icuFree = clampN(b.icuFree, 0, h.icuTotal - h.icuReserved);
      if (b.bedsFree != null) h.bedsFree = clampN(b.bedsFree, 0, h.bedsTotal - h.bedsReserved);
      if (b.erLoad != null) h.erLoad = clampN(b.erLoad, 0, 100);
      if (b.supplies) Object.keys(h.supplies).forEach(k => { if (b.supplies[k] != null) h.supplies[k].stock = clampN(b.supplies[k], 0, 9999); });
      h.updatedAt = now(); log(`${h.name} updated its availability: ${h.icuFree} ICU beds, ${h.bedsFree} beds free`, "info"); broadcast(); return send(res, 200, { ok: true });
    }
    if ((mt = p.match(/^\/api\/hospitals\/(\w+)\/walkin$/)) && m === "POST") { const h = H(mt[1]); if (!h) return send(res, 404, { error: "Not found" }); const b = await body(req), r = walkIn(h, b.kind === "icu" ? "icu" : "bed"); broadcast(); return send(res, 200, { ...r, icuFree: h.icuFree, bedsFree: h.bedsFree }); }
    if ((mt = p.match(/^\/api\/conflicts\/([\w-]+)\/resolve$/)) && m === "POST") { const b = await body(req), c = S.conflicts.find(x => x.id === mt[1]), err = resolveConflict(c, b.choice === "reroute" ? "reroute" : "keep", "dispatcher"); if (err) return send(res, 400, { error: err }); broadcast(); return send(res, 200, { ok: true, result: c.result }); }
    if (p === "/api/supplies/suggestions") return send(res, 200, supplySuggestions());
    if (p === "/api/supplies/reallocate" && m === "POST") {
      const b = await body(req), f = H(b.from), t = H(b.to), k = b.item, q = clampN(b.qty, 1, 9999);
      if (!f || !t || f === t || typeof k !== "string" || !Object.hasOwn(ITEMS, k) || f.supplies[k].stock < q) return send(res, 400, { error: "That stock is no longer available." });
      f.supplies[k].stock -= q; t.supplies[k].stock += q; log(`${q} ${ITEMS[k].toLowerCase()} moved from ${f.name} to ${t.name}`, "ok"); broadcast(); return send(res, 200, { ok: true });
    }
    if (p === "/api/transfers" && m === "POST") {
      const b = await body(req), f = H(b.from); if (!f) return send(res, 400, { error: "Choose a hospital." });
      const t = { id: "TR-00" + (seq.tr++), from: f.id, to: null, need: b.need === "General bed" ? "General bed" : "ICU bed", urgency: ["Urgent", "Soon", "Planned"].includes(b.urgency) ? b.urgency : "Urgent", reason: txt(b.reason, 160) || "Capacity", status: "requested", createdAt: now(), timeline: [{ t: now(), text: `Transfer requested by ${f.name}` }], ticks: 0 };
      S.transfers.unshift(t); log(`${f.name} requested a patient transfer (${t.need})`, "warn"); broadcast(); return send(res, 200, t);
    }
    if ((mt = p.match(/^\/api\/transfers\/([\w-]+)\/suggest$/))) { const t = S.transfers.find(x => x.id === mt[1]); if (!t) return send(res, 404, { error: "Not found" }); return send(res, 200, transferSuggestion(t)); }
    if ((mt = p.match(/^\/api\/transfers\/([\w-]+)\/approve$/)) && m === "POST") {
      const t = S.transfers.find(x => x.id === mt[1]), b = await body(req), to = H(b.to);
      if (!t || t.status !== "requested" || !to) return send(res, 400, { error: "This transfer cannot be approved." });
      const icu = t.need === "ICU bed"; if (icu ? to.icuFree <= 0 : to.bedsFree <= 0) return send(res, 400, { error: "That hospital has no free bed." });
      if (icu) { to.icuFree--; H(t.from).icuFree = Math.min(H(t.from).icuTotal, H(t.from).icuFree + 1); } else { to.bedsFree--; H(t.from).bedsFree = Math.min(H(t.from).bedsTotal, H(t.from).bedsFree + 1); }
      t.to = to.id; t.status = "in_progress"; t.ticks = 0; t.timeline.push({ t: now(), text: `Approved by dispatcher: ${to.name} reserved a bed` }, { t: now(), text: "Patient is being moved" });
      log(`Transfer ${t.id} approved: ${H(t.from).name} to ${to.name}`, "ok"); broadcast(); return send(res, 200, { ok: true });
    }
    if (p === "/api/insights") {
      const st = publicState(), f = forecast(), waiting = S.emergencies.filter(e => e.status === "waiting"), free = S.ambulances.filter(a => a.status === "available").length;
      const icuFree = S.hospitals.reduce((s, h) => s + h.icuFree, 0), icuTot = S.hospitals.reduce((s, h) => s + h.icuTotal, 0), risk = f.per.filter(x => x.hoursToFull !== null).sort((a, b) => a.hoursToFull - b.hoursToFull), sug = supplySuggestions();
      let summary = `${waiting.length} emergenc${waiting.length === 1 ? "y is" : "ies are"} waiting for dispatch and ${free} ambulance${free === 1 ? " is" : "s are"} free. ICU capacity across the region is ${Math.round((1 - icuFree / icuTot) * 100)}% used, with ${icuFree} beds free. ` + (risk.length ? `${risk[0].name} ${risk[0].hoursToFull === 0 ? "has no ICU beds left" : "is likely to run out of ICU beds in about " + risk[0].hoursToFull + " hours"}, so new critical cases should go elsewhere. ` : "No hospital is forecast to run out of ICU beds in the next 6 hours. ") + (sug.length ? `${sug.length} supply shortage${sug.length === 1 ? "" : "s"} can be fixed by moving stock between hospitals.` : "Supplies are above minimum everywhere.");
      let source = "Rules engine";
      const t = await llm(`${GUARD}\nWrite a 3-sentence situation briefing for the emergency council from this data, using only these facts: ${summary}`);
      if (t) { summary = t; source = st.ai; }
      return send(res, 200, { summary, source, forecast: f, risk, supply: sug, divert: S.hospitals.filter(h => hStatus(h) === "Diverting").map(h => h.name) });
    }
    if (p === "/api/reset" && m === "POST") { seed(); broadcast(); return send(res, 200, { ok: true }); }
    return send(res, 404, { error: "Unknown endpoint" });
  } catch (e) { send(res, 500, { error: "Server error" }); }
}
seed();
module.exports = { handle, advance, broadcast };
