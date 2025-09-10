// client/src/App.jsx
import React, { useEffect, useState, useRef } from "react";
import { io } from "socket.io-client";
import "./DashboardModern.css";

const SERVER_URL = import.meta.env.VITE_SERVER_URL || "http://localhost:4000";
const ZONES = [
  { id: "GHAT1", label: "Ghat 1" },
  { id: "GHAT2", label: "Ghat 2" },
  { id: "MAIN",  label: "Main Gate" }
];

function computeAlerts(zonesState) {
  const alerts = [];
  Object.values(zonesState).forEach((z) => {
    if (!z) return;
    if (z.crowd >= 700) alerts.push({ level: "critical", text: `Crowd critical @ ${z.id} (${z.crowd})` });
    else if (z.crowd >= 300) alerts.push({ level: "warn", text: `Crowd elevated @ ${z.id} (${z.crowd})` });
    if (z.noise >= 90) alerts.push({ level: "warn", text: `Noise high @ ${z.id} (${z.noise})` });
    if (z.zli >= 60) alerts.push({ level: "warn", text: `ZLI elevated @ ${z.id} (${z.zli})` });
  });
  return alerts;
}

/* AI suggestion rules (deterministic; client-side for demo).
   Returns suggestions sorted by priority (critical -> warn -> info -> monitor) and people descending. */
function computeAISuggestions(zonesState) {
  const suggestions = [];
  Object.values(zonesState).forEach((z) => {
    if (!z) return;
    const { id, crowd = 0, noise = 0, temp = null, zli = 0 } = z;

    // Critical (highest priority)
    if (zli >= 90 || crowd >= 700) {
      suggestions.push({
        zone: id,
        title: `Immediate surveillance recommended`,
        level: "critical",
        rationale: `ZLI ${zli} and crowd ${crowd} — high risk of crowding.`,
        people: crowd || 0
      });
      return;
    }

    // Heat-related (info)
    if (temp != null && temp >= 36) {
      suggestions.push({
        zone: id,
        title: `Heat stress risk — suggest water points`,
        level: "info",
        rationale: `Temperature ${Number(temp).toFixed(1)}°C — provide extra water & shade.`,
        people: crowd
      });
    }

    // Noise/ZLI warning
    if (zli >= 50 || noise >= 85) {
      suggestions.push({
        zone: id,
        title: `Increase patrols / crowd control`,
        level: "warn",
        rationale: `ZLI ${zli}, noise ${Number(noise).toFixed(1)} dB — potential agitation.`,
        people: crowd
      });
    }

    // Fallback monitor
    if (crowd >= 200 && zli < 50) {
      suggestions.push({
        zone: id,
        title: `Crowd growing — monitor & prepare`,
        level: "monitor",
        rationale: `Crowd ${crowd} — keep mobilised staff nearby.`,
        people: crowd
      });
    }
  });

  const order = { critical: 0, warn: 1, info: 2, monitor: 3 };
  suggestions.sort((a, b) => (order[a.level] - order[b.level]) || (b.people - a.people));
  return suggestions;
}

