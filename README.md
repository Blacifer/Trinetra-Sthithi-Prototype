# Trinetra Sthiti — Prototype (Rasi Solutions)

**One-sentence:** Trinetra Sthiti is a real-time, explainable safety grid for mass gatherings — it senses crowd, environmental and kiosk signals, predicts risk, and performs humane interventions (Shanti Pulse) while guiding operators with clear recommended actions.

## Contents
- `server/` — Node.js backend (Express + Socket.IO). Endpoints:
  - `POST /api/sensor-update` — push sensor readings (used by simulator)
  - `POST /api/trigger-shanti` — force a demo Shanti Pulse
  - `GET  /api/forecast` — per-zone forecast (minutesToBreach, confidence)
  - `GET  /api/metrics` — pulsesTriggered, totalEvents, avgZli, zone list
- `client/` — React + Vite dashboard (modern UI, heatmap, Copilot, analytics, Demo Mode)
- `simulator/` — Python sensor simulator (pushes realistic data to server)
- `run_all.sh` — optional helper to start server + simulator + client in one terminal
- `README.md` — this file

## Why this matters (for judges)
- **Reactive + proactive**: real-time ZLI monitoring plus short-term forecasts that say “Zone X likely to breach in N min (confidence Y)”.
- **Explainable actions**: Operator Copilot shows top contributors and suggests actions (dispatch staff, Shanti Pulse).
- **Memorable UX**: Shanti Pulse is a humane calming action (visual ripple + audio) that demonstrates autonomous mitigation.
- **Demo-ready**: one-click deterministic demo that forces surge → pulse → recovery for presentation.

## Quick start — single terminal (recommended)
> Use `run_all.sh` to start the entire stack and tail logs in one terminal.

```bash
# from project root (first time only)
chmod +x run_all.sh

# start server + simulator + client and tail logs
./run_all.sh start