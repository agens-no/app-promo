// unblock_audio.mjs — app-promo
// Synthesises the Unblock soundtrack (music + foley) from the shared timeline. No samples, no third-party audio.
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const T = JSON.parse(fs.readFileSync(path.join(root, "src/unblock/timeline.json"), "utf8"));
const SR = 48000;
const DUR = T.end / T.fps + 0.5;
const N = Math.round(SR * DUR);
const sec = (frame) => frame / T.fps;
const BEAT = 60 / T.bpm;

const music = [new Float32Array(N), new Float32Array(N)];
const fx = [new Float32Array(N), new Float32Array(N)];
const send = new Float32Array(N);
let seed = 7;
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

const marimba = (f) => (t) =>
  Math.min(1, t * 400) *
  (Math.sin(2 * Math.PI * f * t) * Math.exp(-t * 7) +
    0.35 * Math.sin(2 * Math.PI * f * 3.98 * t) * Math.exp(-t * 28) +
    0.12 * Math.sin(2 * Math.PI * f * 9.9 * t) * Math.exp(-t * 60));
const bell = (f) => (t) =>
  Math.min(1, t * 600) *
  (Math.sin(2 * Math.PI * f * t) * Math.exp(-t * 2.2) +
    0.5 * Math.sin(2 * Math.PI * f * 2.76 * t) * Math.exp(-t * 4) +
    0.25 * Math.sin(2 * Math.PI * f * 5.4 * t) * Math.exp(-t * 7) +
    0.15 * Math.sin(2 * Math.PI * f * 8.93 * t) * Math.exp(-t * 11));
const bass = (f, decay = 2.5) => (t) => {
  const ph = 2 * Math.PI * f * t;
  return Math.tanh(1.6 * (Math.sin(ph) + 0.3 * Math.sin(2 * ph))) * Math.min(1, t * 200) * Math.exp(-t * decay);
};
const kick = (t) => Math.sin(2 * Math.PI * (45 * t + (90 * (1 - Math.exp(-t * 30))) / 30)) * Math.exp(-t * 9) * Math.min(1, t * 800);
const sub = (t) => Math.sin(2 * Math.PI * (38 * t + (140 * (1 - Math.exp(-t * 18))) / 18)) * Math.exp(-t * 3) * Math.min(1, t * 800);

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
const clap = () => noise(0.18, 900, 3500, (t) => (Math.exp(-t * 30) + (t < 0.02 ? 0.6 : 0)) * 3);
const hat = () => noise(0.06, 6000, 13000, (t) => Math.min(1, t * 300) * Math.exp(-t * 60) * 3);
const wood = (f, decay = 40) => {
  const n = noise(0.05, f * 0.8, f * 2.5, (t) => Math.exp(-t * 120) * 2);
  return (t) => (Math.sin(2 * Math.PI * f * t * (1 + 0.08 * Math.exp(-t * 80))) * Math.exp(-t * decay) + n(t) * 0.6) * Math.min(1, t * 2000);
};
const riser = (len) => noise(len, (t) => 300 + (t / len) * 3000, (t) => 1500 + (t / len) * 12000, (t) => Math.pow(t / len, 2.2));

// Harmony in D minor while stuck, opening to F major once the path is free.
const minor = [[62, 65, 69], [58, 62, 65], [60, 64, 67], [57, 61, 64]];
const minorRoots = [38, 34, 36, 33];
const major = [[65, 69, 72], [62, 65, 69], [58, 62, 65], [60, 64, 67]];
const majorRoots = [41, 38, 34, 36];

const hook = sec(T.reveal);
const groove = sec(T.firstMove);
const payoff = sec(T.payoff);
const end = sec(T.end);

// Hook: a ticking, tense pedal.
add(music, 0, hook + 0.2, (t) => bass(mtof(38), 0.4)(t) * Math.min(1, t * 2), 0.22, 0, 0.05);
for (let t = 0; t < hook; t += BEAT / 2) add(music, t, 0.1, wood(mtof(93), 70), 0.035, t % BEAT ? 0.3 : -0.3, 0.2);
add(music, hook - 0.6, 0.6, riser(0.6), 0.25, 0, 0.3);

