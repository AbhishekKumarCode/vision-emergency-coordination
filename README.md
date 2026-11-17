# VISION · Emergency Healthcare Coordination

Cognition AI Hackathon (TechTonics 2026) · **Track 3: Project Vision, Emergency Healthcare Resource Allocation**

VISION connects patients, ambulances, hospitals and administrators during crisis events. A patient sends an SOS, the system suggests the best ambulance and hospital, an administrator approves, and every screen updates live.

> VISION coordinates dispatch, beds, supplies and transfers. It never diagnoses patients, prescribes treatment or replaces medical judgement. AI only suggests; a person approves every action.

## Features

| Area | What it does |
|---|---|
| Patient app | SOS request (map pin, urgency, type), live ambulance status and ETA, nearby hospitals, pharmacies and blood banks |
| Overview | Situation summary, key numbers, live city map, activity feed, "needs action" queue |
| Emergencies | Queue sorted by urgency and waiting time, AI dispatch suggestion with reasons and alternatives, manual override |
| Ambulances | Fleet status, live position and route, take in or out of service |
| Hospitals | ICU and general beds, emergency room load, Accepting / Limited / Diverting, detail page with incoming patients |
| Supplies | Stock matrix, low and out-of-stock alerts, AI re-allocation between hospitals |
| Transfers | Patient transfer requests, AI-suggested destination, approval and timeline |
| AI Insights | Written situation summary, 6-hour ICU forecast, hospitals likely to reach capacity, suggested actions |
| Hospital staff | Update beds, emergency room status and stock; dispatchers see it immediately |

## How the AI works

1. **Scoring engine (always on).** Ranks every free ambulance by distance and every hospital by distance, free ICU or general beds, emergency room load, a matching specialist unit and oxygen stock. Hospitals that are diverting or have no bed are excluded.
2. **Language model (optional).** If `GEMINI_API_KEY` or `ANTHROPIC_API_KEY` is set, a model writes the plain-language explanation and the situation summary from the engine's facts. It is instructed to never give medical advice. If no key is set or the call fails, the engine's own explanation is shown, so the app never breaks.

## Tech

- **Frontend:** React 19, Vite, Tailwind CSS, React Router (`client/`)
- **Backend:** Node.js REST API with a live simulation (`core.js`), zero dependencies
- **Hosting:** Vercel (static build + `api/index.js` function) or any Node host (`server.js`)

## Run locally

```bash
npm run build     # installs and builds the React app
npm start         # http://localhost:3000
```

For development, run `npm run dev:api` and `npm run dev:web` in two terminals (the web app proxies `/api` to port 3000).

Optional: `GEMINI_API_KEY=...` or `ANTHROPIC_API_KEY=...` to enable model-written explanations.

## API

`GET /api/state` · `POST /api/sos` · `GET /api/emergencies/:id/recommend` · `POST /api/emergencies/:id/dispatch` · `POST /api/ambulances/:id/toggle` · `POST /api/hospitals/:id` · `GET /api/supplies/suggestions` · `POST /api/supplies/reallocate` · `POST /api/transfers` · `GET /api/transfers/:id/suggest` · `POST /api/transfers/:id/approve` · `GET /api/insights` · `POST /api/simulate` · `POST /api/reset`

## Notes and limits

- All data is simulated demo data with fictional hospitals. The map is a schematic city grid (20 x 12 km).
- State is kept in memory. On Vercel it lives in the running function instance, so it resets when the instance restarts. A database (for example Postgres) is the next step for production.
- Ambulances move faster than real time so the demo flow completes in under a minute.

## Built with AI

Designed with Google Stitch and built with Claude Code during the hackathon.
