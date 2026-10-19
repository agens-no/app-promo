// KjopPromo.tsx — app-promo
// A low-key promo: real recordings, focus zooms and the app's own transitions only. No spins, nothing lifts out.
import React, { useEffect, useState } from "react";
import { ThreeCanvas } from "@remotion/three";
import { Audio } from "@remotion/media";
import { loadFont } from "@remotion/fonts";
import { AbsoluteFill, continueRender, delayRender, Easing, Img, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { Phone } from "../three/Phone";
import { Sprite, StudioLights } from "../three/Sprite";
import { Title } from "../unblock/Title";
import { Redraw, useFrameTexture } from "../three/useFrameTexture";
import timeline from "./timeline.json";
import knots from "./knots.json";

// Beat sheet in frames at 60 fps (120 bpm, played half-time). Shared with tools/kjop_audio.mjs.
export const T = timeline;

const palette = {
  paper: "#F4F1E9",
  paperDeep: "#E9E3D5",
  ink: "#1A1F1B",
  primary: "#1D5A42",
  lime: "#C8E163",
};
const family = "Bricolage Grotesque";
const fontsReady = Promise.all([
  loadFont({ family, url: staticFile("fonts/BricolageGrotesque-ExtraBold.ttf"), weight: "800" }),
  loadFont({ family, url: staticFile("fonts/BricolageGrotesque-Bold.ttf"), weight: "700" }),
]);

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const out = Easing.bezier(0.16, 1, 0.3, 1);
const inOut = Easing.bezier(0.65, 0, 0.35, 1);
const back = Easing.bezier(0.34, 1.56, 0.64, 1);
const ramp = (frame: number, from: number, to: number, easing = out) => interpolate(frame, [from, to], [0, 1], { ...clamp, easing });
const FINISH = "silver" as const;

// Take A (tools/kjop_rec.py): field tapped at 73, "6 bananer" typed 164–184, added at 277, on the list by ~300.
// Take B (relaunched with the bananas seeded): Start at 60, ticks at 164/212/261/310/359/407, sweep 491,
// last ticks 594/654, Ferdig drawn ~688–710, Fullfør handel at 839, the empty list by ~880.
type Knot = [number, number];
const takeA = knots.a as Knot[];
const takeB = knots.b as Knot[];
const along = (knots: Knot[], frame: number) => {
  if (frame <= knots[0][0]) return knots[0][1];
  for (let i = 1; i < knots.length; i++) {
    const [f0, s0] = knots[i - 1];
    const [f1, s1] = knots[i];
    if (frame <= f1) return Math.round(s0 + ((s1 - s0) * (frame - f0)) / (f1 - f0));
  }
  return knots[knots.length - 1][1];
};
// The video frame that shows a given recording frame (for tap indicators on the beat of the real tap).
const frameOf = (knots: Knot[], src: number) => {
  for (let i = 1; i < knots.length; i++) {
    const [f0, s0] = knots[i - 1];
    const [f1, s1] = knots[i];
    if (src >= s0 && src <= s1 && s1 > s0) return Math.round(f0 + ((src - s0) * (f1 - f0)) / (s1 - s0));
  }
  return -100;
};
export const framePath = (frame: number) => (frame < T.handoff ? `kjop/frames/a/${along(takeA, frame)}.jpg` : `kjop/frames/b/${along(takeB, frame)}.jpg`);

// Taps in screen pixels (points × 3) at the recording frame they happened: [take, source frame, x, y].
const taps = (knots.taps as [string, number, number, number][]).map(([take, src, x, y]) => ({ take: take === "a" ? takeA : takeB, src, x, y }));
export const tapFrames = taps.map((tap) => frameOf(tap.take, tap.src));

type Pose = { f: number; rotation: [number, number, number]; scale: number; position?: [number, number, number]; focus?: [number, number, number] };
const K = 0.000553;
const place = (pose: Pose): [number, number, number] =>
  pose.focus ? [-(pose.focus[0] - 603) * K * pose.scale, pose.focus[2] + (pose.focus[1] - 1311) * K * pose.scale, 0] : pose.position!;
const overview = (f: number, rotation: [number, number, number], y = -0.3, scale = 1.14): Pose => ({ f, position: [0, y, 0], rotation, scale });

const poses: Pose[] = [
  overview(0, [0.08, -0.14, 0.01], -0.36, 1.08),
  overview(80, [0.05, -0.08, 0], -0.32, 1.12),
  { f: 130, focus: [603, 2330, -0.35], rotation: [0.04, 0.04, 0], scale: 2.0 },
  { f: 262, focus: [640, 2330, -0.35], rotation: [0.04, 0.02, 0], scale: 2.05 },
  { f: 312, focus: [603, 760, -0.25], rotation: [0.04, -0.03, 0], scale: 1.85 },
  { f: T.handoff, focus: [603, 780, -0.25], rotation: [0.04, -0.05, 0], scale: 1.85 },
  overview(T.start - 6, [0.05, -0.06, 0], -0.32, 1.12),
  { f: T.ticks, focus: [603, 1150, -0.42], rotation: [0.05, 0.05, 0], scale: 1.5 },
  { f: T.ticksEnd, focus: [603, 1700, -0.42], rotation: [0.05, 0.08, 0], scale: 1.5 },
  { f: T.sweep + 30, focus: [603, 1250, -0.32], rotation: [0.05, -0.04, 0], scale: 1.3 },
  { f: T.tick8 + 10, focus: [603, 1250, -0.32], rotation: [0.05, -0.06, 0], scale: 1.3 },
  { f: T.done + 20, focus: [603, 920, -0.15], rotation: [0.04, 0.03, 0], scale: 1.8 },
  { f: T.done + 100, focus: [603, 960, -0.15], rotation: [0.03, 0.06, 0], scale: 1.8 },
  overview(T.finish + 10, [0.05, 0.04, 0], -0.32, 1.12),
  { f: T.tagline, position: [0, -0.62, 0], rotation: [0.03, 0, 0], scale: 1.2 },
  { f: T.end, position: [0, -0.6, 0], rotation: [0.02, 0.03, 0], scale: 1.21 },
];

const rigPose = (frame: number) => {
  const i = Math.max(0, poses.findIndex((_, index) => frame < (poses[index + 1]?.f ?? Infinity)));
  const a = poses[i];
  const b = poses[Math.min(poses.length - 1, i + 1)];
  const t = a === b ? 1 : interpolate(frame, [a.f, b.f], [0, 1], { ...clamp, easing: inOut });
  const mix = (x: number, y: number) => x + (y - x) * t;
  const [pa, pb] = [place(a), place(b)];
  return {
    position: [mix(pa[0], pb[0]), mix(pa[1], pb[1]) + Math.sin(frame / 50) * 0.006, 0] as [number, number, number],
    rotation: [mix(a.rotation[0], b.rotation[0]), mix(a.rotation[1], b.rotation[1]), mix(a.rotation[2], b.rotation[2])] as [number, number, number],
    scale: mix(a.scale, b.scale),
  };
};

const Tap: React.FC<{ readonly frame: number; readonly at: number; readonly x: number; readonly y: number }> = ({ frame, at, x, y }) => {
  if (frame < at - 6 || frame > at + 24) return null;
  const press = interpolate(frame, [at - 6, at, at + 8], [1.4, 0.8, 0.8], { ...clamp, easing: out });
  const fade = interpolate(frame, [at - 6, at - 2, at + 8, at + 24], [0, 0.9, 0.9, 0], clamp);
  const ripple = ramp(frame, at + 2, at + 24);
  const size = 120;
  return <Sprite src="kjop/tap.png" x={x - size / 2} y={y - size / 2} width={size} height={size} z={300} scale={press + ripple * 0.7} opacity={fade} renderOrder={9} />;
};

// Last line of the closing slogan: "Skriv. Handle. Ferdig. [icon] Kjøp."
const Badge: React.FC<{ readonly frame: number }> = ({ frame }) => {
  const p = ramp(frame, T.tagline + 30, T.tagline + 54, back);
  if (p <= 0) return null;
  return (
    <div style={{ position: "absolute", top: 450, left: 0, right: 0, display: "flex", justifyContent: "center", alignItems: "center", gap: 26, opacity: Math.min(1, p), translate: `0 ${(1 - p) * 50}px`, scale: `${0.92 + 0.08 * p}` }}>
      <Img src={staticFile("kjop/icon.png")} style={{ width: 118, height: 118, borderRadius: 27, boxShadow: "0 12px 30px rgba(26,31,27,0.22)" }} />
      <span style={{ fontFamily: family, fontWeight: 800, fontSize: 128, letterSpacing: "-0.035em", color: palette.ink }}>Kjøp.</span>
    </div>
  );
};

const Grain: React.FC<{ readonly frame: number }> = ({ frame }) => (
  <AbsoluteFill style={{ opacity: 0.04, mixBlendMode: "multiply", pointerEvents: "none" }}>
    <svg width="100%" height="100%">
      <filter id="grain">
        <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed={Math.floor(frame / 2)} />
      </filter>
      <rect width="100%" height="100%" filter="url(#grain)" />
    </svg>
  </AbsoluteFill>
);

export const KjopPromo: React.FC = () => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const [handle] = useState(() => delayRender("Loading fonts"));
  useEffect(() => {
    fontsReady.then(() => continueRender(handle));
  }, [handle]);

  const rig = rigPose(frame);
  const clip = useFrameTexture(framePath(frame));
  // The phone fades in as one flat layer (no translucent body).
  const phoneIn = interpolate(frame, [4, 40], [0, 1], { ...clamp, easing: inOut });
  // No titles over the close-ups of the field and the finished screen, so the top fade goes there.
  const close = Math.max(ramp(frame, 100, 130, inOut) * (1 - ramp(frame, 290, 312, inOut)), ramp(frame, T.done, T.done + 20, inOut) * (1 - ramp(frame, T.finish, T.finish + 30, inOut)));
  const title = { color: palette.ink, accentColor: palette.primary, family, top: 170, shadow: "0 10px 30px rgba(244,241,233,0.9)" };

  return (
    <AbsoluteFill style={{ backgroundColor: palette.paper }}>
      <AbsoluteFill style={{ background: `linear-gradient(170deg, #FAF8F2 0%, ${palette.paper} 50%, ${palette.paperDeep} 100%)` }} />
      <AbsoluteFill style={{ background: `radial-gradient(circle at ${72 + Math.sin(frame / 140) * 4}% ${64 + Math.cos(frame / 120) * 3}%, rgba(200,225,99,0.22) 0%, rgba(200,225,99,0) 38%)` }} />
      <AbsoluteFill style={{ opacity: phoneIn }}>
        <ThreeCanvas width={width} height={height} camera={{ fov: 30, position: [0, 0, 6] }} gl={{ antialias: true }}>
          <StudioLights />
          <Redraw frames={[clip]} />
          <group position={rig.position} rotation={rig.rotation} scale={rig.scale}>
            <Phone screen="kjop/start.png" texture={clip.texture} finish={FINISH}>
              {taps.map((tap, i) => (
                <Tap key={i} frame={frame} at={tapFrames[i]} x={tap.x} y={tap.y} />
              ))}
            </Phone>
          </group>
        </ThreeCanvas>
      </AbsoluteFill>
      <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(244,241,233,0.92) 0%, rgba(244,241,233,0.7) 18%, rgba(244,241,233,0) 30%)", opacity: 1 - close, pointerEvents: "none" }} />
      <Badge frame={frame} />
      <Title {...title} lines={[{ text: "Handlelisten" }, { text: "for hele huset.", accent: "huset." }]} from={10} to={118} size={128} />
      <Title {...title} lines={[{ text: "Sortert" }, { text: "automatisk.", accent: "automatisk." }]} from={316} to={T.handoff + 10} size={128} />
      <Title {...title} lines={[{ text: "Kryss av" }, { text: "i butikken.", accent: "butikken." }]} from={T.start + 30} to={T.tick8 - 20} size={128} />
      <Title {...title} lines={[{ text: "Skriv. Handle." }, { text: "Ferdig.", accent: "Ferdig." }]} from={T.tagline} to={T.end + 30} size={124} />
      <AbsoluteFill style={{ background: "radial-gradient(ellipse 80% 65% at 50% 50%, rgba(26,31,27,0) 62%, rgba(26,31,27,0.1) 100%)", pointerEvents: "none" }} />
      <Grain frame={frame} />
      {KJOP_AUDIO ? <Audio src={staticFile("kjop/soundtrack.wav")} /> : null}
    </AbsoluteFill>
  );
};

const KJOP_AUDIO = true;
