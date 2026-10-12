// Prints WCAG 2 contrast for every token pair that carries text or a UI boundary.
// Usage: node scripts/contrast.mjs   (fails with exit 1 if a pair is under its minimum)
import { readFileSync } from "node:fs";

const css = readFileSync(new URL("../styles/tokens.css", import.meta.url), "utf8");
const tokens = {};
for (const m of css.matchAll(/--([\w-]+):\s*light-dark\((#[0-9a-f]{6}),\s*(#[0-9a-f]{6})\)/gi)) tokens[m[1]] = [m[2], m[3]];
for (const m of css.matchAll(/--([\w-]+):\s*(#[0-9a-f]{6});/gi)) tokens[m[1]] = [m[2], m[2]];

const lum = (hex) => {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
const ratio = (a, b) => {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};

const pairs = [
  ["ink", "desk", 4.5], ["ink", "raised", 4.5], ["muted", "desk", 4.5], ["muted", "raised", 4.5],
  ["accent", "desk", 4.5], ["accent", "raised", 4.5], ["danger", "desk", 4.5], ["danger", "raised", 4.5],
  ["final", "desk", 4.5], ["final", "raised", 4.5], ["button-ink", "button", 4.5], ["button-ink", "button-hover", 4.5],
  ["line", "desk", 3], ["line", "raised", 3], ["sheet-ink", "sheet", 4.5], ["sheet-muted", "sheet", 4.5],
  ["gap-ink", "gap-fill", 4.5], ["focus", "desk", 3],
];
let failed = false;
for (const [fg, bg, min] of pairs) {
  const t = (fg === "focus" ? tokens.accent : tokens[fg]);
  const out = [0, 1].map((i) => ratio(t[i], tokens[bg][i]));
  const bad = out.some((r) => r < min);
  failed ||= bad;
  console.log(`${bad ? "FAIL" : "ok  "} ${fg.padEnd(12)} on ${bg.padEnd(13)} light ${out[0].toFixed(1).padStart(4)}  dark ${out[1].toFixed(1).padStart(4)}  (min ${min})`);
}
process.exitCode = failed ? 1 : 0;