// Reveal: big downbeat, pad swell, half-time.
add(music, hook, 0.8, sub, 0.6, 0, 0.05);
add(music, hook, 2.2, (t) => minor[0].reduce((a, m) => a + Math.sin(2 * Math.PI * mtof(m) * t), 0) / 3 * Math.min(1, t * 3) * Math.exp(-t * 0.6), 0.08, 0, 0.6);
[74, 77, 81].forEach((m, i) => add(music, hook + i * BEAT * 0.5, 1, marimba(mtof(m)), 0.12, (i - 1) * 0.3, 0.4));
add(music, groove - 0.5, 0.5, riser(0.5), 0.2, 0, 0.3);

// Groove while the moves happen.
for (let bar = 0; groove + bar * BEAT * 4 < payoff - 0.01; bar++) {
  const b0 = groove + bar * BEAT * 4;
  const ch = minor[bar % 4];
  const root = minorRoots[bar % 4];
  for (let s = 0; s < 16; s++) {
    const t = b0 + s * BEAT / 4;
    if (t >= payoff - 0.05) break;
    if (s % 4 === 0) add(music, t, 0.4, kick, 0.5, 0, 0);
    if (s === 4 || s === 12) add(music, t, 0.18, clap(), 0.15, 0, 0.35);
    add(music, t, 0.06, hat(), s % 2 ? 0.03 : 0.05, s % 2 ? 0.4 : -0.4, 0.1);
    if (s % 2 === 0) {
      const arp = [ch[0], ch[1], ch[2], ch[1] + 12, ch[2], ch[0] + 12, ch[2], ch[1]][s / 2] + 12;
      add(music, t, 0.8, marimba(mtof(arp)), 0.12, s / 2 % 2 ? 0.35 : -0.35, 0.35);
    }
    if (s === 0 || s === 6 || s === 10) add(music, t, 0.5, bass(mtof(root)), 0.3, 0, 0.03);
  }
}
add(music, sec(T.launch), payoff - sec(T.launch), riser(payoff - sec(T.launch)), 0.32, 0, 0.3);

// Payoff: the key opens up.
add(music, payoff, 0.9, sub, 0.75, 0, 0.05);
add(music, payoff, 0.5, kick, 0.6, 0, 0);
add(music, payoff, 3, bass(mtof(41), 0.8), 0.35, 0, 0.05);
[65, 69, 72, 77, 81].forEach((m, i) => add(music, payoff + i * 0.03, 2.5, marimba(mtof(m)), 0.13, (i - 2) * 0.2, 0.5));
add(music, payoff, 3, bell(mtof(84)), 0.06, 0.2, 0.7);
const outro = sec(T.outro);
const finale = sec(T.logoDrop + 6 * 7.5 + 12 + 15);
for (let bar = 0; payoff + bar * BEAT * 4 < outro; bar++) {
  const b0 = payoff + bar * BEAT * 4;
  const ch = major[bar % 4];
  for (let s = 0; s < 16; s++) {
    const t = b0 + s * BEAT / 4;
    if (t >= outro) break;
    if (bar > 0 && s % 4 === 0) add(music, t, 0.4, kick, 0.5, 0, 0);
    if (bar > 0 && (s === 4 || s === 12)) add(music, t, 0.18, clap(), 0.14, 0, 0.35);
    add(music, t, 0.06, hat(), s % 2 ? 0.035 : 0.025, s % 2 ? 0.3 : -0.3, 0.1);
    if (s % 2 === 0) add(music, t, 0.8, marimba(mtof([ch[0], ch[1], ch[2], ch[1] + 12, ch[2], ch[0] + 12, ch[2], ch[1]][s / 2] + 12)), 0.11, s / 2 % 2 ? 0.3 : -0.3, 0.4);
    if (s === 0 || s === 6 || s === 10) add(music, t, 0.5, bass(mtof(majorRoots[bar % 4])), 0.28, 0, 0.03);
  }
  add(music, b0, BEAT * 4, (t) => ch.reduce((a, m) => a + Math.sin(2 * Math.PI * mtof(m) * t), 0) / 3 * Math.min(1, t * 4) * Math.min(1, (BEAT * 4 - t) * 4), 0.05, 0, 0.6);
}

