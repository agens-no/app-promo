// kjop_audio.mjs — app-promo
// Synthesises the Kjop soundtrack (music + foley) from the shared timeline and recording knots. No samples.
// Palette: low-key and homely (felt piano, nylon pluck, soft kick and rim, shaker), half-time, G major.
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const T = JSON.parse(fs.readFileSync(path.join(root, "src/kjop/timeline.json"), "utf8"));
const SR = 48000;
const DUR = T.end / T.fps + 0.5;
const N = Math.round(SR * DUR);
const sec = (frame) => frame / T.fps;
const BEAT = 60 / T.bpm;

const music = [new Float32Array(N), new Float32Array(N)];
const fx = [new Float32Array(N), new Float32Array(N)];
const send = new Float32Array(N);
let seed = 23;
const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296) * 2 - 1;
const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);

function add(bus, t0, len, fn, gain = 1, pan = 0, rev = 0.2) {
  const s0 = Math.round(t0 * SR);
  const L = Math.round(len * SR);
  const gl = gain * Math.cos(((pan + 1) * Math.PI) / 4);
  const gr = gain * Math.sin(((pan + 1) * Math.PI) / 4);
  for (let i = 0; i < L; i++) {
    const k = s0 + i;
    if (k < 0 || k >= N) continue;
    const v = fn(i / SR);
    bus[0][k] += v * gl;
    bus[1][k] += v * gr;
    send[k] += v * gain * rev;
  }
}

function noise(len, lo, hi, env) {
  const L = Math.round(len * SR);
  const out = new Float32Array(L);
  let lp = 0, lp2 = 0, hpPrev = 0, hpOut = 0;
  for (let i = 0; i < L; i++) {
    const t = i / SR;
    const fl = typeof hi === "function" ? hi(t) : hi;
    const fh = typeof lo === "function" ? lo(t) : lo;
    const x = rnd();
    const ah = 1 / (1 + (2 * Math.PI * fh) / SR);
    hpOut = ah * (hpOut + x - hpPrev);
    hpPrev = x;
    const al = 1 - Math.exp((-2 * Math.PI * fl) / SR);
    lp += al * (hpOut - lp);
    lp2 += al * (lp - lp2);
    out[i] = lp2 * env(t);
  }
  return (t) => out[Math.min(L - 1, Math.round(t * SR))];
}

const K = JSON.parse(fs.readFileSync(path.join(root, "src/kjop/knots.json"), "utf8"));
const frameOf = (knots, src) => {
  for (let i = 1; i < knots.length; i++) {
    const [f0, s0] = knots[i - 1];
    const [f1, s1] = knots[i];
    if (src >= s0 && src <= s1 && s1 > s0) return f0 + ((src - s0) * (f1 - f0)) / (s1 - s0);
  }
  return null;
};
const tapAt = (take, src) => sec(frameOf(K[take], src));

// ---- Instruments
// Felt piano: soft hammer, a few partials, quick high damping.
const piano = (f, decay = 1.8) => (t) =>
  Math.min(1, t * 250) *
  (Math.sin(2 * Math.PI * f * t) * Math.exp(-t * decay) +
    0.35 * Math.sin(2 * Math.PI * f * 2.001 * t) * Math.exp(-t * decay * 2.2) +
    0.12 * Math.sin(2 * Math.PI * f * 3.003 * t) * Math.exp(-t * decay * 4) +
    0.05 * Math.sin(2 * Math.PI * f * 4.2 * t) * Math.exp(-t * 30));
