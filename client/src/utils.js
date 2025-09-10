// client/src/utils.js

/**
 * Smooth a numeric series using a simple moving average.
 * @param {number[]} arr - Input array of numbers.
 * @param {number} window - Size of the smoothing window.
 * @returns {number[]} Smoothed array.
 */
export function smoothSeries(arr, window = 3) {
  if (!arr || arr.length === 0) return [];
  const out = [];
  for (let i = 0; i < arr.length; i++) {
    const start = Math.max(0, i - window + 1);
    const slice = arr.slice(start, i + 1);
    const avg = slice.reduce((a, b) => a + b, 0) / slice.length;
    out.push(Number(avg.toFixed(1)));
  }
  return out;
}

/**
 * Keep only the latest N entries in an array (e.g., for sparklines).
 * @param {any[]} arr
 * @param {number} maxLen
 */
export function keepLatest(arr, maxLen = 20) {
  if (!arr) return [];
  return arr.length > maxLen ? arr.slice(arr.length - maxLen) : arr;
}

/**
 * Format a timestamp into HH:MM:SS
 * @param {number} t - Unix timestamp or Date.now()
 * @returns {string}
 */
export function formatTime(t) {
  const d = new Date(t);
  return d.toLocaleTimeString();
}

/**
 * Assign a CSS class name for alert levels
 * @param {string} level - "critical" | "warn" | "info" | "monitor"
 */
export function levelClass(level) {
  switch (level) {
    case "critical":
      return "text-red-600";
    case "warn":
      return "text-amber-600";
    case "info":
      return "text-blue-600";
    case "monitor":
      return "text-green-600";
    default:
      return "text-gray-600";
  }
}

/**
 * Generate sparkline-friendly data (just the ZLI history array).
 * @param {object} zoneState
 * @returns {number[]}
 */
export function getSparklineData(zoneState) {
  if (!zoneState || !zoneState.history) return [];
  return zoneState.history.map((d) => d.zli || 0);
}