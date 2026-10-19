// QuizPromo.tsx — app-promo
import React, { useEffect, useState } from "react";
import { ThreeCanvas } from "@remotion/three";
import { Audio } from "@remotion/media";
import { loadFont } from "@remotion/fonts";
import { AbsoluteFill, continueRender, delayRender, Easing, Img, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { Phone } from "../three/Phone";
import { Lifted } from "../three/Lifted";
import { Slab, Sprite, StudioLights } from "../three/Sprite";
import { Title } from "../unblock/Title";
import { Redraw, useFrameTexture } from "../three/useFrameTexture";
import meta from "../../public/quiz/quiz.json";
import bubbles from "../../public/quiz/bubbles.json";
import timeline from "./timeline.json";

// Beat sheet in frames at 60 fps (120 bpm). Shared with tools/quiz_audio.mjs.
export const T = timeline;

const palette = {
  paper: "#F4F0E7",
  paperDeep: "#E9E1D1",
  ink: "#2A2420",
  good: "#4F8C5E",
  gold: "#F2B84B",
};
const serif = "Young Serif";
const sans = "Bricolage Grotesque";
const fontsReady = Promise.all([
  loadFont({ family: serif, url: staticFile("fonts/YoungSerif-Regular.ttf"), weight: "400" }),
  loadFont({ family: sans, url: staticFile("fonts/BricolageGrotesque.ttf"), weight: "200 800" }),
]);

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const out = Easing.bezier(0.16, 1, 0.3, 1);
const inOut = Easing.bezier(0.65, 0, 0.35, 1);
const back = Easing.bezier(0.34, 1.56, 0.64, 1);
const ramp = (frame: number, from: number, to: number, easing = out) => interpolate(frame, [from, to], [0, 1], { ...clamp, easing });

type Rect = [number, number, number, number];
const M = meta as unknown as { card: Rect; button: Rect; wrong: Rect; right: Rect };
const FINISH = "silver" as const;
const BUTTON_Y = 2397;
const RIGHT_X = 877;
const WRONG_X = 328;

// Which frame of the whole-quiz take (tools/quiz_rec.py "full", 60 fps) shows at each video frame.
// Card 1: tap 60, split 74–84, answer in by 112, Riktig pressed 155 and green from 163, card 2 by 195.
// Card 14: tap 1520, split 1530–1540, Feil pressed 1609 and red from 1623, result 1631, Ferdig 1794, home by 1862.
const knots: [number, number][] = [
  [T.revealEnd, 30],
  [T.tap - 12, 60],
  [T.tap, 72],
  // The stretch: the split runs at a quarter speed, then snaps.
  [T.snap, 80],
  [T.snap + 32, 112],
  [T.press - 8, 155],
  [T.press, 163],
  [T.press + 32, 195],
  [T.ffStart, 195],
  [T.ffEnd, 1505],
  [T.tap2 - 10, 1520],
  [T.tap2, 1528],
  [T.tap2 + 20, 1536],
  [T.tap2 + 29, 1545],
  [T.press2 - 14, 1609],
  [T.press2, 1623],
  [T.press2 + 8, 1631],
  [T.done - 2, 1792],
  [T.done + 30, 1824],
  [T.done + 68, 1862],
];
const srcAt = (frame: number) => {
  if (frame <= knots[0][0]) return knots[0][1];
  for (let i = 1; i < knots.length; i++) {
    const [f0, s0] = knots[i - 1];
    const [f1, s1] = knots[i];
    if (frame <= f1) {
      // Fast forward through cards 2–13 eases in and out.
      const t = f0 === T.ffStart ? Easing.inOut(Easing.cubic)((frame - f0) / (f1 - f0)) : (frame - f0) / (f1 - f0);
      return Math.round(s0 + (s1 - s0) * t);
    }
  }
  return knots[knots.length - 1][1];
};
const framePath = (frame: number) => {
  const blurred = frame > T.ffStart + 8 && frame < T.ffEnd - 8;
  return `quiz/frames/${blurred ? "ff" : "full"}/${srcAt(frame)}.jpg`;
};

const shakeAt = (frame: number, hits: { at: number; amp: number }[]) =>
  hits.reduce((sum, hit) => {
    const t = frame - hit.at;
    return t < 0 || t > 30 ? sum : sum + hit.amp * Math.exp(-t / 5) * Math.sin(t * 2.1);
  }, 0);
const impacts = [
  { at: T.cardLand, amp: 0.02 },
  { at: T.buttonLand, amp: 0.014 },
  { at: T.snap, amp: 0.012 },
  { at: T.press, amp: 0.01 },
  { at: T.press2, amp: 0.008 },
];

type Pose = { f: number; rotation: [number, number, number]; scale: number; position?: [number, number, number]; focus?: [number, number, number] };
const K = 0.000553;
const place = (pose: Pose): [number, number, number] =>
  pose.focus ? [-(pose.focus[0] - 603) * K * pose.scale, pose.focus[2] + (pose.focus[1] - 1311) * K * pose.scale, 0] : pose.position!;
const overview = (f: number, rotation: [number, number, number], x = 0, y = -0.3, scale = 1.14): Pose => ({ f, position: [x, y, 0], rotation, scale });
const button: [number, number, number] = [603, BUTTON_Y, -0.3];

const poses: Pose[] = [
  { f: 0, position: [0, -0.5, 0], rotation: [0.3, -0.12, 0.03], scale: 1.42 },
  { f: T.reveal, position: [0, -0.42, 0], rotation: [0.16, -0.06, 0.01], scale: 1.32 },
  overview(T.revealEnd, [0.07, -0.16, 0.01], -0.1),
  overview(T.push, [0.06, -0.1, 0], -0.08),
  { f: T.tap - 6, focus: button, rotation: [0.04, 0.03, 0], scale: 2.5 },
  { f: T.snap, focus: button, rotation: [0.05, 0.05, 0], scale: 2.6 },
  { f: T.snap + 40, focus: [680, 1760, -0.35], rotation: [0.06, -0.08, 0], scale: 1.32 },
  { f: T.press - 4, focus: [760, 2230, -0.3], rotation: [0.05, -0.04, 0], scale: 1.8 },
  { f: T.press + 26, focus: [700, 2100, -0.3], rotation: [0.05, 0.02, 0], scale: 1.6 },
  overview(T.ffStart + 20, [0.08, 0.14, 0]),
  overview(T.ffEnd - 10, [0.06, -0.12, 0], -0.08),
  overview(T.tap2 - 40, [0.05, -0.06, 0], -0.06),
  { f: T.tap2 - 6, focus: button, rotation: [0.04, -0.03, 0], scale: 2.2 },
  { f: T.tap2 + 20, focus: button, rotation: [0.04, -0.03, 0], scale: 2.25 },
  { f: T.tap2 + 56, focus: [560, 1880, -0.3], rotation: [0.06, 0.08, 0], scale: 1.5 },
  { f: T.press2 - 4, focus: [460, 2230, -0.3], rotation: [0.05, 0.05, 0], scale: 1.8 },
  overview(T.result + 30, [0.07, -0.1, 0]),
  { f: T.result + 70, focus: [603, 700, -0.15], rotation: [0.05, 0.04, 0], scale: 1.9 },
  { f: T.done - 40, focus: [603, 760, -0.2], rotation: [0.04, -0.03, 0], scale: 1.85 },
  overview(T.done - 8, [0.05, 0.02, 0]),
  overview(T.done + 40, [0.07, 0.12, 0]),
  { f: T.pops - 10, focus: [700, 1950, -0.6], rotation: [0.05, -0.08, 0], scale: 1.25 },
  { f: T.pops + 110, focus: [700, 1950, -0.6], rotation: [0.04, -0.12, 0], scale: 1.25 },
  overview(T.question, [0.06, 0.1, 0]),
  { f: T.tagline, position: [0, -0.62, 0], rotation: [0.03, 0, 0], scale: 1.2 },
  { f: T.end, position: [0, -0.6, 0], rotation: [0.02, 0.04, 0], scale: 1.21 },
];

const rigPose = (frame: number) => {
  const i = Math.max(0, poses.findIndex((_, index) => frame < (poses[index + 1]?.f ?? Infinity)));
  const a = poses[i];
  const b = poses[Math.min(poses.length - 1, i + 1)];
  const t = a === b ? 1 : interpolate(frame, [a.f, b.f], [0, 1], { ...clamp, easing: inOut });
  const mix = (x: number, y: number) => x + (y - x) * t;
  const s = shakeAt(frame, impacts);
  const sway = 1 - ramp(frame, T.tagline - 60, T.tagline + 30, inOut) * 0.7;
  const [pa, pb] = [place(a), place(b)];
  return {
    position: [mix(pa[0], pb[0]) + s, mix(pa[1], pb[1]) + s * 0.6 + Math.sin(frame / 40) * 0.008 * sway, 0] as [number, number, number],
    rotation: [mix(a.rotation[0], b.rotation[0]), mix(a.rotation[1], b.rotation[1]), mix(a.rotation[2], b.rotation[2])] as [number, number, number],
    scale: mix(a.scale, b.scale),
  };
};

// The picture question and the Vis svar button fall in onto where the phone will be.
const Hook: React.FC<{ readonly frame: number }> = ({ frame }) => {
  const fall = (land: number, len: number) =>
    interpolate(frame, [land - len, land, land + 5, land + 10], [1, 0, 0.025, 0], {
      ...clamp,
      easing: [Easing.bezier(0.5, 0, 0.9, 0.5), Easing.out(Easing.quad), Easing.in(Easing.quad)],
    });
  const card = fall(T.cardLand, T.cardLand - T.cardDrop);
  const btn = fall(T.buttonLand, T.buttonLand - T.buttonDrop);
  return (
    <>
      {frame >= T.cardDrop ? (
        <Sprite src="quiz/card1.png" x={M.card[0]} y={M.card[1]} width={M.card[2]} height={M.card[3]} z={2 + card * 1700} scale={1 + card * 0.4} rotation={[card * -0.5, card * 0.3, card * 0.22]} opacity={ramp(frame, T.cardDrop, T.cardDrop + 4)} />
      ) : null}
      {frame >= T.buttonDrop ? (
        <Slab src="quiz/vis-svar.png" color="#171310" depth={btn * 60} radius={84} x={M.button[0]} y={M.button[1]} width={M.button[2]} height={M.button[3]} z={2 + btn * 1500} scale={1 + btn * 0.5} rotation={[btn * 0.6, btn * -0.25, btn * -0.3]} opacity={ramp(frame, T.buttonDrop, T.buttonDrop + 4)} />
      ) : null}
    </>
  );
};

type BubbleProps = {
  readonly frame: number;
  readonly src: string;
  readonly size: number[];
  readonly at: number;
  // Resting point beside the card (where the tail points), and the button it presses.
  readonly rest: [number, number];
  readonly target: number;
  readonly press: number;
  // A wrong answer sags once the real answer shows.
  readonly sagAt?: number;
};

// The spoken answer: pops out beside the card, waits, then drops onto the button it grades.
const Bubble: React.FC<BubbleProps> = ({ frame, src, size, at, rest, target, press, sagAt }) => {
  if (frame < at || frame > press + 14) return null;
  const [w, h] = size;
  const pop = ramp(frame, at, at + 22, back);
  const sag = sagAt === undefined ? 0 : ramp(frame, sagAt, sagAt + 24, back);
  const fly = ramp(frame, press - 34, press, Easing.bezier(0.5, 0, 0.75, 0.6));
  const hop = Math.sin(Math.PI * Math.min(1, fly * 1.15)) * 260;
  const x = rest[0] + (target - rest[0]) * fly;
  const y = rest[1] + sag * 70 + (BUTTON_Y - rest[1] - sag * 70) * fly;
  const z = 260 * (1 - fly) + 30 + hop;
  const after = frame - press;
  // Squash on the button, then burst.
  const squash = after < 0 ? 0 : interpolate(after, [0, 4, 8], [0, 1, 0.6], clamp);
  const burst = ramp(frame, press + 5, press + 14, Easing.out(Easing.quad));
  const bob = Math.sin((frame - at) / 14) * 10 * (1 - fly);
  const scale = 1.7 * (0.25 + 0.75 * pop) * (1 - 0.62 * fly) * (1 - 0.08 * sag) * (1 + burst * 0.5);
  // The bubble grows from its tail; while it flies, its middle heads for the button.
  const ox = -w * 0.12 * (1 - fly) - (w / 2) * fly;
  const oy = -h * 0.92 * (1 - fly) - (h / 2) * fly;
  return (
    <group position={[x, y + bob, z]} rotation={[0, 0, -0.06 + sag * -0.2 + fly * 0.1]} scale={[scale * (1 + squash * 0.18), scale * (1 - squash * 0.28), 1]}>
      <Sprite src={src} x={ox} y={oy} width={w} height={h} opacity={Math.min(1, pop * 3) * (1 - burst)} renderOrder={8} />
    </group>
  );
};

const Tap: React.FC<{ readonly frame: number; readonly at: number; readonly x: number; readonly y: number }> = ({ frame, at, x, y }) => {
  if (frame < at - 6 || frame > at + 24) return null;
  const press = interpolate(frame, [at - 6, at, at + 8], [1.4, 0.8, 0.8], { ...clamp, easing: out });
  const fade = interpolate(frame, [at - 6, at - 2, at + 8, at + 24], [0, 1, 1, 0], clamp);
  const ripple = ramp(frame, at + 2, at + 24);
  const size = 130;
  return <Sprite src="quiz/tap.png" x={x - size / 2} y={y - size / 2} width={size} height={size} z={300} scale={press + ripple * 0.7} opacity={fade} renderOrder={9} />;
};

// Two gold pulses out of the score ring on the result.
const RingPulse: React.FC<{ readonly frame: number }> = ({ frame }) => (
  <>
    {[T.result + 70, T.result + 100].map((at) => {
      const p = ramp(frame, at, at + 40);
      if (frame < at || p >= 1) return null;
      const size = 560;
      return <Sprite key={at} src="quiz/ring.png" x={603 - size / 2} y={663 - size / 2} width={size} height={size} z={20} scale={1 + p * 0.6} opacity={(1 - p) * 0.9} renderOrder={6} />;
    })}
  </>
);

// The score badges in the history list pop one after another.
const badges: [string, Rect][] = [
  ["10", [908, 1267, 194, 138]],
  ["9", [954, 1704, 162, 108]],
  ["11", [954, 1935, 162, 108]],
  ["6", [954, 2397, 162, 108]],
];
const BadgePops: React.FC<{ readonly frame: number }> = ({ frame }) => (
  <>
    {badges.map(([name, rect], i) => {
      const at = T.pops + i * 15;
      const p = interpolate(frame, [at, at + 8, at + 30], [0, 1, 0], { ...clamp, easing: [Easing.out(Easing.quad), Easing.inOut(Easing.quad)] });
      if (p <= 0) return null;
      return <Lifted key={name} rect={rect} src={`quiz/home-badge-${name}.png`} color="#D9CDB4" depth={30} radius={36} lift={p * 120} scale={1 + p * 0.22} rotation={[0, 0, p * (i % 2 ? 0.06 : -0.06)]} />;
    })}
  </>
);

// Full-screen text card: a circle wipe in ink from the button, then it slides up off the end screen.
const QuestionCard: React.FC<{ readonly frame: number; readonly from: number; readonly to: number; readonly lines: [string, string] }> = ({ frame, from, to, lines }) => {
  if (frame < from || frame > to + 30) return null;
  const wipe = ramp(frame, from, from + 26, Easing.bezier(0.7, 0, 0.3, 1));
  const away = ramp(frame, to, to + 28, Easing.bezier(0.7, 0, 0.3, 1));
  const word = (i: number) => ramp(frame, from + 14 + i * 8, from + 38 + i * 8, back);
  return (
    <AbsoluteFill style={{ clipPath: `circle(${wipe * 150}% at 50% 80%)`, translate: `0 ${-away * 1920}px`, background: `linear-gradient(170deg, #3A322C 0%, ${palette.ink} 100%)`, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ textAlign: "center", fontFamily: serif, fontSize: 128, lineHeight: 1.08, letterSpacing: "-0.02em", whiteSpace: "nowrap" }}>
        {lines.map((line, i) => (
          <div key={line} style={{ color: i ? palette.gold : "#FFFDF8", opacity: word(i), translate: `0 ${(1 - word(i)) * 80}px`, scale: `${0.9 + 0.1 * word(i)}` }}>
            {line}
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
};

// Real pieces of the app drifting behind everything; smaller ones are further away, so softer.
const decor: [string, number, number, number, number][] = [
  // sprite, x, y, width, rotation (deg)
  ["badge-11", -30, 330, 240, -12],
  ["riktig", 760, 470, 320, 9],
  ["badge-9", 880, 1180, 200, 10],
  ["feil", -90, 1120, 300, -8],
  ["badge-6", 70, 1620, 170, 14],
  ["badge-10", 820, 1640, 250, -10],
];
const Backdrop: React.FC<{ readonly frame: number }> = ({ frame }) => (
  <>
    <AbsoluteFill style={{ background: `linear-gradient(165deg, #FAF7F0 0%, ${palette.paper} 45%, ${palette.paperDeep} 100%)` }} />
    <AbsoluteFill style={{ background: `radial-gradient(circle at ${76 + Math.sin(frame / 120) * 4}% ${68 + Math.cos(frame / 100) * 3}%, rgba(242,184,75,0.26) 0%, rgba(242,184,75,0) 36%)` }} />
    <AbsoluteFill style={{ background: "radial-gradient(circle at 14% 34%, rgba(94,158,110,0.16) 0%, rgba(94,158,110,0) 30%)" }} />
    {decor.map(([src, x, y, w, r], i) => {
      const depth = w / 320;
      const drift = Math.sin(frame / (70 + i * 9) + i) * 18;
      return (
        <Img
          key={src}
          src={staticFile(`quiz/${src}.png`)}
          style={{
            position: "absolute",
            left: x,
            top: y - frame * 0.1 * depth + drift,
            width: w,
            rotate: `${r + Math.sin(frame / 90 + i) * 4}deg`,
            opacity: 0.3 + depth * 0.35,
            filter: `blur(${(1 - depth) * 6 + 1.5}px)`,
          }}
        />
      );
    })}
  </>
);

// The tear: red to the left, green to the right, from where the button sits in the close-up.
const SplitFlash: React.FC<{ readonly frame: number }> = ({ frame }) => {
  const p = interpolate(frame, [T.snap, T.snap + 4, T.snap + 30], [0, 1, 0], { ...clamp, easing: [Easing.out(Easing.quad), out] });
  if (p <= 0) return null;
  const spread = 18 + ramp(frame, T.snap, T.snap + 30) * 22;
  return (
    <AbsoluteFill
      style={{
        opacity: p * 0.35,
        background: `radial-gradient(ellipse ${spread}% 10% at 22% 60%, rgba(217,103,74,0.9) 0%, rgba(217,103,74,0) 100%), radial-gradient(ellipse ${spread}% 10% at 78% 60%, rgba(94,158,110,0.9) 0%, rgba(94,158,110,0) 100%)`,
        mixBlendMode: "multiply",
      }}
    />
  );
};

// Last line of the closing slogan: "Svar høyt. Rett selv. [icon] Quiz."
const Badge: React.FC<{ readonly frame: number }> = ({ frame }) => {
  const p = ramp(frame, T.tagline + 30, T.tagline + 54, back);
  if (p <= 0) return null;
  return (
    <div style={{ position: "absolute", top: 440, left: 0, right: 0, display: "flex", justifyContent: "center", alignItems: "center", gap: 28, opacity: Math.min(1, p), translate: `0 ${(1 - p) * 60}px`, scale: `${0.9 + 0.1 * p}` }}>
      <Img src={staticFile("quiz/icon.png")} style={{ width: 124, height: 124, borderRadius: 29, boxShadow: "0 12px 30px rgba(42,36,32,0.28)" }} />
      <span style={{ fontFamily: serif, fontSize: 132, letterSpacing: "-0.02em", color: palette.ink }}>Quiz.</span>
    </div>
  );
};

const Grain: React.FC<{ readonly frame: number }> = ({ frame }) => (
  <AbsoluteFill style={{ opacity: 0.05, mixBlendMode: "multiply", pointerEvents: "none" }}>
    <svg width="100%" height="100%">
      <filter id="grain">
        <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed={Math.floor(frame / 2)} />
      </filter>
      <rect width="100%" height="100%" filter="url(#grain)" />
    </svg>
  </AbsoluteFill>
);

export const QuizPromo: React.FC = () => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const [handle] = useState(() => delayRender("Loading fonts"));
  useEffect(() => {
    fontsReady.then(() => continueRender(handle));
  }, [handle]);

  const rig = rigPose(frame);
  const phoneIn = interpolate(frame, [T.reveal + 6, T.reveal + 44], [0, 1], { ...clamp, easing: inOut });
  const onRecording = frame >= T.revealEnd && frame < T.question + 40;
  const clip = useFrameTexture(onRecording ? framePath(frame) : null);
  const still = frame >= T.question + 40 ? "quiz/home.png" : "quiz/bare1.png";
  // Until the phone is fully in, it lives on its own canvas (faded as one flat layer) and the pieces on another.
  const split = phoneIn < 1;
  const fadingPhone = phoneIn > 0 && phoneIn < 1;
  const sizes = bubbles as Record<string, number[]>;

  // The top fade sits under titles only; close-ups without a title get the whole frame.
  const close = Math.max(
    ramp(frame, T.push, T.tap - 6, inOut) * (1 - ramp(frame, T.ffStart, T.ffStart + 30, inOut)),
    ramp(frame, T.tap2 - 40, T.tap2 - 6, inOut) * (1 - ramp(frame, T.press2 + 8, T.press2 + 38, inOut)),
  );
  const title = { color: palette.ink, accentColor: palette.good, family: serif, weight: 400, top: 170, shadow: "0 10px 30px rgba(244,240,231,0.9)" };

  return (
    <AbsoluteFill style={{ backgroundColor: palette.paper }}>
      <Backdrop frame={frame} />
      {fadingPhone ? (
        <AbsoluteFill style={{ opacity: phoneIn }}>
          <ThreeCanvas width={width} height={height} camera={{ fov: 30, position: [0, 0, 6] }} gl={{ antialias: true }}>
            <StudioLights />
            <group position={rig.position} rotation={rig.rotation} scale={rig.scale}>
              <Phone screen="quiz/bare1.png" finish={FINISH}>
                {/* The same resting card and button as the hook layer, so the two layers never disagree. */}
                <Sprite src="quiz/card1.png" x={M.card[0]} y={M.card[1]} width={M.card[2]} height={M.card[3]} z={2} />
                <Sprite src="quiz/vis-svar.png" x={M.button[0]} y={M.button[1]} width={M.button[2]} height={M.button[3]} z={2} />
              </Phone>
            </group>
          </ThreeCanvas>
        </AbsoluteFill>
      ) : null}
      <ThreeCanvas width={width} height={height} camera={{ fov: 30, position: [0, 0, 6] }} gl={{ antialias: true }}>
        <StudioLights />
        <Redraw frames={[clip]} />
        <group position={rig.position} rotation={rig.rotation} scale={rig.scale}>
          <Phone screen={still} texture={onRecording ? clip.texture : null} finish={FINISH} body={!split}>
            {frame < T.revealEnd ? <Hook frame={frame} /> : null}
            <Bubble frame={frame} src="quiz/bubble-1.png" size={sizes.bubble1} at={T.bubble} rest={[660, 1160]} target={RIGHT_X} press={T.press} />
            <Bubble frame={frame} src="quiz/bubble-14.png" size={sizes.bubble14} at={T.bubble2} rest={[560, 1700]} target={WRONG_X} press={T.press2} sagAt={T.tap2 + 40} />
            <Tap frame={frame} at={T.tap - 12} x={603} y={BUTTON_Y} />
            <Tap frame={frame} at={T.tap2 - 10} x={603} y={BUTTON_Y} />
            <Tap frame={frame} at={T.done} x={603} y={BUTTON_Y} />
            {frame >= T.result && frame < T.done ? <RingPulse frame={frame} /> : null}
            <BadgePops frame={frame} />
          </Phone>
        </group>
      </ThreeCanvas>
      <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(244,240,231,0.92) 0%, rgba(244,240,231,0.7) 18%, rgba(244,240,231,0) 30%)", opacity: 1 - close, pointerEvents: "none" }} />
      <SplitFlash frame={frame} />
      <Badge frame={frame} />
      <Title {...title} lines={[{ text: "Dagens quiz." }]} from={14} to={T.reveal - 14} size={150} />
      <Title {...title} lines={[{ text: "Vet du svaret?", accent: "svaret?" }]} from={T.buttonLand - 8} to={T.reveal - 14} top={340} size={112} />
      <Title {...title} lines={[{ text: "Svar høyt.", accent: "høyt." }]} from={T.revealEnd - 30} to={T.push - 4} size={150} />
      <Title {...title} lines={[{ text: "Siste spørsmål.", accent: "Siste" }]} from={T.ffEnd - 6} to={T.tap2 - 44} size={120} />
      <Title {...title} lines={[{ text: "Score for" }, { text: "hver quiz.", accent: "hver quiz." }]} from={T.result + 24} to={T.done - 14} size={130} />
      <Title {...title} lines={[{ text: "Alle resultater," }, { text: "samlet.", accent: "samlet." }]} from={T.done + 34} to={T.question - 14} size={124} />
      <QuestionCard frame={frame} from={T.question} to={T.tagline - 30} lines={["Klar for", "dagens quiz?"]} />
      <Title {...title} lines={[{ text: "Svar høyt." }, { text: "Rett selv.", accent: "selv." }]} from={T.tagline} to={T.end + 30} size={124} />
      <AbsoluteFill style={{ background: "radial-gradient(ellipse 80% 65% at 50% 50%, rgba(42,36,32,0) 60%, rgba(42,36,32,0.12) 100%)", pointerEvents: "none" }} />
      <Grain frame={frame} />
      <Audio src={staticFile("quiz/soundtrack.wav")} />
    </AbsoluteFill>
  );
};