export default function App() {
  const [connected, setConnected] = useState(false);
  const [messages, setMessages] = useState([]);
  const [zonesState, setZonesState] = useState({});
  const [autoCountdown, setAutoCountdown] = useState(null);
  const socketRef = useRef(null);

  useEffect(() => {
    const socket = io(SERVER_URL, { transports: ["websocket", "polling"], autoConnect: true });
    socketRef.current = socket;

    socket.on("connect", () => {
      setConnected(true);
      setMessages((m) => [{ type: "info", data: `connected (${socket.id})`, t: Date.now() }, ...m].slice(0, 500));
    });

    socket.on("disconnect", (reason) => {
      setConnected(false);
      setMessages((m) => [{ type: "info", data: `disconnected (${reason})`, t: Date.now() }, ...m].slice(0, 500));
    });

    socket.on("sensor", (s) => {
      const zoneId = s.zone || s.zoneId || s.zone_id || "UNKNOWN";
      const reading = {
        id: zoneId,
        crowd: s.crowdCount ?? s.crowd ?? 0,
        noise: s.noiseDb ?? s.noise ?? 0,
        temp: s.avgTemp ?? s.temp ?? null,
        zli: s.zli ?? s.zli ?? 0,
        t: s.t ?? Date.now()
      };
      setZonesState((prev) => ({ ...prev, [zoneId]: reading }));
      setMessages((m) => [{ type: "sensor", data: reading, t: reading.t }, ...m].slice(0, 500));
    });

    socket.on("action", (a) => setMessages((m) => [{ type: "action", data: a, t: Date.now() }, ...m].slice(0, 500)));
    socket.on("predicted", (p) => setMessages((m) => [{ type: "predicted", data: p, t: Date.now() }, ...m].slice(0, 500)));

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  const sendTestAction = (zone = "GHAT1") => {
    if (!socketRef.current || !connected) return;
    const action = { actionType: "DEMO_DISPATCH", note: "Demo dispatch from UI", zone, id: `act_${Date.now()}`, t: Date.now() };
    socketRef.current.emit("action", action);
    setMessages((m) => [{ type: "info", data: `sent action ${action.id}`, t: Date.now() }, ...m].slice(0, 500));
  };

  // Auto-dispatch with undo (7s window)
  const autoDispatch = (zone) => {
    if (!socketRef.current || !connected) {
      setMessages((m) => [{ type: "info", data: "Not connected — cannot auto-dispatch", t: Date.now() }, ...m]);
      return;
    }
    if (autoCountdown && autoCountdown.timerId) {
      // one countdown at a time (keep it simple for demo)
      return;
    }
    let remaining = 7;
    const timerId = setInterval(() => {
      remaining -= 1;
      setAutoCountdown((c) => c ? { ...c, remaining } : { zone, remaining, timerId });
      if (remaining <= 0) {
        clearInterval(timerId);
        const action = { actionType: "AUTO_DISPATCH", note: "Auto-dispatch (undo window elapsed)", zone, id: `auto_${Date.now()}`, t: Date.now() };
        socketRef.current.emit("action", action);
        setMessages((m) => [{ type: "action", data: action, t: Date.now() }, ...m].slice(0, 500));
        setAutoCountdown(null);
      }
    }, 1000);
    setAutoCountdown({ zone, remaining, timerId });
  };

  const cancelAuto = () => {
    if (!autoCountdown) return;
    clearInterval(autoCountdown.timerId);
    setMessages((m) => [{ type: "info", data: `Auto-dispatch cancelled for ${autoCountdown.zone}`, t: Date.now() }, ...m].slice(0, 500));
    setAutoCountdown(null);
  };

  const alerts = computeAlerts(zonesState);
  const suggestions = computeAISuggestions(zonesState);

  return (
    <div className="app-root">
      <header className="topbar">
        <div className="brand">
          <div className="title brand-title">Trinetra Sthithi</div>
          <div className="sub">— live safety dashboard</div>
        </div>

        <div className="top-actions">
          <button className="btn ghost" onClick={() => sendTestAction()} disabled={!connected} aria-disabled={!connected}>Send test action</button>
        </div>
      </header>

      <main className="container page">
        <div className="status-row">
          <div className="status-card card" role="status" aria-live="polite">
            <div className="status-left">
              <div className="status">
                <div className="label">Status:</div>
                <div className="value" style={{ marginLeft: 8 }}>{connected ? "Connected" : "Disconnected"}</div>
              </div>
              <div className="server-info">Server: {SERVER_URL} (socket)</div>
              <div className="server-info">Client: http://localhost:5173 (UI)</div>
            </div>

            <div style={{ textAlign: "right", color: "#64748b" }}>
              {autoCountdown ? (
                <div>
                  Auto-dispatch to <strong>{autoCountdown.zone}</strong> in <strong>{autoCountdown.remaining}</strong>s
                  <div style={{ marginTop: 8 }}>
                    <button className="btn" onClick={cancelAuto}>Undo</button>
                  </div>
                </div>
              ) : <div>No auto actions pending</div>}
            </div>
          </div>

          <div className="alerts-row" aria-hidden={alerts.length===0}>
            {alerts.length === 0 ? <div className="card" style={{ padding: 10, background: "#f1f5f9", color: "#475569" }}>All clear — no active critical alerts.</div> :
              alerts.map((a, i) => <div key={i} className={`alert ${a.level === "critical" ? "critical" : "warn"}`}>{a.text}</div>)
            }
          </div>
        </div>

        <div className="content" role="region">
          {/* Left: zones and messages */}
          <section className="main" aria-label="Main panel">
            <div className="card" style={{ padding: 18 }}>
              <div className="zones-grid" role="list" aria-label="Zones list">
                {ZONES.map((z) => {
                  const state = zonesState[z.id] || { crowd: 0, noise: 0, temp: null, zli: 0, id: z.id, t: null };
                  return (
                    <div key={z.id} className={`zone-card ${state.zli >= 90 ? "zone-critical" : ""}`} role="listitem">
                      <div className="zone-card-header">
                        <div>
                          <div className="title">{z.label}</div>
                          <div className="subtitle">{z.id}</div>
                        </div>
                        <div className="zone-score">
                          <div className="zli" style={{ color: state.zli > 60 ? "#b91c1c" : "#052033" }}>{state.zli || 0}</div>
                          <div className="small">ZLI</div>
                        </div>
                      </div>

                      <div className="zone-stats" style={{ marginTop: 10 }}>
                        <div><strong>Crowd:</strong> {state.crowd ?? 0}</div>
                        <div><strong>Noise (dB):</strong> {state.noise ?? 0}</div>
                        <div><strong>Temp:</strong> {state.temp != null ? `${Number(state.temp).toFixed(1)}°C` : "—"}</div>
                      </div>

                      <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
                        <button className="btn" onClick={() => {
                          const action = { actionType: "SHANTI_PULSE", note: "Shanti Pulse triggered", zone: z.id, id: `shanti_${Date.now()}`, t: Date.now() };
                          if (socketRef.current) socketRef.current.emit("action", action);
                          setMessages((m) => [{ type: "action", data: action, t: Date.now() }, ...m].slice(0, 500));
                        }}>Shanti Pulse</button>

                        <button className="btn ghost" onClick={() => autoDispatch(z.id)} disabled={!connected || !!autoCountdown}>Auto-dispatch</button>
                      </div>

                      <div style={{ marginTop: 12, color: "#c1624d" }}>
                        {state.zli >= 60 ? <div>🔴 ZLI {state.zli} at {z.id} — immediate surveillance recommended.</div> :
                          state.temp != null && state.temp >= 36 ? <div>🔵 Heat risk ({Number(state.temp).toFixed(1)}°C) — suggest water points.</div> :
                          <div>🟠 Kiosk health unknown at {z.id}. Dispatch kiosk checks.</div>}
                      </div>

                      <div style={{ marginTop: 12, textAlign: "right", color: "#94a3b8", fontSize: 12 }}>
                        Last: {state.t ? new Date(state.t).toLocaleTimeString() : "—"}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Recent messages */}
            <div className="card" aria-live="polite" style={{ marginTop: 10 }}>
              <div style={{ fontWeight: 700, marginBottom: 12 }}>Recent messages</div>
              <div className="messages">
                {messages.map((m, idx) => {
                  const ts = new Date(m.t).toLocaleTimeString();
                  return (
                    <div key={idx} className="msg">
                      <div className="msg-type">{m.type}</div>

                      <div className="msg-body">
                        {m.type === "sensor" && typeof m.data === "object" ? (
                          <>
                            <div>{`zone: ${m.data.id}`}</div>
                            <div>{`crowd: ${m.data.crowd}`}</div>
                            <div>{`noise: ${m.data.noise}`}</div>
                            <div>{`temp: ${m.data.temp != null ? Number(m.data.temp).toFixed(1) : "—"}`}</div>
                          </>
                        ) : typeof m.data === "object" ? <pre style={{ margin: 0 }}>{JSON.stringify(m.data, null, 2)}</pre> : <div>{String(m.data)}</div>}
                      </div>

                      <div style={{ fontSize: 12, color: "#94a3b8", minWidth: 64, textAlign: "right" }}>{ts}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          {/* Right: AI Co-Pilot */}
          <aside className="sidebar" aria-label="AI suggestions">
            <div className="card ai-panel" style={{ position: "sticky", top: 26 }}>
              <div style={{ fontWeight: 700, marginBottom: 10 }}>AI Co-Pilot — Suggestions</div>

              {suggestions.length === 0 ? (
                <div style={{ color: "#64748b" }}>No sensor suggestions yet.</div>
              ) : (
                suggestions.map((s, i) => (
                  <div key={i} className="suggestion-row" style={{ paddingBottom: 8, borderBottom: i < suggestions.length - 1 ? "1px dashed #eee" : "none" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div style={{ fontWeight: 800 }}>{s.zone}</div>
                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        {s.level === "critical" && <div className="ai-urgent" aria-hidden>URGENT</div>}
                        <div style={{ color: s.level === "critical" ? "#b91c1c" : s.level === "warn" ? "#f59e0b" : "#2563eb", fontWeight: 700 }}>
                          {s.title}
                        </div>
                      </div>
                    </div>

                    <div style={{ color: "#64748b", marginTop: 8 }}>{s.rationale}</div>

                    <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                      <button className="btn ghost" onClick={() => {
                        const action = { actionType: "SHANTI_PULSE", note: "Shanti from CoPilot", zone: s.zone, id: `shanti_${Date.now()}`, t: Date.now() };
                        if (socketRef.current) socketRef.current.emit("action", action);
                        setMessages((m) => [{ type: "action", data: action, t: Date.now() }, ...m].slice(0, 500));
                      }}>Shanti Pulse</button>

                      <button className="btn primary" onClick={() => autoDispatch(s.zone)} disabled={!connected || !!autoCountdown}>
                        Auto-dispatch
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </aside>
        </div>

        <footer style={{ textAlign: "center", marginTop: 28, color: "#94a3b8" }}>Trinetra Prototype — demo</footer>
      </main>
    </div>
  );
}