// Outro: everything drops away while the logo builds, then one big open chord.
add(music, outro - 0.6, 0.6, riser(0.6), 0.22, 0, 0.3);
add(music, outro, finale - outro, (t) => bass(mtof(41), 0.3)(t), 0.2, 0, 0.05);
add(music, outro, finale - outro + 0.2, (t) => major[0].reduce((a, m) => a + Math.sin(2 * Math.PI * mtof(m) * t), 0) / 3 * Math.min(1, t * 2) * 0.6, 0.05, 0, 0.7);
add(music, finale, 0.9, sub, 0.8, 0, 0.05);
add(music, finale, 0.5, kick, 0.6, 0, 0);
add(music, finale, end - finale + 0.5, bass(mtof(41), 0.5), 0.36, 0, 0.05);
[53, 65, 69, 72, 77, 81, 84].forEach((m, i) => add(music, finale + i * 0.025, end - finale + 0.5, marimba(mtof(m)), 0.12, (i - 3) * 0.15, 0.6));
add(music, finale, end - finale + 0.5, (t) => [65, 69, 72, 77].reduce((a, m) => a + Math.sin(2 * Math.PI * mtof(m) * t), 0) / 4 * Math.min(1, t * 6) * Math.exp(-t * 0.5), 0.09, 0, 0.8);
add(music, finale + 0.05, 3, bell(mtof(89)), 0.07, 0.25, 0.8);
[[0.75, 84], [1.0, 81], [1.25, 77], [1.75, 89]].forEach(([dt, m]) => add(music, finale + dt, 1.5, marimba(mtof(m)), 0.07, 0.3, 0.6));

// Foley from the picture.
const pent = [74, 77, 79, 81, 84];
const order = ["b5", "b7", "b1", "b2", "b6", "b4", "b3", "b8", "target"];
order.forEach((id, i) => {
  const land = sec(T.dropStart + i * T.dropStagger + (id === "target" ? 10 : 0) + 15);
  if (id === "target") {
    add(fx, land, 0.4, wood(mtof(57), 18), 0.4, 0, 0.25);
    add(fx, land, 0.4, kick, 0.3, 0, 0);
  } else add(fx, land, 0.25, wood(mtof(pent[i % 5] - 12)), 0.2, (i % 3 - 1) * 0.3, 0.25);
});
[T.nudge + 8, T.nudge + 26].forEach((frame) => {
  add(fx, sec(frame), 0.35, wood(mtof(50), 18), 0.36, 0.2, 0.25);
  add(fx, sec(frame), 0.3, kick, 0.2, 0, 0);
});
add(fx, sec(T.reveal) - 0.05, 0.6, noise(0.6, (t) => 500 + t * 2500, (t) => 3000 + t * 9000, (t) => Math.sin((Math.PI * t) / 0.6) * 0.8), 0.12, 0, 0.3);
for (let i = 0; i < 4; i++) {
  const at = sec(T.firstMove + i * T.moveGap);
  const len = sec(T.moveDuration);
  add(fx, at, len, noise(len, 300, 2600, (t) => Math.sin((Math.PI * t) / len) * 0.9), 0.14, 0, 0.15);
  if (i < 3) add(fx, at + len * 0.75, 0.25, wood(mtof(pent[i + 1] - 12)), 0.22, 0, 0.25);
}
add(fx, sec(T.launch), 0.8, noise(0.8, (t) => 400 + t * 3500, (t) => 2000 + t * 12000, (t) => Math.sin((Math.PI * t) / 0.8) * 0.9), 0.2, 0.4, 0.35);
[0, 1, 2].forEach((n) => add(fx, sec(T.starsOut + n * 15 + 8), 1.6, bell(mtof([81, 84, 89][n])), 0.1, (n - 1) * 0.4, 0.6));
add(fx, sec(T.cardOut + 6), 0.3, (t) => Math.sin(2 * Math.PI * (280 * t + 500 * t * t)) * Math.exp(-t * 22), 0.1, 0, 0.3);

