import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

// Live application state, refreshed from the API every second.
const Ctx = createContext(null);
export const useStore = () => useContext(Ctx);

export function StoreProvider({ children }) {
  const [st, setSt] = useState(null);
  const [live, setLive] = useState(false);
  const [toast, setToast] = useState("");
  const timer = useRef(0);

  // Poll the API once a second. Polling works on every host, including serverless ones.
  useEffect(() => {
    let stop = false, t = 0;
    const tick = async () => {
      try { const r = await fetch("/api/state", { cache: "no-store" }); if (!r.ok) throw new Error(); const j = await r.json(); if (!stop) { setSt(j); setLive(true); } }
      catch (e) { if (!stop) setLive(false); }
      if (!stop) t = setTimeout(tick, 1000);
    };
    tick();
    return () => { stop = true; clearTimeout(t); };
  }, []);

  const notify = useCallback(msg => { setToast(msg); clearTimeout(timer.current); timer.current = setTimeout(() => setToast(""), 2600); }, []);

  const api = useCallback(async (path, body) => {
    const r = await fetch("/api" + path, body !== undefined ? { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) } : undefined);
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.error || "Something went wrong. Please try again.");
    return j;
  }, []);

  // Run an action and show the result to the user.
  const run = useCallback(async (fn, okMsg) => {
    try { const r = await fn(); if (okMsg) notify(okMsg); return r; } catch (e) { notify(e.message); return null; }
  }, [notify]);

  return (
    <Ctx.Provider value={{ st, live, api, run, notify }}>
      {children}
      {toast && <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-ink text-white px-4 py-2.5 rounded-lg shadow-lg max-w-[90vw] text-center" role="status">{toast}</div>}
    </Ctx.Provider>
  );
}
