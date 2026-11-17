// Vercel serverless entry: every /api/* request is routed here (see vercel.json).
const core = require("../core.js");
module.exports = (req, res) => core.handle(req, res);
