// quiz_audio.mjs — app-promo
// Synthesises the Quiz soundtrack (music + foley) from the shared timeline. No samples, no third-party audio.
// Palette: a warm, swinging quiz-night combo (Rhodes, upright bass, brushes, snaps, music box), unlike the
// marimba of Unblock and the electro-pop of Talljakt.
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const T = JSON.parse(fs.readFileSync(path.join(root, "src/quiz/timeline.json"), "utf8"));
const SR = 48000;
const DUR = T.end / T.fps + 0.5;
const N = Math.round(SR * DUR);
const sec = (frame) => frame / T.fps;
const BEAT = 60 / T.bpm;
const SWING = BEAT * (2 / 3);

const music = [new Float32Array(N), new Float32Array(N)];
const fx = [new Float32Array(N), new Float32Array(N)];
const send = new Float32Array(N);
let seed = 11;
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

// ---- Instruments
// Rhodes: FM with a decaying index and a faint high tine.
const rhodes = (f, decay = 1.6) => (t) => {
  const index = 1.6 * Math.exp(-t * 5) + 0.25;
  const body = Math.sin(2 * Math.PI * f * t + index * Math.sin(2 * Math.PI * f * t));
  const tine = 0.18 * Math.sin(2 * Math.PI * f * 14 * t) * Math.exp(-t * 30);
  const trem = 1 + 0.12 * Math.sin(2 * Math.PI * 4.5 * t);
  return (body + tine) * Math.exp(-t * decay) * Math.min(1, t * 300) * trem;
};
// Upright bass: round sine with a thumpy attack and a little second harmonic.
const upright = (f, decay = 4) => (t) => {
  const ph = 2 * Math.PI * f * t * (1 + 0.02 * Math.exp(-t * 40));
  return Math.tanh(1.3 * (Math.sin(ph) + 0.25 * Math.sin(2 * ph) + 0.4 * Math.exp(-t * 50) * Math.sin(3 * ph))) * Math.min(1, t * 400) * Math.exp(-t * decay);
};
// Music box / celesta: bright, quick and sparkly.
const musicBox = (f, decay = 3.5) => (t) =>
  Math.min(1, t * 1500) *
  (Math.sin(2 * Math.PI * f * t) * Math.exp(-t * decay) + 0.35 * Math.sin(2 * Math.PI * f * 4.02 * t) * Math.exp(-t * decay * 4) + 0.1 * Math.sin(2 * Math.PI * f * 6.8 * t) * Math.exp(-t * decay * 6));
const bell = (f, decay = 2.2) => (t) =>
  Math.min(1, t * 600) *
  (Math.sin(2 * Math.PI * f * t) * Math.exp(-t * decay) +
    0.45 * Math.sin(2 * Math.PI * f * 2.76 * t) * Math.exp(-t * decay * 1.8) +
    0.2 * Math.sin(2 * Math.PI * f * 5.4 * t) * Math.exp(-t * decay * 3));
const snap = () => noise(0.09, 1400, 3800, (t) => (t < 0.004 ? 4 : 0) + Math.exp(-t * 70) * 3.2);
const brush = (len = 0.32) => noise(len, 1800, 7000, (t) => Math.min(1, t * 60) * Math.exp(-t * 9) * 1.6);
const brushTap = () => noise(0.08, 2500, 9000, (t) => Math.exp(-t * 60) * 1.8);
const shaker = () => noise(0.07, 5000, 12000, (t) => Math.min(1, t * 200) * Math.exp(-t * 45) * 1.6);
const kick = (t) => Math.sin(2 * Math.PI * (48 * t + (70 * (1 - Math.exp(-t * 30))) / 30)) * Math.exp(-t * 10) * Math.min(1, t * 800);
const thunk = (f) => {
  const n = noise(0.12, 80, 900, (t) => Math.exp(-t * 50) * 2);
  return (t) => (Math.sin(2 * Math.PI * f * t * (1 + 0.5 * Math.exp(-t * 40))) * Math.exp(-t * 18) + n(t) * 0.7) * Math.min(1, t * 2000);
};
const tick = (f) => {
  const n = noise(0.04, f, f * 3, (t) => Math.exp(-t * 150) * 2);
  return (t) => (Math.sin(2 * Math.PI * f * t) * Math.exp(-t * 90) + n(t)) * Math.min(1, t * 3000);
};
const whoosh = (at, len = 0.5, gain = 0.14, pan = 0) =>
  add(fx, at, len, noise(len, (t) => 400 + (t / len) * 2000, (t) => 2000 + (t / len) * 8000, (t) => Math.sin((Math.PI * t) / len) * 0.9), gain, pan, 0.3);
