// talljakt_audio.mjs — app-promo
// Synthesises the Talljakt soundtrack (music + foley) from the shared timeline. No samples, no third-party audio.
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const T = JSON.parse(fs.readFileSync(path.join(root, "src/talljakt/timeline.json"), "utf8"));
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

// ---- Talljakt palette: electro-pop, digital and bright (deliberately unlike Unblock's marimba and wood).
const pluck = (f, decay = 0.996, len = 1.2) => {
  // Karplus–Strong string: a noise burst circulating in a delay line one period long.
  const L = Math.round(len * SR);
  const period = Math.max(2, Math.round(SR / f));
  const line = new Float32Array(period).map(() => rnd() * 0.8);
  const out = new Float32Array(L);
  let idx = 0;
  for (let i = 0; i < L; i++) {
    const next = (idx + 1) % period;
    const v = line[idx];
    line[idx] = (v + line[next]) * 0.5 * decay;
    out[i] = v;
    idx = next;
  }
  return (t) => out[Math.min(L - 1, Math.round(t * SR))];
};
const sawPad = (notes, len, bright = 0.4) => {
  const L = Math.round(len * SR);
  const out = new Float32Array(L);
  let lp = 0, lp2 = 0;
  const phases = notes.flatMap(() => [0, 0, 0]);
  for (let i = 0; i < L; i++) {
    const t = i / SR;
    let x = 0;
    notes.forEach((m, n) => {
      [-0.11, 0, 0.12].forEach((detune, k) => {
        const j = n * 3 + k;
        phases[j] = (phases[j] + mtof(m + detune) / SR) % 1;
        x += phases[j] * 2 - 1;
      });
    });
    const cutoff = 300 + bright * 2600 * (0.6 + 0.4 * Math.sin(t * 1.3));
    const a = 1 - Math.exp((-2 * Math.PI * cutoff) / SR);
    lp += a * (x - lp);
    lp2 += a * (lp - lp2);
    out[i] = (lp2 / (notes.length * 3)) * Math.min(1, t * 3) * Math.min(1, (len - t) * 3);
  }
  return (t) => out[Math.min(L - 1, Math.round(t * SR))];
};
const sub808 = (f, from = 1.6, decay = 1.8) => (t) => {
  const glide = f * (1 + (from - 1) * Math.exp(-t * 28));
  return Math.tanh(1.1 * Math.sin(2 * Math.PI * glide * t)) * Math.exp(-t * decay) * Math.min(1, t * 900);
};
const snare = () => {
  const n = noise(0.25, 1800, 9000, (t) => Math.exp(-t * 18) * 2.2);
  return (t) => n(t) + Math.sin(2 * Math.PI * 190 * t) * Math.exp(-t * 30) * 0.7;
};
const fm = (f, ratio = 2, index = 3, decay = 14) => (t) =>
  Math.sin(2 * Math.PI * f * t + index * Math.exp(-t * 20) * Math.sin(2 * Math.PI * f * ratio * t)) * Math.exp(-t * decay) * Math.min(1, t * 2000);
const crash = () => noise(2.2, 3000, 16000, (t) => Math.exp(-t * 1.6) * 1.4);

// D major, I–V–vi–IV the whole way: bright, bouncy and friendly. The hit lifts into a fuller chorus.
const chords = [[62, 66, 69, 74], [57, 61, 64, 69], [59, 62, 66, 71], [55, 59, 62, 67]];
const roots = [38, 33, 35, 31];
const scale = [74, 76, 78, 81, 83, 86, 88];

const hook = sec(T.reveal);
const groove = sec(T.moves[0]);
const slam = sec(T.heroSlam);
const tagline = sec(T.tagline);
const end = sec(T.end);
const kicks = [];
const kickAt = (t, gain = 0.5) => {
  kicks.push(t);
  add(fx, t, 0.4, kick, gain, 0, 0);
  add(fx, t, 0.3, sub808(mtof(38), 1.4, 9), gain * 0.35, 0, 0);
};
const fmBell = (m, gain, pan = 0, at) => add(music, at, 1.2, fm(mtof(m), 3.5, 1.6, 4), gain, pan, 0.45);
const bassNote = (at, m, len = BEAT / 2) => {
  add(music, at, len, (t) => Math.sin(2 * Math.PI * mtof(m) * t) * Math.exp(-t * 5) * Math.min(1, t * 400), 0.34, 0, 0.02);
  add(music, at, len, pluck(mtof(m + 12), 0.99, len), 0.1, 0, 0.05);
};

