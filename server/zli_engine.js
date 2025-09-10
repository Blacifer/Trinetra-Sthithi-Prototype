// zli_engine.js
function computeZLI({crowdCount, avgTemp, noiseDb, pm25, kioskScore}) {
  const norm = {
    crowd: Math.tanh((crowdCount || 0) / 150),
    heat: Math.tanh(((avgTemp || 25) - 25) / 8),
    noise: Math.tanh(((noiseDb || 50) - 50) / 20),
    pollution: Math.tanh((pm25 || 10) / 100),
    feedback: ((kioskScore || 0) / 5)
  };
  const weights = {crowd: 0.35, heat: 0.22, noise: 0.15, pollution: 0.13, feedback: 0.15};
  const load = (
    norm.crowd * weights.crowd +
    norm.heat * weights.heat +
    norm.noise * weights.noise +
    norm.pollution * weights.pollution +
    (1 - norm.feedback) * weights.feedback
  );
  const zli = Math.max(0, Math.min(100, Math.round(load * 100)));
  const zei = Math.max(0, Math.min(100, Math.round((norm.noise*0.6 + (1 - norm.feedback)*0.4) * 100)));
  const color = zli < 40 ? 'green' : (zli < 70 ? 'yellow' : 'red');
  const action = zli < 40 ? 'normal' : (zli < 70 ? 'alert' : 'shanti_pulse');
  return {zli, zei, color, action, components: norm};
}
module.exports = {computeZLI};
