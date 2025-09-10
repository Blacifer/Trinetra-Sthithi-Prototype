// simulator/simulate_sensors_node.js
// Node simulator: posts periodic sensor readings to server/api/sensor
// Usage: node simulate_sensors_node.js --server http://localhost:4000 --interval 1

const { argv } = require('process');

function parseArg(name, fallback) {
  const idx = argv.indexOf(name);
  if (idx >= 0 && argv.length > idx + 1) return argv[idx + 1];
  return fallback;
}

const SERVER = parseArg('--server', 'http://localhost:4000');
const INTERVAL = Number(parseArg('--interval', '1')) * 1000;

const zones = ['GHAT1', 'GHAT2', 'MAIN'];

function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function randFloat(min, max, d=1) { return Number((Math.random() * (max - min) + min).toFixed(d)); }

console.log('Simulator starting. Sending to', SERVER);

async function sendReading() {
  const zone = zones[Math.floor(Math.random() * zones.length)];
  let baseCrowd = randInt(10, 250);
  // occasional surge
  if (Math.random() < 0.08) baseCrowd += randInt(80, 450);

  const payload = {
    zone,
    crowd: baseCrowd,
    noise: randFloat(40, 100, 1),
    temp: randFloat(24, 40, 1),
    zli: randInt(0, 100),
    t: Date.now()
  };

  try {
    const res = await fetch(`${SERVER}/api/sensor`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      console.log('sent', zone, payload);
    } else {
      console.warn('server error', res.status, await res.text());
    }
  } catch (err) {
    console.error('error', err.message || err);
  }
}

// start loop
sendReading();                     // immediate first send
const id = setInterval(sendReading, INTERVAL);

// grace on SIGINT
process.on('SIGINT', () => {
  clearInterval(id);
  console.log('simulator stopped');
  process.exit(0);
});