// Hook: light and curious: soft pad, pizzicato plucks, a ticking hat.
add(music, 0, hook + 0.3, sawPad(chords[0], hook + 0.3, 0.12), 0.1, 0, 0.5);
for (let t = 0; t < hook; t += BEAT / 2) add(music, t, 0.05, hat(), 0.03, t % BEAT ? 0.3 : -0.3, 0.1);
add(music, hook - 0.8, 0.8, riser(0.8), 0.2, 0, 0.3);

// Reveal: a gentle build with rising plucks.
add(music, hook, groove - hook + 0.1, sawPad(chords[0], groove - hook + 0.1, 0.22), 0.11, 0, 0.5);
for (let t = hook, i = 0; t < groove - 0.01; t += BEAT / 2, i++) {
  add(music, t, 0.6, pluck(mtof([74, 78, 81, 86, 81, 78][i % 6]), 0.993, 0.6), 0.08 + (i / 20) * 0.06, i % 2 ? 0.35 : -0.35, 0.35);
  if (i % 8 === 0) kickAt(t, 0.4);
}
add(music, groove - 1, 1, riser(1), 0.22, 0, 0.3);

// Verse while solving: bouncy pop groove, kick on 1 and 3, claps on 2 and 4, offbeat hats.
const verse = (from, to) => {
  for (let bar = 0; from + bar * BEAT * 4 < to - 0.01; bar++) {
    const b0 = from + bar * BEAT * 4;
    const ch = chords[bar % 4];
    [0, 2].forEach((b) => kickAt(b0 + b * BEAT, 0.48));
    [1, 3].forEach((b) => add(music, b0 + b * BEAT, 0.18, clap(), 0.12, 0, 0.35));
    for (let s = 0; s < 4; s++) add(music, b0 + s * BEAT + BEAT / 2, 0.05, hat(), 0.045, 0.3, 0.1);
    [0, 1.5, 2, 3.5].forEach((b) => bassNote(b0 + b * BEAT, roots[bar % 4] + 12));
    add(music, b0, BEAT * 4, sawPad(ch, BEAT * 4, 0.25), 0.09, 0, 0.5);
    for (let s = 0; s < 8; s++) add(music, b0 + (s * BEAT) / 2, 0.6, pluck(mtof([ch[1], ch[2], ch[3], ch[2]][s % 4] + 12), 0.994, 0.6), 0.1, s % 2 ? 0.35 : -0.35, 0.35);
  }
};
verse(groove, slam);
add(music, sec(T.heroLift), slam - sec(T.heroLift), riser(slam - sec(T.heroLift)), 0.26, 0, 0.3);

// The hit: sparkle and a happy chorus with four-on-the-floor and a bell melody.
add(music, slam, 2, crash(), 0.1, 0, 0.4);
kickAt(slam, 0.7);
[74, 78, 81, 86, 90].forEach((m, i) => fmBell(m, 0.07, (i - 2) * 0.25, slam + i * 0.04));
const chorus = (from, to) => {
  const melody = [[2, 3, 4, 3], [4, 5, 4, 2], [3, 2, 1, 2], [1, 2, 3, 5]];
  for (let bar = 0; from + bar * BEAT * 4 < to - 0.01; bar++) {
    const b0 = from + bar * BEAT * 4;
    const ch = chords[bar % 4];
    for (let b = 0; b < 4; b++) kickAt(b0 + b * BEAT, 0.45);
    [1, 3].forEach((b) => add(music, b0 + b * BEAT, 0.18, clap(), 0.13, 0, 0.35));
    for (let s = 0; s < 8; s++) add(music, b0 + (s * BEAT) / 2 + BEAT / 4, 0.05, hat(), 0.04, 0.3, 0.1);
    for (let s = 0; s < 8; s++) bassNote(b0 + (s * BEAT) / 2, roots[bar % 4] + 12, BEAT / 2);
    add(music, b0, BEAT * 4, sawPad(ch, BEAT * 4, 0.35), 0.11, 0, 0.5);
    melody[bar % 4].forEach((d, i) => fmBell(scale[d], 0.085, 0.15, b0 + i * BEAT));
    for (let s = 0; s < 16; s++) if (s % 4 !== 3) add(music, b0 + (s * BEAT) / 4, 0.5, pluck(mtof([ch[0], ch[1], ch[2], ch[3]][s % 4] + 24), 0.992, 0.5), 0.05, s % 2 ? 0.4 : -0.4, 0.35);
  }
};
chorus(slam + BEAT * 2, tagline - BEAT);
add(music, tagline - 0.8, 0.8, riser(0.8), 0.18, 0, 0.3);