// Nylon-string pluck (Karplus–Strong with a soft, dark filter).
const pluck = (f, len = 1.6) => {
  const L = Math.round(len * SR);
  const out = new Float32Array(L);
  const n = Math.max(2, Math.round(SR / f));
  const buf = new Float32Array(n).map(() => rnd() * 0.6);
  let idx = 0, prev = 0;
  for (let i = 0; i < L; i++) {
    const v = buf[idx];
    const next = 0.497 * (v + prev);
    prev = v;
    buf[idx] = next;
    out[i] = v;
    idx = (idx + 1) % n;
  }
  return (t) => out[Math.min(L - 1, Math.round(t * SR))] * Math.min(1, t * 400);
};
const kick = (t) => Math.sin(2 * Math.PI * (46 * t + (60 * (1 - Math.exp(-t * 28))) / 28)) * Math.exp(-t * 11) * Math.min(1, t * 800);
const rim = () => noise(0.05, 1800, 5000, (t) => (t < 0.003 ? 3 : 0) + Math.exp(-t * 90) * 2.4);
const shaker = () => noise(0.07, 5000, 11000, (t) => Math.min(1, t * 200) * Math.exp(-t * 50) * 1.4);
const sub = (f, decay = 2) => (t) => Math.sin(2 * Math.PI * f * t) * Math.exp(-t * decay) * Math.min(1, t * 300);
const key = () => noise(0.03, 2500, 7000, (t) => Math.exp(-t * 200) * 2);
const whoosh = (at, len = 0.5, gain = 0.1, pan = 0) =>
  add(fx, at, len, noise(len, (t) => 400 + (t / len) * 1800, (t) => 1800 + (t / len) * 6000, (t) => Math.sin((Math.PI * t) / len) * 0.9), gain, pan, 0.3);

// ---- Harmony: G major, I–V–vi–IV, one chord per bar (half-time feel).
const chords = [[55, 59, 62, 67], [50, 54, 57, 62], [52, 55, 59, 64], [48, 52, 55, 60]];
const roots = [43, 38, 40, 36];
const pent = [74, 76, 79, 81, 83, 86, 88, 91];
const BAR = BEAT * 4;
const bars = (from, to) => {
  const out = [];
  for (let b = Math.ceil(from / BAR - 1e-6); b * BAR < to - 1e-6; b++) out.push(b);
  return out;
};
const band = (from, to, full = true) => {
  for (const b of bars(from, to)) {
    const t = b * BAR;
    const c = chords[b % 4];
    c.forEach((m, i) => add(music, t + i * 0.012, BAR + 0.8, piano(mtof(m), 0.9), 0.06, (i - 1.5) * 0.25, 0.35));
    add(music, t, BAR, sub(mtof(roots[b % 4]), 0.9), 0.16, 0, 0.02);
    // Arpeggiated nylon pluck on the off-beats.
    [0.5, 1.5, 2.5, 3.5].forEach((q, i) => add(music, t + q * BEAT, 1.4, pluck(mtof(c[(i + 1) % 4] + 12)), 0.16, i % 2 ? 0.35 : -0.35, 0.25));
    if (!full) continue;
    add(music, t, 0.4, kick, 0.34, 0, 0.02);
    add(music, t + BEAT * 2, 0.05, rim(), 0.12, 0.2, 0.2);
    for (let e = 0; e < 8; e++) add(music, t + e * BEAT * 0.5, 0.07, shaker(), e % 2 ? 0.05 : 0.03, 0.4, 0.05);
  }
};

// ---- Arrangement
const t = Object.fromEntries(Object.entries(T).map(([k, v]) => [k, typeof v === "number" ? sec(v) : v]));
band(0, BAR * 2, false);
band(BAR * 2, t.done);
// Ferdig: the band drops to piano and pads under a warm chime, then returns for the slogan.
band(t.done, t.tagline, false);
band(t.tagline, t.tagline + BAR * 2);
const final = t.tagline + BAR * 2;
[43, 55, 59, 62, 66, 71].forEach((m, i) => add(music, final + i * 0.02, 5, piano(mtof(m), 0.5), 0.1, (i - 2.5) * 0.2, 0.5));
add(music, final, 4, sub(mtof(31), 0.7), 0.2, 0, 0.02);