const swell = (at, len, gain = 0.12) => add(fx, at - len, len, noise(len, (t) => 300 + (t / len) * 2500, (t) => 1200 + (t / len) * 10000, (t) => Math.pow(t / len, 2.4)), gain, 0, 0.4);

// ---- Harmony: F major, I–vi–ii–V with sevenths, two beats per chord.
const chords = [
  [57, 60, 64, 65], // Fmaj7
  [57, 60, 62, 65], // Dm7
  [55, 58, 62, 65], // Gm7
  [55, 58, 60, 64], // C7
];
const roots = [41, 38, 43, 36];
const walk = [[41, 45], [38, 41], [43, 46], [36, 40]];
const motif = [77, 81, 84, 81, 86, 84];

const chordAt = (t) => Math.floor(t / (BEAT * 2)) % 4;
const beats = (from, to) => {
  const out = [];
  for (let b = Math.ceil(from / BEAT - 1e-6); b * BEAT < to - 1e-6; b++) out.push(b);
  return out;
};

const comp = (from, to, gain = 0.07, pattern = "full") => {
  for (const b of beats(from, to)) {
    const t = b * BEAT;
    const c = chords[chordAt(t)];
    const accent = b % 2 === 0;
    if (pattern === "pad" ? b % 2 === 0 : true) {
      // Charleston-ish: on the chord's first beat, and a swung push before the second.
      const at = accent ? t : t + SWING;
      const len = pattern === "pad" ? BEAT * 2.2 : accent ? BEAT * 1.2 : BEAT * 0.6;
      c.forEach((m, i) => add(music, at + i * 0.006, len + 0.6, rhodes(mtof(m), pattern === "pad" ? 0.7 : 2.2), gain * (accent ? 1 : 0.7), (i - 1.5) * 0.25, 0.25));
    }
  }
};
const bassLine = (from, to, gain = 0.32) => {
  for (const b of beats(from, to)) {
    const t = b * BEAT;
    const ci = chordAt(t);
    const m = walk[ci][b % 2];
    add(music, t, BEAT * 1.1, upright(mtof(m)), gain, -0.05, 0.05);
  }
};
const drums = (from, to, gain = 1) => {
  for (const b of beats(from, to)) {
    const t = b * BEAT;
    if (b % 2 === 1) {
      add(music, t, 0.1, snap(), 0.16 * gain, 0.35, 0.2);
      add(music, t, 0.35, brush(), 0.09 * gain, -0.15, 0.15);
    } else {
      add(music, t, 0.4, kick, 0.38 * gain, 0, 0.02);
    }
    add(music, t, 0.1, brushTap(), 0.05 * gain, 0.2, 0.1);
    add(music, t + SWING, 0.08, shaker(), 0.06 * gain, 0.45, 0.05);
  }
};
const snaps = (from, to, gain = 0.15) => {
  for (const b of beats(from, to)) if (b % 2 === 1) add(music, b * BEAT, 0.1, snap(), gain, 0.35, 0.25);
};
const box = (at, m, gain = 0.09, pan = 0.2) => add(music, at, 2.2, musicBox(mtof(m)), gain, pan, 0.45);

// ---- Arrangement
const t = Object.fromEntries(Object.entries(T).map(([k, v]) => [k, typeof v === "number" ? sec(v) : v]));
const click = (at, gain = 0.1) => add(fx, at, 0.05, tick(2600), gain, 0, 0.05);
// Speech: a little run of rounded syllables, the shape of a confident answer.
const speak = (at, contour, pan = 0.35) =>
  contour.forEach((m, i) => {
    const f = mtof(m);
    add(fx, at + i * 0.085, 0.13, (x) => (Math.sin(2 * Math.PI * f * x * (1 + 0.04 * Math.sin(x * 40))) + 0.35 * Math.sin(2 * Math.PI * f * 2 * x)) * Math.sin((Math.PI * x) / 0.13), 0.06, pan, 0.25);
  });