const whoosh = (at, len = 0.5, gain = 0.14) =>
  add(fx, at, len, noise(len, (t) => 500 + (t / len) * 2500, (t) => 2500 + (t / len) * 9000, (t) => Math.sin((Math.PI * t) / len) * 0.8), gain, 0, 0.3);
const click = (at, pitch = 72, gain = 0.2) => add(fx, at, 0.25, wood(mtof(pitch), 45), gain, 0, 0.2);
whoosh(sec(T.spinA), 0.5, 0.18);
whoosh(sec(T.spinB), 0.5, 0.18);
whoosh(sec(T.segOut), 0.45);
T.segSteps.forEach((at, i) => {
  click(sec(at), [74, 77, 81][i], 0.22);
  add(fx, sec(at), 0.25, (t) => Math.sin(2 * Math.PI * (500 + i * 120) * t) * Math.exp(-t * 30), 0.05, 0, 0.3);
});
whoosh(sec(T.segIn), 0.4, 0.08);
click(sec(T.spillPress), 60, 0.28);
whoosh(sec(T.dailyOut), 0.5);
for (let i = 0; i < 5; i++) add(fx, sec(T.pills + i * 15), 1.2, bell(mtof([77, 79, 81, 84, 86][i])), 0.08, (i - 2) * 0.2, 0.5);
add(fx, sec(T.dailyDone), 1.6, bell(mtof(89)), 0.08, 0, 0.6);
whoosh(sec(T.summary), 0.45);
for (let f = T.scoreCount; f < T.scoreCount + 60; f += 4) add(fx, sec(f), 0.08, wood(mtof(96 - (f - T.scoreCount) / 10), 80), 0.05, 0.2, 0.15);
add(fx, sec(T.scoreCount + 60), 1.6, bell(mtof(84)), 0.09, 0, 0.6);
for (let i = 0; i < 5; i++) click(sec(T.rows + i * 7.5 + 10), pent[i], 0.12);
whoosh(sec(T.sharePress - 30), 0.4, 0.1);
click(sec(T.sharePress), 62, 0.3);
add(fx, sec(T.outro + 20), 0.5, wood(mtof(45), 14), 0.32, 0, 0.3);
["U", "N", "L", "O", "C", "K"].forEach((_, i) => add(fx, sec(T.logoDrop + i * 7.5 + 15), 0.25, wood(mtof(pent[i % 5] - 12)), 0.22, (i % 3 - 1) * 0.3, 0.25));
add(fx, finale, 0.45, wood(mtof(52), 16), 0.42, 0, 0.3);

// Schroeder reverb on the send, then mix, glue and limit.
const rev = [new Float32Array(N), new Float32Array(N)];
const combs = [[1557, 1617, 1491, 1422], [1277, 1356, 1188, 1116]].map((a) => a.map((d) => Math.round((d * SR) / 44100)));
for (let c = 0; c < 2; c++) {
  for (const d of combs[c]) {
    const buf = new Float32Array(d);
    let idx = 0, lp = 0;
    for (let i = 0; i < N; i++) {
      const y = buf[idx];
      lp = y * 0.75 + lp * 0.25;
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
    out[c][i] = Math.tanh((music[c][i] * 0.9 + fx[c][i] + rev[c][i] * 0.35) * 1.3) * fade;
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
fs.writeFileSync(path.join(root, "public/unblock/soundtrack.wav"), data);
console.log(`soundtrack.wav ${DUR.toFixed(2)} s`);
