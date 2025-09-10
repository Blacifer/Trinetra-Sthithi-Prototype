// client/src/Dashboard.jsx
import React from "react";

export default function Dashboard({ zones }) {
  // zones: { id: { name, zli, crowd, noise, temp } }
  return (
    <div className="content">
      <div className="main">
        <section className="card">
          <h3 className="card-title">Zones</h3>
          <div className="cards-row" style={{ display: "flex", gap: 16 }}>
            {Object.keys(zones).map((k) => {
              const z = zones[k];
              return (
                <div key={k} className="zone-card card" style={{ minWidth: 220 }}>
                  <div className="zone-card-header">
                    <div>
                      <div style={{ fontWeight: 700 }}>{z.name}</div>
                      <div style={{ fontSize: 12, color: "#94a3b8" }}>{z.id}</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 20, fontWeight: 800 }}>{z.zli ?? 0}</div>
                      <div style={{ fontSize: 12, color: "#94a3b8" }}>ZLI</div>
                    </div>
                  </div>
                  <div className="zone-card-body" style={{ marginTop: 12 }}>
                    <div>Crowd: {z.crowd ?? "—"}</div>
                    <div>Noise (dB): {z.noise ?? "—"}</div>
                    <div>Temp: {z.temp ?? "—"}</div>
                    <div style={{ color: "#9aa6b1", marginTop: 8, fontSize: 12 }}>no data yet</div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}