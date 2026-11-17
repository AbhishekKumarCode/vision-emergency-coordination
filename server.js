/* VISION server for local use and any Node host (Render, Railway, a VM).
   Serves the REST API from core.js and the built React app from client/dist. */
const http = require("http"), fs = require("fs"), path = require("path");
const core = require("./core.js");
const PORT = process.env.PORT || 3000;
const DIST = path.join(__dirname, "client", "dist");
const MIME = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".png": "image/png", ".ico": "image/x-icon", ".json": "application/json" };

http.createServer((req, res) => {
  const p = new URL(req.url, "http://x").pathname;
  if (p.startsWith("/api/")) return core.handle(req, res);
  const file = path.join(DIST, path.normalize(p === "/" ? "/index.html" : p).replace(/^(\.\.[\/\\])+/, ""));
  if (!file.startsWith(DIST)) { res.writeHead(403); return res.end("Forbidden"); }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404, { "content-type": "text/plain" }); return res.end("Not found. Run: npm run build"); }
    res.writeHead(200, { "content-type": MIME[path.extname(file)] || "application/octet-stream" }); res.end(data);
  });
}).listen(PORT, () => console.log("VISION running on http://localhost:" + PORT));

// Keep the simulation moving and push live updates to connected streams.
setInterval(() => { core.advance(); core.broadcast(); }, 1000);