// Rubber stretching: a rising, wobbling creak, then a snap.
const stretch = (from, to, gain = 0.1) => {
  const len = to - from;
  add(fx, from, len, (x) => {
    const p = x / len;
    const f = 140 + 360 * p * p;
    return Math.sin(2 * Math.PI * f * x + 3 * Math.sin(2 * Math.PI * (9 + 14 * p) * x)) * Math.pow(p, 1.5) * 0.8;
  }, gain, 0, 0.2);
  add(fx, from, len, noise(len, (x) => 600 + 2400 * (x / len), (x) => 1500 + 5000 * (x / len), (x) => Math.pow(x / len, 2) * (0.6 + 0.4 * Math.sin(x * 160))), gain * 0.6, 0, 0.15);
};
const snapPop = (at, gain = 1) => {
  add(fx, at, 0.4, kick, 0.35 * gain, 0, 0.1);
  add(fx, at, 0.25, (x) => Math.sin(2 * Math.PI * (900 * x - 2600 * x * x)) * Math.exp(-x * 26), 0.2 * gain, 0, 0.2);
  add(fx, at, 0.08, noise(0.08, 1500, 9000, (x) => Math.exp(-x * 80) * 3), 0.18 * gain, 0, 0.2);
};
// A deflating "womp" for the wrong guess.
const womp = (at) =>
  [0, 0.32].forEach((d, i) =>
    add(fx, at + d, 0.4, (x) => {
      const f = mtof(i ? 50 : 52) * (1 - 0.12 * (x / 0.4));
      const ph = 2 * Math.PI * f * x;
      return (Math.sin(ph) + 0.5 * Math.sin(2 * ph) + 0.3 * Math.sin(3 * ph)) * Math.min(1, x * 30) * Math.exp(-x * 4) * (1 + 0.2 * Math.sin(x * 38));
    }, 0.09, 0, 0.2),
  );
const boop = (at, m, pan) => add(fx, at, 0.25, (x) => Math.sin(2 * Math.PI * mtof(m) * x * (1 - 0.25 * x)) * Math.exp(-x * 14) * Math.min(1, x * 800), 0.18, pan, 0.2);