// Foley from the recording: taps, typing, ticks, the sweep and the finish.
K.taps.forEach(([take, src], i) => add(fx, tapAt(take, src), 0.04, key(), 0.08, 0, 0.05));
for (let i = 0; i < 9; i++) add(fx, sec(frameOf(K.a, 164 + i * 2.2)), 0.03, key(), 0.07, ((i % 3) - 1) * 0.2, 0.05);
add(fx, tapAt("a", 300), 0.6, pluck(mtof(79), 0.6), 0.2, 0.2, 0.3);
[164, 212, 261, 310, 359, 407, 594, 654].forEach((src, i) => add(fx, tapAt("b", src + 4), 1.2, pluck(mtof(pent[i % pent.length])), 0.22, 0.25, 0.3));
add(fx, tapAt("b", 491), 0.5, noise(0.5, 900, 5000, (x) => Math.sin((Math.PI * x) / 0.5) * 0.8), 0.12, 0.3, 0.2);
[79, 83, 86, 91].forEach((m, i) => add(fx, tapAt("b", 688) + i * 0.08, 2.5, piano(mtof(m), 1.2), 0.08, (i - 1.5) * 0.2, 0.5));
add(fx, tapAt("b", 845), 0.3, (x) => Math.sin(2 * Math.PI * 520 * x * (1 + x * 2)) * Math.exp(-x * 18), 0.08, 0, 0.2);
whoosh(t.tagline - 0.4, 0.5, 0.1);

// Schroeder reverb on the send, then mix, glue and limit.
const rev = [new Float32Array(N), new Float32Array(N)];
const combs = [[1557, 1617, 1491, 1422], [1277, 1356, 1188, 1116]].map((a) => a.map((d) => Math.round((d * SR) / 44100)));
for (let c = 0; c < 2; c++) {
  for (const d of combs[c]) {
    const buf = new Float32Array(d);
    let idx = 0, lp = 0;
    for (let i = 0; i < N; i++) {
      const y = buf[idx];
      lp = y * 0.7 + lp * 0.3;
      buf[idx] = send[i] + lp * 0.8;
      rev[c][i] += y * 0.25;
      idx = (idx + 1) % d;
    }
  }
  for (const d of [225, 556, 441]) {
    const buf = new Float32Array(d);
    let idx = 0;
    for (let i = 0; i < N; i++) {
      const x = rev[c][i];
      const y = buf[idx];
      buf[idx] = x + y * 0.5;
      rev[c][i] = y - x * 0.5;
      idx = (idx + 1) % d;
    }
  }
}
const out = [new Float32Array(N), new Float32Array(N)];
let peak = 0;
for (let c = 0; c < 2; c++) {
  for (let i = 0; i < N; i++) {
    const fade = Math.min(1, (N - i) / (SR * 0.4));
    out[c][i] = Math.tanh((music[c][i] * 0.9 + fx[c][i] + rev[c][i] * 0.35) * 1.8) * fade;
    peak = Math.max(peak, Math.abs(out[c][i]));
  }
}
const gain = 0.89 / peak;
const data = Buffer.alloc(44 + N * 4);
data.write("RIFF", 0); data.writeUInt32LE(36 + N * 4, 4); data.write("WAVE", 8); data.write("fmt ", 12);
data.writeUInt32LE(16, 16); data.writeUInt16LE(1, 20); data.writeUInt16LE(2, 22); data.writeUInt32LE(SR, 24);
data.writeUInt32LE(SR * 4, 28); data.writeUInt16LE(4, 32); data.writeUInt16LE(16, 34); data.write("data", 36); data.writeUInt32LE(N * 4, 40);
for (let i = 0; i < N; i++) {
  data.writeInt16LE(Math.round(out[0][i] * gain * 32767), 44 + i * 4);
  data.writeInt16LE(Math.round(out[1][i] * gain * 32767), 46 + i * 4);
}
fs.writeFileSync(path.join(root, "public/kjop/soundtrack.wav"), data);
console.log(`soundtrack.wav ${DUR.toFixed(2)} s`);
