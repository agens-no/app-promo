// TalljaktPromo.tsx — app-promo
import React, { useEffect, useState } from "react";
import { ThreeCanvas } from "@remotion/three";
import { Audio } from "@remotion/media";
import { loadFont } from "@remotion/fonts";
import { AbsoluteFill, continueRender, delayRender, Easing, Img, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { Phone } from "../three/Phone";
import { Lifted } from "../three/Lifted";
import { Slab, Sprite, StudioLights } from "../three/Sprite";
import { Title } from "../unblock/Title";
import meta from "../../public/talljakt/talljakt.json";
import timeline from "./timeline.json";

// Beat sheet in frames at 60 fps (120 bpm). Shared with tools/talljakt_audio.mjs.
export const T = timeline;

const palette = {
  paper: "#EAF5F9",
  ice: "#BDE7F0",
  iceDeep: "#93DDED",
  amber: "#F2B45A",
  accent: "#E0962A",
  teal: "#23677B",
  ink: "#173643",
  muted: "#52707B",
};
const family = "Rubik";
const fontReady = loadFont({ family, url: staticFile("fonts/Rubik.ttf"), weight: "300 900" });

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const out = Easing.bezier(0.16, 1, 0.3, 1);
const inOut = Easing.bezier(0.65, 0, 0.35, 1);
const back = Easing.bezier(0.34, 1.56, 0.64, 1);
const ramp = (frame: number, from: number, to: number, easing = out) => interpolate(frame, [from, to], [0, 1], { ...clamp, easing });

type Meta = {
  tiles: number[][];
  tileSize: number[];
  eq: Record<"left" | "op" | "right" | "result", number[]>;
  target: number[];
  sheet: number[];
  score: number[];
  card: number[];
  daily: number[];
  clock: number[];
  tempoCard: number[];
  clockCard: number[];
};
const M = meta as unknown as Meta;
const [TW, TH] = M.tileSize;
const SCREEN = [0, 0, 1206, 2622];

// The demo puzzle: 75 25 8 / 6 3 2 → 642, solved the app's way in four moves.
const startTiles = ["75", "25", "8", "6", "3", "2"];
const moves = [
  { a: 0, b: 3, op: "plus", left: "75", right: "6", result: "81" },
  { a: 3, b: 2, op: "times", left: "81", right: "8", result: "648" },
  { a: 4, b: 5, op: "times", left: "3", right: "2", result: "6b" },
  { a: 2, b: 5, op: "minus", left: "648", right: "6", result: "642" },
].map((move, i) => ({ ...move, at: T.moves[i] }));
const SELECT_B = 16;
const FLY = 22;
const MERGE = 34;
// The phone shows the real app state after each tap: first number, operator, result.
const gameScreenAt = (frame: number) => {
  let screen = "talljakt/play-base.png";
  moves.forEach((move, i) => {
    if (frame >= move.at) screen = `talljakt/steps/m${i + 1}a-base.png`;
    if (frame >= move.at + 8) screen = `talljakt/steps/m${i + 1}o-base.png`;
    if (frame >= move.at + MERGE) screen = `talljakt/steps/m${i + 1}r-base.png`;
  });
  return screen;
};

const dropAt = (slot: number) => T.dropStart + slot * T.dropStagger;

const shakeAt = (frame: number, hits: { at: number; amp: number }[]) =>
  hits.reduce((sum, hit) => {
    const t = frame - hit.at;
    return t < 0 || t > 30 ? sum : sum + hit.amp * Math.exp(-t / 5) * Math.sin(t * 2.1);
  }, 0);
const impacts = [
  ...startTiles.map((_, i) => ({ at: dropAt(i) + 15, amp: 0.007 })),
  { at: T.targetLand, amp: 0.024 },
  ...moves.map((move) => ({ at: move.at + MERGE, amp: 0.004 })),
  { at: T.heroSlam, amp: 0.03 },
];

// A pose either places the rig directly or centres a screen point (px, py) at height y in the frame.
type Pose = { f: number; rotation: [number, number, number]; scale: number; position?: [number, number, number]; focus?: [number, number, number] };
const K = 0.000553;
const place = (pose: Pose): [number, number, number] =>
  pose.focus ? [-(pose.focus[0] - 603) * K * pose.scale, pose.focus[2] + (pose.focus[1] - 1311) * K * pose.scale, 0] : pose.position!;

const tilesFocus: [number, number, number] = [603, 1340, -0.3];
const eqFocus: [number, number, number] = [603, 930, -0.3];
const overview = (f: number, rotation: [number, number, number], y = -0.3, scale = 1.14): Pose => ({ f, position: [0, y, 0], rotation, scale });

const poses: Pose[] = [
  { f: 0, position: [0, -0.52, 0], rotation: [0.34, -0.08, 0.02], scale: 2.2 },
  { f: T.reveal, position: [0, -0.5, 0], rotation: [0.2, -0.03, 0], scale: 2.1 },
  { f: T.revealEnd, focus: tilesFocus, rotation: [0.12, -0.28, 0.03], scale: 1.46 },
  { f: T.moves[2] + 20, focus: tilesFocus, rotation: [0.1, -0.12, 0.02], scale: 1.46 },
  { f: T.moves[3], focus: eqFocus, rotation: [0.06, -0.04, 0], scale: 2.3 },
  { f: T.moves[3] + 40, focus: eqFocus, rotation: [0.05, -0.02, 0], scale: 2.3 },
  { f: T.heroSlam, focus: [470, 700, -0.25], rotation: [0.06, 0.06, 0], scale: 2.0 },
  { f: T.heroSlam + 30, focus: [470, 700, -0.25], rotation: [0.05, 0.08, 0], scale: 2.0 },
  overview(T.sheetUp + 10, [0.08, 0.16, 0]),
  overview(T.spinA, [0.06, 0.02, 0]),
  overview(T.spinA + 30, [0.1, -0.24, 0.02], -0.3, 1.12),
  overview(T.cardLift, [0.08, -0.16, 0.02], -0.3, 1.12),
  overview(T.fan + 30, [0.06, -0.04, 0], -0.36, 0.92),
  overview(T.spinB - 30, [0.05, 0.04, 0], -0.36, 0.92),
  overview(T.spinB, [0.08, 0.16, 0], -0.3, 1.12),
  overview(T.spinB + 30, [0.06, 0.1, 0], -0.28, 1.12),
  { f: T.spinB + 60, focus: [603, 1670, -0.6], rotation: [0.05, 0.04, 0], scale: 1.4 },
  { f: T.startTap - 30, focus: [603, 1670, -0.6], rotation: [0.04, -0.03, 0], scale: 1.4 },
  { f: T.startTap - 6, focus: [603, 1950, -0.78], rotation: [0.04, -0.02, 0], scale: 1.4 },
  overview(T.spinC, [0.08, 0.16, 0], -0.3, 1.12),
  overview(T.spinC + 30, [0.12, 0.26, -0.02], -0.26, 1.12),
  { f: T.spinC + 64, focus: [603, 900, -0.3], rotation: [0.05, 0.06, 0], scale: 1.8 },
  { f: T.question + 10, focus: [603, 900, -0.3], rotation: [0.04, 0.02, 0], scale: 1.8 },
  { f: T.tagline - 40, position: [0, -0.34, 0], rotation: [0.04, -0.03, 0], scale: 1.16 },
  { f: T.tagline, position: [0, -0.6, 0], rotation: [0.03, 0, 0], scale: 1.2 },
  { f: T.end, position: [0, -0.59, 0], rotation: [0.02, 0.04, 0], scale: 1.21 },
];
const spin = (frame: number, at: number) => interpolate(frame, [at, at + 30], [0, Math.PI * 2], { ...clamp, easing: inOut });

const rigPose = (frame: number) => {
  const i = Math.max(0, poses.findIndex((_, index) => frame < (poses[index + 1]?.f ?? Infinity)));
  const a = poses[i];
  const b = poses[Math.min(poses.length - 1, i + 1)];
  const t = a === b ? 1 : interpolate(frame, [a.f, b.f], [0, 1], { ...clamp, easing: inOut });
  const mix = (x: number, y: number) => x + (y - x) * t;
  const s = shakeAt(frame, impacts);
  const settle = 1 - ramp(frame, T.tagline - 60, T.tagline + 30, inOut) * 0.7;
  const [pa, pb] = [place(a), place(b)];
  return {
    position: [mix(pa[0], pb[0]) + s, mix(pa[1], pb[1]) + s * 0.6 + Math.sin(frame / 40) * 0.01 * settle, 0] as [number, number, number],
    rotation: [mix(a.rotation[0], b.rotation[0]), mix(a.rotation[1], b.rotation[1]) + spin(frame, T.spinA) + spin(frame, T.spinB) + spin(frame, T.spinC), mix(a.rotation[2], b.rotation[2])] as [number, number, number],
    scale: mix(a.scale, b.scale),
  };
};

type TileView = { name: string; x: number; y: number; lift: number; scale: number; rotation: [number, number, number] } | null;

const tileView = (slot: number, frame: number): TileView => {
  let name = startTiles[slot];
  let [x, y] = M.tiles[slot];
  let lift = 0;
  let scale = 1;
  let rotation: [number, number, number] = [0, 0, 0];
  for (const move of moves) {
    const merged = frame >= move.at + MERGE;
    if (slot === move.a) {
      if (merged) return null;
      if (frame >= move.at) {
        name = `${name}-sel`;
        lift = 40;
        const fly = ramp(frame, move.at + FLY, move.at + MERGE, inOut);
        const [bx, by] = M.tiles[move.b];
        x += (bx - x) * fly;
        y += (by - y) * fly;
        lift += Math.sin(Math.PI * fly) * 220;
        scale = 1 - fly * 0.12;
        rotation = [0, 0, Math.sin(Math.PI * fly) * 0.12];
      }
    }
    if (slot === move.b) {
      if (merged) {
        name = move.result;
        const pop = interpolate(frame, [move.at + MERGE, move.at + MERGE + 5, move.at + MERGE + 16], [0, 1, 0], { ...clamp, easing: [Easing.out(Easing.quad), out] });
        scale = 1 + pop * 0.14;
        lift = pop * 60;
      } else if (frame >= move.at + SELECT_B) {
        name = `${name}-sel`;
        lift = 30;
      }
    }
  }
  const drop = interpolate(frame, [dropAt(slot), dropAt(slot) + 15, dropAt(slot) + 19, dropAt(slot) + 23], [1, 0, 0.02, 0], {
    ...clamp,
    easing: [Easing.bezier(0.5, 0, 0.9, 0.5), Easing.out(Easing.quad), Easing.in(Easing.quad)],
  });
  if (frame < dropAt(slot)) return null;
  lift += drop * 1500;
  rotation = [rotation[0] + drop * (slot % 2 ? 0.5 : -0.4), rotation[1] + drop * (slot % 3 ? -0.3 : 0.35), rotation[2] + drop * (slot % 2 ? -0.5 : 0.4)];
  // The finished 642 leaves the board and hits the target.
  if (slot === 5 && frame >= T.heroLift) {
    const fly = ramp(frame, T.heroLift, T.heroSlam, Easing.bezier(0.45, 0, 0.25, 1));
    const [tx, ty, tw, th] = M.target;
    const toX = tx + tw / 2 - TW / 2;
    const toY = ty + th / 2 - TH / 2;
    x += (toX - x) * fly;
    y += (toY - y) * fly;
    lift = Math.sin(Math.PI * fly) * 900 + 30;
    scale = 1 + Math.sin(Math.PI * fly) * 0.5 - fly * 0.25;
    rotation = [-Math.sin(Math.PI * fly) * 0.4, Math.sin(Math.PI * fly) * 0.5, -fly * 0.08];
    if (frame >= T.heroSlam + 4) return null;
  }
  return { name, x, y, lift, scale, rotation };
};

const Tiles: React.FC<{ readonly frame: number }> = ({ frame }) => (
  <>
    {startTiles.map((_, slot) => {
      const view = tileView(slot, frame);
      if (!view) return null;
      const hit = view.name === "642";
      return (
        <Slab
          key={slot}
          src={`talljakt/tile-${view.name}.png`}
          color={hit ? "#B07F36" : view.name.endsWith("-sel") ? "#123C48" : "#8EBBC7"}
          depth={60}
          radius={70}
          x={view.x}
          y={view.y}
          width={TW}
          height={TH}
          z={2 + view.lift}
          scale={view.scale}
          rotation={view.rotation}
          opacity={interpolate(frame, [dropAt(slot), dropAt(slot) + 3], [0, 1], clamp)}
        />
      );
    })}
  </>
);


const Hook: React.FC<{ readonly frame: number }> = ({ frame }) => {
  const [x, y, w, h] = M.target;
  const fall = interpolate(frame, [T.targetLand - 16, T.targetLand, T.targetLand + 5, T.targetLand + 10], [1, 0, 0.03, 0], {
    ...clamp,
    easing: [Easing.bezier(0.5, 0, 0.9, 0.5), Easing.out(Easing.quad), Easing.in(Easing.quad)],
  });
  // Settle exactly onto the on-screen target before the display fades in, then hand over without a crossfade.
  const visible = frame < T.reveal + 40 ? 1 : 0;
  if (frame < T.targetLand - 16 || visible <= 0) return null;
  const centred = 1 - ramp(frame, T.reveal - 34, T.reveal + 2, inOut);
  return (
    <Sprite src="talljakt/target.png" x={x + centred * (603 - (x + w / 2))} y={y} width={w} height={h} z={2 + fall * 1800} scale={1 + fall * 0.6} rotation={[fall * -0.5, 0, fall * 0.2]} opacity={visible} />
  );
};

const Slam: React.FC<{ readonly frame: number }> = ({ frame }) => {
  const [x, y, w, h] = M.target;
  const pulse = interpolate(frame, [T.heroSlam, T.heroSlam + 6, T.heroSlam + 26], [0, 1, 0], { ...clamp, easing: [Easing.out(Easing.quad), out] });
  const ring = ramp(frame, T.heroSlam, T.heroSlam + 34);
  if (frame < T.heroSlam || frame > T.heroSlam + 40) return null;
  const size = 700;
  return (
    <>
      <Sprite src="talljakt/target.png" x={x} y={y} width={w} height={h} z={4 + pulse * 120} scale={1 + pulse * 0.16} renderOrder={5} />
      <Sprite src="talljakt/ring.png" x={x + w / 2 - size / 2} y={y + h / 2 - size / 2} width={size} height={size} z={6} scale={0.4 + ring * 1.8} opacity={(1 - ring) * 0.9} renderOrder={6} />
    </>
  );
};

const GameScreen: React.FC<{ readonly frame: number }> = ({ frame }) => {
  const sheet = ramp(frame, T.sheetUp, T.sheetUp + 30, Easing.bezier(0.2, 0.9, 0.3, 1));
  const [sx, sy, sw, sh] = M.sheet;
  return (
    <>
      <Tiles frame={frame} />
      <Hook frame={frame} />
      <Slam frame={frame} />
      {sheet > 0 ? (
        <>
          <Sprite src="talljakt/screen-dim.png" x={0} y={0} width={SCREEN[2]} height={SCREEN[3]} z={40} opacity={sheet * 0.28} renderOrder={7} />
          <Sprite src="talljakt/result-sheet.png" x={sx} y={sy + (1 - sheet) * 2500} width={sw} height={sh} z={42} renderOrder={8} />
        </>
      ) : null}
    </>
  );
};

const ResultScreen: React.FC<{ readonly frame: number }> = ({ frame }) => {
  const pop = ramp(frame, T.scorePop, T.scorePop + 28, back);
  const away = ramp(frame, T.spinA - 26, T.spinA + 4, Easing.in(Easing.cubic));
  const share = ramp(frame, T.shareCard, T.shareCard + 30, back) * (1 - ramp(frame, T.spinA - 24, T.spinA, inOut));
  return (
    <>
    <Sprite src="talljakt/share-card.png" x={-160 - share * 700} y={620 - share * 120} width={904} height={1308} z={-320} rotation={[0, 0.25 * share, -0.16 * share]} opacity={share} />
    <Lifted
      rect={M.score}
      src="talljakt/score.png"
      color="#B07F36"
      depth={70}
      radius={174}
      lift={pop * 620 + away * 900}
      dx={-pop * 330 - away * 600}
      dy={pop * 380 - away * 1800}
      scale={1 + pop * 0.9}
      rotation={[pop * -0.1, pop * 0.25, pop * -0.12]}
    />
    </>
  );
};

const fanned: [number, number, number][] = [
  // dx, dy, roll for solution cards 2–4 behind the phone
  [-760, 140, -0.2],
  [760, 120, 0.2],
  [-560, -560, -0.1],
];

const SolutionsScreen: React.FC<{ readonly frame: number }> = ({ frame }) => {
  const lift = ramp(frame, T.cardLift, T.cardLift + 30, back) * (1 - ramp(frame, T.spinB - 30, T.spinB, inOut));
  const [x, y, w, h] = M.card;
  return (
    <>
      {fanned.map(([dx, dy, roll], i) => {
        const p = ramp(frame, T.fan + i * 8, T.fan + i * 8 + 30, back) * (1 - ramp(frame, T.spinB - 30, T.spinB, inOut));
        return (
          <Sprite key={i} src={`talljakt/solution-card-${i + 2}.png`} x={x + dx * p} y={y + dy * p} width={w} height={h} z={-300 - i * 20} rotation={[0, -dx * 0.0003 * p, roll * p]} opacity={Math.min(1, p * 3)} renderOrder={i === 2 ? 1 : 2} />
        );
      })}
      <Lifted rect={M.card} src="talljakt/solution-card.png" color="#D9E6EC" depth={60} radius={84} lift={lift * 300} dy={-lift * 60} scale={1 + lift * 0.1} rotation={[-lift * 0.06, lift * 0.08, 0]} />
    </>
  );
};


// Free play: "I eget tempo" is the default; a tap selects "Mot klokka", another starts the round.
const ModeScreen: React.FC<{ readonly frame: number }> = ({ frame }) => {
  const tempo = ramp(frame, T.spinB + 50, T.spinB + 74, back) * (1 - ramp(frame, T.modeTap - 14, T.modeTap, inOut));
  const clock = ramp(frame, T.modeTap + 4, T.modeTap + 28, back) * (1 - ramp(frame, T.startTap - 30, T.startTap - 12, inOut));
  const pulse = (lift: number) => ({ lift: lift * 160, dy: -lift * 12, scale: 1 + lift * 0.12, rotation: [-lift * 0.08, 0, 0] as [number, number, number] });
  return (
    <>
      {tempo > 0.001 && frame < T.modeTap ? <Lifted rect={M.tempoCard} src="talljakt/card-tempo.png" color="#123C48" depth={40} radius={66} {...pulse(tempo)} /> : null}
      {clock > 0.001 ? <Lifted rect={M.clockCard} src="talljakt/card-clock.png" color="#123C48" depth={40} radius={66} {...pulse(clock)} /> : null}
      <Tap frame={frame} at={T.modeTap} x={882} y={1670} />
      <Tap frame={frame} at={T.startTap} x={603} y={2364} />
    </>
  );
};

const Tap: React.FC<{ readonly frame: number; readonly at: number; readonly x: number; readonly y: number }> = ({ frame, at, x, y }) => {
  if (frame < at - 6 || frame > at + 22) return null;
  const press = interpolate(frame, [at - 6, at, at + 8], [1.4, 0.8, 0.8], { ...clamp, easing: out });
  const fade = interpolate(frame, [at - 6, at - 2, at + 8, at + 22], [0, 1, 1, 0], clamp);
  const ripple = ramp(frame, at + 2, at + 22);
  const size = 200;
  return <Sprite src="talljakt/tap.png" x={x - size / 2} y={y - size / 2} width={size} height={size} z={300} scale={press + ripple * 0.6} opacity={fade} renderOrder={9} />;
};

// Full-screen text card: a circle wipe in the accent colour from the countdown chip, then it slides up off the end screen.
const QuestionCard: React.FC<{ readonly frame: number; readonly from: number; readonly to: number; readonly lines: [string, string] }> = ({ frame, from, to, lines }) => {
  if (frame < from || frame > to + 30) return null;
  const wipe = ramp(frame, from, from + 26, Easing.bezier(0.7, 0, 0.3, 1));
  const away = ramp(frame, to, to + 28, Easing.bezier(0.7, 0, 0.3, 1));
  const word = (i: number) => ramp(frame, from + 14 + i * 8, from + 38 + i * 8, back);
  return (
    <AbsoluteFill style={{ clipPath: `circle(${wipe * 150}% at 50% 86%)`, translate: `0 ${-away * 1920}px`, background: `linear-gradient(170deg, ${palette.teal} 0%, #174F5F 100%)`, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ textAlign: "center", fontFamily: family, fontWeight: 800, fontSize: 132, lineHeight: 1.04, letterSpacing: "-0.03em", whiteSpace: "nowrap" }}>
        {lines.map((line, i) => (
          <div key={line} style={{ color: i ? palette.amber : "white", opacity: word(i), translate: `0 ${(1 - word(i)) * 80}px`, scale: `${0.9 + 0.1 * word(i)}` }}>
            {line}
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
};

const Chip: React.FC<{ readonly frame: number; readonly from: number; readonly to: number; readonly children: React.ReactNode }> = ({ frame, from, to, children }) => {
  const shown = interpolate(frame, [from, from + 18, to - 12, to], [0, 1, 1, 0], { ...clamp, easing: out });
  if (shown <= 0) return null;
  return (
    <div style={{ position: "absolute", bottom: 170, left: 0, right: 0, display: "flex", justifyContent: "center", opacity: shown, translate: `0 ${(1 - shown) * 60}px` }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 26,
          padding: "26px 50px",
          borderRadius: 999,
          background: "rgba(240,248,251,0.95)",
          boxShadow: "0 30px 80px rgba(0,0,0,0.45), inset 0 -6px 0 rgba(23,54,67,0.12)",
          fontFamily: family,
          color: palette.ink,
        }}
      >
        {children}
      </div>
    </div>
  );
};

const Countdown: React.FC<{ readonly frame: number }> = ({ frame }) => {
  const start = T.spinC + 30;
  const elapsed = Math.max(0, frame - start) / 60;
  const left = Math.max(50, 60 - Math.floor(elapsed));
  const sweep = Math.min(1, elapsed / 60);
  const tick = interpolate((frame - start) % 60, [0, 8], [1.12, 1], { ...clamp, easing: out });
  return (
    <Chip frame={frame} from={start} to={T.question + 30}>
      <svg width="76" height="76" viewBox="0 0 76 76">
        <circle cx="38" cy="38" r="31" fill="none" stroke="#D3E4EA" strokeWidth="10" />
        <circle cx="38" cy="38" r="31" fill="none" stroke={palette.amber} strokeWidth="10" strokeLinecap="round" strokeDasharray={`${(1 - sweep) * 194.8} 194.8`} transform="rotate(-90 38 38)" />
      </svg>
      <span style={{ fontWeight: 800, fontSize: 92, fontVariantNumeric: "tabular-nums", scale: `${tick}`, display: "inline-block" }}>
        {Math.floor(left / 60)}:{String(left % 60).padStart(2, "0")}
      </span>
      <span style={{ fontWeight: 600, fontSize: 40, color: "#52707B" }}>igjen</span>
    </Chip>
  );
};

const Aha: React.FC<{ readonly frame: number }> = ({ frame }) => (
  <Chip frame={frame} from={T.cardLift + 20} to={T.spinB - 10}>
    <span style={{ fontWeight: 800, fontSize: 52, color: "#8D5400" }}>Aha!</span>
    <span style={{ fontWeight: 500, fontSize: 38, color: "#3D5969" }}>Lær strategien bak hver løsning.</span>
  </Chip>
);

// Real app pieces drifting behind everything; smaller ones are further away, so softer.
const decor: [string, number, number, number, number][] = [
  // sprite, x, y, width, rotation (deg)
  ["tile-25", -60, 300, 300, -14],
  ["pill-plus", 880, 520, 150, 12],
  ["tile-8", 900, 1180, 230, 10],
  ["pill-times", 40, 1060, 130, -8],
  ["tile-75", 860, 1560, 280, -12],
  ["pill-minus", 120, 1580, 140, 16],
  ["tile-3", -40, 1760, 210, 8],
  ["pill-642", 700, 160, 220, -6],
];
// Light ice background in the app's palette: graph paper, a soft amber glow and drifting operators.
const Backdrop: React.FC<{ readonly frame: number }> = ({ frame }) => (
  <>
    <AbsoluteFill style={{ background: `linear-gradient(165deg, #F3FAFC 0%, ${palette.paper} 45%, #D2EAF1 100%)` }} />
    <AbsoluteFill
      style={{
        backgroundImage: "linear-gradient(rgba(23,54,67,0.07) 2px, transparent 2px), linear-gradient(90deg, rgba(23,54,67,0.07) 2px, transparent 2px)",
        backgroundSize: "72px 72px",
        backgroundPosition: `${frame * 0.25}px ${frame * 0.4}px`,
      }}
    />
    <AbsoluteFill style={{ background: `radial-gradient(circle at ${78 + Math.sin(frame / 120) * 4}% ${70 + Math.cos(frame / 100) * 3}%, rgba(242,180,90,0.28) 0%, rgba(242,180,90,0) 34%)` }} />
    <AbsoluteFill style={{ background: `radial-gradient(circle at 12% 40%, rgba(147,221,237,0.45) 0%, rgba(147,221,237,0) 30%)` }} />
    {decor.map(([src, x, y, w, r], i) => {
      const depth = w / 300;
      const drift = Math.sin(frame / (70 + i * 9) + i) * 18;
      return (
        <Img
          key={src}
          src={staticFile(`talljakt/${src}.png`)}
          style={{
            position: "absolute",
            left: x,
            top: y - frame * 0.12 * depth + drift,
            width: w,
            rotate: `${r + Math.sin(frame / 90 + i) * 4}deg`,
            opacity: 0.35 + depth * 0.35,
            filter: `blur(${(1 - depth) * 6 + 1}px)`,
          }}
        />
      );
    })}
  </>
);

// Third line of the closing slogan: "Seks tall. Ett mål. [icon] Talljakt."
const Badge: React.FC<{ readonly frame: number }> = ({ frame }) => {
  const p = ramp(frame, T.tagline + 26, T.tagline + 50, back);
  if (p <= 0) return null;
  return (
    <div style={{ position: "absolute", top: 452, left: 0, right: 0, display: "flex", justifyContent: "center", alignItems: "center", gap: 26, opacity: Math.min(1, p), translate: `0 ${(1 - p) * 60}px`, scale: `${0.9 + 0.1 * p}` }}>
      <Img src={staticFile("talljakt/icon.png")} style={{ width: 118, height: 118, borderRadius: 28, boxShadow: "0 12px 30px rgba(23,54,67,0.28)" }} />
      <span style={{ fontFamily: family, fontWeight: 800, fontSize: 130, letterSpacing: "-0.035em", color: palette.ink }}>Talljakt.</span>
    </div>
  );
};

const captions: [number, number, string][] = [
  [T.scorePop, T.spinA - 4, "Færrest mulig trekk gir full pott."],
];

const Caption: React.FC<{ readonly frame: number }> = ({ frame }) => (
  <>
    {captions.map(([from, to, text]) => {
      const shown = interpolate(frame, [from, from + 16, to - 10, to], [0, 1, 1, 0], { ...clamp, easing: out });
      if (shown <= 0) return null;
      return (
        <div key={text} style={{ position: "absolute", left: 0, right: 0, bottom: 80, display: "flex", justifyContent: "center", opacity: shown, translate: `0 ${(1 - shown) * 30}px` }}>
          <div style={{ padding: "22px 44px", borderRadius: 999, background: "rgba(240,248,251,0.96)", boxShadow: "0 24px 60px rgba(23,54,67,0.28)", fontFamily: family, fontWeight: 700, fontSize: 50, color: palette.ink }}>
            {text}
          </div>
        </div>
      );
    })}
  </>
);

const Flash: React.FC<{ readonly frame: number }> = ({ frame }) => {
  const flash = interpolate(frame, [T.heroSlam, T.heroSlam + 3, T.heroSlam + 18], [0, 0.55, 0], clamp);
  return <AbsoluteFill style={{ background: `radial-gradient(circle at 35% 40%, ${palette.amber} 0%, rgba(242,180,90,0) 65%)`, opacity: flash, mixBlendMode: "screen" }} />;
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

export const TalljaktPromo: React.FC = () => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const [handle] = useState(() => delayRender("Loading Rubik"));
  useEffect(() => {
    fontReady.then(() => continueRender(handle));
  }, [handle]);

  const rig = rigPose(frame);
  const phoneIn = interpolate(frame, [T.reveal + 6, T.reveal + 40], [0, 1], { ...clamp, easing: inOut });
  const title = { color: palette.ink, accentColor: palette.accent, family, top: 170, shadow: "0 10px 30px rgba(234,245,249,0.9)" };
  const swap = (at: number) => frame >= at + 15;

  let screen: React.ReactNode;
  if (frame >= T.question + 40) {
    screen = <Phone screen="talljakt/home-sprint.png" finish="deep-blue" />;
  } else if (swap(T.spinC)) {
    const left = Math.max(50, 60 - Math.floor(Math.max(0, frame - T.spinC - 30) / 60));
    const [cx, cy, cw, ch] = M.clock;
    screen = (
      <Phone screen="talljakt/sprint.png" finish="deep-blue">
        <Sprite src={`talljakt/clock-${left}.png`} x={cx} y={cy} width={cw} height={ch} z={0.5} renderOrder={3} />
      </Phone>
    );
  } else if (swap(T.spinB)) {
    screen = (
      <Phone screen={frame >= T.modeTap ? "talljakt/home-sprint.png" : "talljakt/home-fresh.png"} finish="deep-blue">
        <ModeScreen frame={frame} />
      </Phone>
    );
  } else if (swap(T.spinA)) {
    screen = (
      <Phone screen="talljakt/solutions-base.png" finish="deep-blue">
        <SolutionsScreen frame={frame} />
      </Phone>
    );
  } else if (frame >= T.sheetUp + 32) {
    screen = (
      <Phone screen="talljakt/result-base.png" finish="deep-blue">
        <ResultScreen frame={frame} />
      </Phone>
    );
  } else {
    // Until the phone is fully in, it lives on its own canvas (faded as one flat layer) and the pieces on another.
    const split = phoneIn < 1;
    screen = (
      <Phone screen={gameScreenAt(frame)} finish="deep-blue" body={!split}>
        <GameScreen frame={frame} />
      </Phone>
    );
  }
  const fadingPhone = phoneIn > 0 && phoneIn < 1;

  return (
    <AbsoluteFill style={{ backgroundColor: palette.paper }}>
      <Backdrop frame={frame} />
      {fadingPhone ? (
        <AbsoluteFill style={{ opacity: phoneIn }}>
          <ThreeCanvas width={width} height={height} camera={{ fov: 30, position: [0, 0, 6] }} gl={{ antialias: true }}>
            <StudioLights />
            <group position={rig.position} rotation={rig.rotation} scale={rig.scale}>
              <Phone screen="talljakt/play-base.png" finish="deep-blue">
                {/* Same clean target as the hook layer above, so the two layers never disagree. */}
                <Sprite src="talljakt/target.png" x={M.target[0]} y={M.target[1]} width={M.target[2]} height={M.target[3]} z={2} />
              </Phone>
            </group>
          </ThreeCanvas>
        </AbsoluteFill>
      ) : null}
      <ThreeCanvas width={width} height={height} camera={{ fov: 30, position: [0, 0, 6] }} gl={{ antialias: true }}>
        <StudioLights />
        <group position={rig.position} rotation={rig.rotation} scale={rig.scale}>
          {screen}
        </group>

      </ThreeCanvas>
      <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(234,245,249,0.9) 0%, rgba(234,245,249,0.7) 20%, rgba(234,245,249,0) 30%)", pointerEvents: "none" }} />
      <AbsoluteFill style={{ background: "linear-gradient(0deg, rgba(234,245,249,0.9) 0%, rgba(234,245,249,0.55) 5%, rgba(234,245,249,0) 10%)", pointerEvents: "none" }} />
      <Badge frame={frame} />
      <Caption frame={frame} />
      <Flash frame={frame} />
      <Title {...title} lines={[{ text: "Seks tall." }]} from={14} to={T.reveal - 10} />
      <Title {...title} lines={[{ text: "Ett mål.", accent: "mål." }]} from={T.targetLand - 6} to={T.reveal - 10} top={325} />
      <Title {...title} lines={[{ text: "Tall, regneart," }, { text: "tall.", accent: "tall." }]} from={T.revealEnd - 30} to={T.moves[2] - 20} size={130} />
      <Title {...title} lines={[{ text: "Bygg videre." }]} from={T.moves[2] - 4} to={T.moves[3] - 14} size={140} />
      <Title {...title} lines={[{ text: "Blink!", accent: "Blink!" }]} from={T.moves[3] - 2} to={T.heroSlam - 24} size={190} />
      <Title {...title} lines={[{ text: "Blinkskudd!", accent: "Blinkskudd!" }]} from={T.heroSlam + 2} to={T.scorePop - 16} size={150} />
      <Title {...title} lines={[{ text: "10 poeng." }, { text: "Full pott.", accent: "Full pott." }]} from={T.scorePop - 4} to={T.spinA - 14} />
      <Title {...title} lines={[{ text: "67 veier" }, { text: "til målet.", accent: "målet." }]} from={T.spinA + 26} to={T.spinB - 14} />
      <Aha frame={frame} />
      <Title {...title} lines={[{ text: "Uendelig" }, { text: "frispill.", accent: "frispill." }]} from={T.spinB + 26} to={T.modeTap - 12} />
      <Title {...title} lines={[{ text: "Rolig eller" }, { text: "mot klokka.", accent: "mot klokka." }]} from={T.modeTap - 4} to={T.spinC - 4} />
      <Title {...title} lines={[{ text: "Ett minutt." }, { text: "Klokka går.", accent: "går." }]} from={T.spinC + 26} to={T.question - 10} size={130} />
      <Countdown frame={frame} />
      <QuestionCard frame={frame} from={T.question} to={T.tagline - 30} lines={["Rekker du å", "knekke koden?"]} />
      <Title {...title} lines={[{ text: "Seks tall." }, { text: "Ett mål.", accent: "mål." }]} from={T.tagline} to={T.end + 30} size={130} />
      <AbsoluteFill style={{ background: "radial-gradient(ellipse 80% 65% at 50% 50%, rgba(23,54,67,0) 60%, rgba(23,54,67,0.16) 100%)", pointerEvents: "none" }} />
      <Grain frame={frame} />
      <Audio src={staticFile("talljakt/soundtrack.wav")} />
    </AbsoluteFill>
  );
};