// Hook: soft Rhodes and snaps, a music-box question.
comp(0, t.reveal, 0.055);
snaps(BEAT * 1, t.reveal, 0.12);
box(t.cardLand, 81, 0.08);
box(t.buttonLand, 84, 0.08, -0.2);
add(fx, t.cardLand, 0.3, thunk(95), 0.26, -0.1, 0.1);
add(fx, t.cardLand, 0.2, brush(0.2), 0.08, 0, 0.1);
add(fx, t.buttonLand, 0.3, thunk(75), 0.34, 0.1, 0.1);
whoosh(t.reveal - 0.05, 0.6, 0.1);
// Reveal: bass walks in, a soft swell into the groove.
comp(t.reveal, t.revealEnd, 0.06);
bassLine(t.reveal, t.push, 0.26);
snaps(t.reveal, t.revealEnd, 0.13);
swell(t.revealEnd, 1.2, 0.08);
// "Svar høyt": the groove, and the answer said out loud.
comp(t.revealEnd, t.push, 0.065);
drums(t.revealEnd, t.push);
add(fx, t.bubble, 0.2, (x) => Math.sin(2 * Math.PI * 600 * x * (1 + x * 3)) * Math.exp(-x * 20), 0.1, 0.4, 0.2);
speak(t.bubble + 0.08, [67, 69, 71, 69, 72, 74, 72, 67], 0.4);
// Thinking time: the band stops, a held chord and a ticking clock.
add(music, t.push, t.tap - t.push + 0.4, (x) => [55, 58, 60, 65].reduce((s, m) => s + rhodes(mtof(m), 0.35)(x), 0) * 0.25, 0.22, 0, 0.35);
add(music, t.push, t.tap - t.push + 0.2, upright(mtof(36), 0.6), 0.22, 0, 0.05);
for (let i = 0; i < 4; i++) add(fx, t.push + i * BEAT * 0.5, 0.06, tick(i % 2 ? 1700 : 2100), 0.07 + i * 0.012, i % 2 ? 0.3 : -0.3, 0.1);
click(sec(T.tap - 12));
// The button stretches and tears: red rings out left, green right.
stretch(t.tap - 0.05, t.snap, 0.12);
snapPop(t.snap);
add(fx, t.snap, 3, bell(mtof(72), 1.6), 0.12, -0.65, 0.6);
add(fx, t.snap + 0.03, 3, bell(mtof(76), 1.6), 0.12, 0.65, 0.6);
add(fx, t.snap + 0.06, 3, bell(mtof(79), 1.4), 0.08, 0.65, 0.6);
// The band is back from the tear to the question card.
comp(t.snap, t.question, 0.065);
bassLine(t.snap, t.question);
drums(t.snap, t.question);
// The bubble hops onto Riktig: whoosh, boop, a happy arpeggio.
whoosh(t.press - 0.55, 0.5, 0.1, 0.3);
boop(t.press, 79, 0.4);
add(fx, t.press + 0.08, 0.12, noise(0.12, 2000, 9000, (x) => Math.exp(-x * 40) * 2), 0.1, 0.4, 0.2);
[81, 84, 89].forEach((m, i) => add(fx, t.press + 0.08 + i * 0.07, 1.6, bell(mtof(m), 2.6), 0.07, 0.45, 0.45));
// Fast forward: a tape whirr with a tick for every card that flies by.
add(fx, t.ffStart, t.ffEnd - t.ffStart, (x) => {
  const len = t.ffEnd - t.ffStart;
  const p = x / len;
  const f = 180 + 900 * Math.sin(Math.PI * p);
  return (Math.sin(2 * Math.PI * f * x) * 0.4 + 0.6 * Math.sin(4 * Math.PI * f * x)) * Math.sin(Math.PI * p) * 0.5;
}, 0.05, 0, 0.1);
add(fx, t.ffStart, t.ffEnd - t.ffStart, noise(t.ffEnd - t.ffStart, 1500, 8000, (x) => Math.sin((Math.PI * x) / (t.ffEnd - t.ffStart)) * 0.9), 0.08, 0, 0.2);
for (let card = 2; card <= 13; card++) {
  const p = (card - 1.5) / 12.5;
  // Inverse of the cubic ease-in-out the video uses for the fast forward.
  const u = p < 0.5 ? Math.cbrt(p / 4) : 1 - Math.cbrt((1 - p) / 4);
  add(fx, t.ffStart + u * (t.ffEnd - t.ffStart), 0.05, tick(2400 + card * 60), 0.06, ((card % 3) - 1) * 0.4, 0.1);
}
// The last question: "Barcelona!" said proudly, a shorter stretch, then the real answer deflates it.
speak(t.bubble2 + 0.06, [69, 72, 74, 72, 76], 0.3);
click(sec(T.tap2 - 10));
stretch(sec(T.tap2 - 4), sec(T.tap2 + 20), 0.09);
snapPop(sec(T.tap2 + 20), 0.8);
womp(sec(T.tap2 + 44));
whoosh(t.press2 - 0.55, 0.5, 0.1, -0.3);
boop(t.press2, 62, -0.4);
add(fx, t.press2, 0.3, thunk(85), 0.2, -0.4, 0.1);
// Result: a ta-da, and chimes with the ring pulses.
[77, 81, 84, 89].forEach((m, i) => box(t.result + 0.2 + i * 0.09, m, 0.08, (i - 1.5) * 0.25));
[sec(T.result + 70), sec(T.result + 100)].forEach((at, i) => add(fx, at, 2, bell(mtof(i ? 88 : 84), 2), 0.07, 0, 0.5));
click(t.done);
whoosh(t.done + 0.15, 0.5, 0.12, 0.3);
// History: a blip per badge, climbing.
[84, 86, 88, 91].forEach((m, i) => box(sec(T.pops + i * 15), m, 0.08, (i - 1.5) * 0.3));
// The question card: the band thins out to Rhodes, bass and snaps, then lifts into the tagline.
whoosh(t.question, 0.6, 0.16);
comp(t.question, t.tagline, 0.06);
bassLine(t.question, t.tagline, 0.24);
snaps(t.question, t.tagline, 0.13);
swell(t.tagline, 1.0, 0.1);
whoosh(t.tagline - 0.5, 0.5, 0.12);
// Tagline: one more chorus, then a final Fmaj9 under the icon and a music-box goodbye.
const final = sec(T.tagline + 60);
comp(t.tagline, final, 0.065);
bassLine(t.tagline, final);
drums(t.tagline, final);
add(music, final, 5, (x) => [53, 57, 60, 64, 67, 69].reduce((s, m) => s + rhodes(mtof(m), 0.45)(x), 0) * 0.2, 0.26, 0, 0.5);
add(music, final, 4, upright(mtof(29), 0.7), 0.34, 0, 0.05);
add(fx, final, 0.5, kick, 0.4, 0, 0.1);
add(music, final, 0.4, brush(0.6), 0.1, 0, 0.3);
[77, 81, 84, 89].forEach((m, i) => box(final + 0.5 + i * 0.16, m, 0.07, (i - 1.5) * 0.3));
box(final + 1.8, 89, 0.05, 0.3);
box(final + 2.3, 84, 0.04, -0.3);

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
    out[c][i] = Math.tanh((music[c][i] * 0.9 + fx[c][i] + rev[c][i] * 0.35) * 2.2) * fade;
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
fs.writeFileSync(path.join(root, "public/quiz/soundtrack.wav"), data);
console.log(`soundtrack.wav ${DUR.toFixed(2)} s`);
