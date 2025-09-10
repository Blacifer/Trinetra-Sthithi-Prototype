// server/index.js
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const bodyParser = require("body-parser");
const cors = require("cors");
const { spawn } = require("child_process");
const path = require("path");

const PORT = process.env.PORT || 4000;

const app = express();
app.use(cors());
app.use(bodyParser.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" },
});

let simProc = null;

io.on("connection", (socket) => {
  console.log(`client connected ${socket.id} from ${socket.handshake.address} count=1`);
  socket.on("disconnect", (reason) => {
    console.log(`client disconnected ${socket.id} from ${socket.handshake.address} reason=${reason}`);
  });
});

// Accept both /api/sensor and /api/sensor-update
app.post(["/api/sensor", "/api/sensor-update", "/api/sensor-update-v1"], (req, res) => {
  const s = req.body || {};
  s.t = Date.now();
  console.log("[SENSOR]", s);
  io.emit("sensor", s);
  res.json({ ok: true, reading: s });
});

// Action endpoint (dispatch)
app.post("/api/action", (req, res) => {
  const action = req.body || {};
  action.id = action.id || `act_${Date.now()}`;
  action.t = Date.now();
  console.log("[ACTION] ", action);
  io.emit("action", action);
  res.json({ ok: true, action });
});

// Endpoint to start/stop server-side simulator (Node)
app.post("/api/sim/start", (req, res) => {
  if (simProc && !simProc.killed) {
    return res.status(400).send("Simulator already running");
  }
  const simScript = path.join(__dirname, "..", "simulator", "simulate_sensors_node.js");
  // spawn node simulator. It will POST to this server's /api/sensor endpoint.
  simProc = spawn(process.execPath, [simScript, "--server", `http://localhost:${PORT}`, "--interval", "1.0"], {
    cwd: path.join(__dirname, "..", "simulator"),
    stdio: ["ignore", "pipe", "pipe"],
    env: process.env,
  });
  simProc.stdout.on("data", (d) => console.log("[SIM]", d.toString().trim()));
  simProc.stderr.on("data", (d) => console.warn("[SIM:ERR]", d.toString().trim()));
  simProc.on("exit", (code, sig) => {
    console.log("[SIM] exited", code, sig);
    simProc = null;
  });
  res.json({ ok: true, started: true });
});

app.post("/api/sim/stop", (req, res) => {
  if (!simProc) return res.json({ ok: true, stopped: true });
  try {
    simProc.kill();
  } catch (e) {
    console.warn("failed to kill sim", e);
  }
  simProc = null;
  res.json({ ok: true, stopped: true });
});

server.listen(PORT, () => {
  console.log(`Server listening on ${PORT}`);
});