// Ending: a warm D major chord, the bell motif, and a long tail.
kickAt(tagline, 0.6);
add(music, tagline, 2, crash(), 0.08, 0, 0.5);
add(music, tagline, end - tagline + 0.5, sawPad([62, 66, 69, 74, 78], end - tagline + 0.5, 0.3), 0.13, 0, 0.6);
add(music, tagline, end - tagline + 0.5, (t) => Math.sin(2 * Math.PI * mtof(38) * t) * Math.exp(-t * 0.8), 0.3, 0, 0.05);
[0, 0.25, 0.5, 0.75, 1.25, 1.75].forEach((dt, i) => fmBell(scale[[0, 2, 4, 6, 4, 5][i]], 0.07, (i % 2 ? 0.3 : -0.3), tagline + dt));

// Sidechain: a gentle pump under every kick.
for (const t of kicks) {
  const s0 = Math.round(t * SR);
  for (let i = 0; i < SR * 0.18; i++) {
    const k = s0 + i;
    if (k >= N) break;
    const g = 0.7 + 0.3 * Math.min(1, i / (SR * 0.18));
    music[0][k] *= g;
    music[1][k] *= g;
  }
}

// Foley: digital blips for the numbers.

const blip = (at, m, gain = 0.12, pan = 0) => add(fx, at, 0.4, fm(mtof(m), 3, 1.2, 10), gain, pan, 0.35);
const whoosh = (at, len = 0.5, gain = 0.14) =>
  add(fx, at, len, noise(len, (t) => 500 + (t / len) * 2500, (t) => 2500 + (t / len) * 9000, (t) => Math.sin((Math.PI * t) / len) * 0.8), gain, 0, 0.3);
for (let i = 0; i < 6; i++) blip(sec(T.dropStart + i * T.dropStagger + 15), scale[i], 0.13, (i % 3 - 1) * 0.3);
kickAt(sec(T.targetLand), 0.7);
add(fx, sec(T.targetLand), 0.25, snare(), 0.2, 0, 0.3);
whoosh(sec(T.reveal) - 0.05, 0.6, 0.12);
T.moves.forEach((at, i) => {
  blip(sec(at), scale[i], 0.1, -0.3);
  blip(sec(at + 8), 86, 0.06, 0);
  blip(sec(at + 16), scale[i + 2], 0.1, 0.3);
  add(fx, sec(at + 34), 1.0, fm(mtof([86, 88, 90, 93][i]), 3.5, 1.6, 4), 0.09, 0, 0.45);
});
whoosh(sec(T.heroLift), 0.65, 0.18);
blip(sec(T.sheetUp) - 0.05, 72, 0.12);
whoosh(sec(T.sheetUp), 0.5, 0.12);
[0, 1, 2].forEach((n) => blip(sec(T.scorePop + n * 10 + 4), [86, 90, 93][n], 0.1, (n - 1) * 0.4));
[T.spinA, T.spinB, T.spinC].forEach((at) => whoosh(sec(at), 0.5, 0.18));
[T.modeTap, T.startTap].forEach((at, i) => blip(sec(at), [81, 86][i], 0.12, 0.2));
whoosh(sec(T.shareCard), 0.45, 0.1);
whoosh(sec(T.question), 0.6, 0.2);
whoosh(sec(T.tagline - 30), 0.55, 0.16);
[0, 1, 2].forEach((i) => whoosh(sec(T.fan + i * 8), 0.3, 0.06));
whoosh(sec(T.cardLift), 0.4, 0.1);
for (let s = 0; s < 4; s++) blip(sec(T.spinC + 30 + s * 60), 93, 0.06, 0.3);

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
fs.writeFileSync(path.join(root, "public/talljakt/soundtrack.wav"), data);
console.log(`soundtrack.wav ${DUR.toFixed(2)} s`);
