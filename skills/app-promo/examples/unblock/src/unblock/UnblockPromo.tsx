// UnblockPromo.tsx — app-promo
import React, { useEffect, useState } from "react";
import { ThreeCanvas } from "@remotion/three";
import { Audio } from "@remotion/media";
import { AbsoluteFill, continueRender, delayRender, Easing, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { Phone } from "../three/Phone";
import { Slab, StudioLights } from "../three/Sprite";
import { Star } from "../three/Star";
import { BoardBlocks, BlockPose } from "./BoardBlocks";
import { board, BlockId, solution } from "./board";
import { colors, fontFamily, fontsReady } from "./brand";
import { Title } from "./Title";
import { HomeScene, LogoScene, letterLanding, levelAt, SummaryScene } from "./Features";
import timeline from "./timeline.json";

// Beat sheet in frames at 60 fps (120 bpm, so one beat is 30 frames). Shared with tools/unblock_audio.mjs.
export const T = timeline;

const tray = (board as unknown as { tray: number[] }).tray;
const moves = solution(T.firstMove, T.moveGap, T.moveDuration);
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const inOut = Easing.bezier(0.65, 0, 0.35, 1);
const out = Easing.bezier(0.16, 1, 0.3, 1);
const accel = Easing.bezier(0.55, 0, 0.9, 0.4);

const dropOrder: BlockId[] = ["b5", "b7", "b1", "b2", "b6", "b4", "b3", "b8", "target"];
const dropAt = (id: BlockId) => T.dropStart + dropOrder.indexOf(id) * T.dropStagger + (id === "target" ? 10 : 0);
const LAND = 15;

const impacts = [
  ...dropOrder.map((id) => ({ at: dropAt(id) + LAND, amp: id === "target" ? 0.02 : 0.008 })),
  { at: T.nudge + 8, amp: 0.012 },
  { at: T.nudge + 26, amp: 0.016 },
  ...moves.map((move) => ({ at: move.at + move.duration * 0.6, amp: 0.004 })),
];

const shake = (frame: number) =>
  impacts.reduce((sum, hit) => {
    const t = frame - hit.at;
    if (t < 0 || t > 30) return sum;
    return sum + hit.amp * Math.exp(-t / 5) * Math.sin(t * 2.1);
  }, 0);

// The whole film is one continuous shot: everything moves the phone rig, the camera stays still.
const rigPose = (frame: number) => {
  if (frame < T.payoff) {
    const k = [T.reveal, T.revealEnd];
    const s = interpolate(frame, k, [3.25, 1.06], { ...clamp, easing: inOut });
    const drift = interpolate(frame, [T.revealEnd, T.flash], [0, 1], clamp);
    return {
      position: [
        interpolate(frame, k, [0, -0.06], { ...clamp, easing: inOut }) + shake(frame),
        interpolate(frame, k, [-0.3, -0.2], { ...clamp, easing: inOut }) + shake(frame + 7) * 0.6,
        0,
      ] as [number, number, number],
      rotation: [
        interpolate(frame, [0, ...k], [0.42, 0.22, 0.16], { ...clamp, easing: inOut }) - drift * 0.04,
        interpolate(frame, [0, ...k], [-0.2, -0.08, -0.42], { ...clamp, easing: inOut }) + drift * 0.18 + interpolate(frame, [T.launch, T.flash], [0, 0.22], { ...clamp, easing: accel }),
        interpolate(frame, k, [0, 0.05], { ...clamp, easing: inOut }),
      ] as [number, number, number],
      scale: s,
    };
  }
  return keyedPose(frame);
};

type Pose = { f: number; position: [number, number, number]; rotation: [number, number, number]; scale: number };

// After the payoff the rig glides between held poses; two full spins carry the screen changes.
const poses: Pose[] = [
  { f: T.payoff, position: [0, -0.75, -1.2], rotation: [0.1, 0.5, -0.02], scale: 1.3 },
  { f: T.payoff + 50, position: [0, -0.42, 0], rotation: [0.08, 0.1, -0.02], scale: 1.3 },
  { f: T.spinA, position: [0, -0.4, 0], rotation: [0.05, -0.05, -0.02], scale: 1.3 },
  { f: T.home, position: [0, -0.3, 0], rotation: [0.1, -0.25, 0.02], scale: 1.15 },
  { f: T.segIn + 30, position: [-0.04, -0.36, 0], rotation: [0.12, 0.18, 0.02], scale: 1.15 },
  { f: T.dailyOut + 20, position: [0, -0.62, 0], rotation: [0.34, 0.08, 0], scale: 1.18 },
  { f: T.spinB, position: [0, -0.56, 0], rotation: [0.28, -0.1, 0], scale: 1.18 },
  { f: T.summary, position: [0.06, -0.4, 0], rotation: [0.1, -0.28, 0.02], scale: 1.18 },
  { f: T.outro - 10, position: [-0.04, -0.42, 0], rotation: [0.08, 0.14, 0], scale: 1.18 },
  { f: T.outro + 30, position: [0, -3.4, -0.5], rotation: [0.7, 0.4, 0.1], scale: 1.1 },
];

const spin = (frame: number, at: number) => interpolate(frame, [at, at + 30], [0, Math.PI * 2], { ...clamp, easing: inOut });

const keyedPose = (frame: number) => {
  const i = Math.max(0, poses.findIndex((_, index) => frame < (poses[index + 1]?.f ?? Infinity)));
  const a = poses[i];
  const b = poses[Math.min(poses.length - 1, i + 1)];
  const t = b === a ? 1 : interpolate(frame, [a.f, b.f], [0, 1], { ...clamp, easing: i === 0 ? out : inOut });
  const mix = (x: number, y: number) => x + (y - x) * t;
  const float = Math.sin(frame / 40) * 0.012;
  return {
    position: [mix(a.position[0], b.position[0]), mix(a.position[1], b.position[1]) + float, mix(a.position[2], b.position[2])] as [number, number, number],
    rotation: [
      mix(a.rotation[0], b.rotation[0]),
      mix(a.rotation[1], b.rotation[1]) + spin(frame, T.spinA) + spin(frame, T.spinB),
      mix(a.rotation[2], b.rotation[2]),
    ] as [number, number, number],
    scale: mix(a.scale, b.scale),
  };
};

const blockPose = (frame: number) => (id: BlockId): BlockPose => {
  const start = dropAt(id);
  const fall = interpolate(frame, [start, start + LAND, start + LAND + 4, start + LAND + 8], [1, 0, 0.018, 0], {
    ...clamp,
    easing: [Easing.bezier(0.5, 0, 0.9, 0.5), Easing.out(Easing.quad), Easing.in(Easing.quad)],
  });
  const seed = dropOrder.indexOf(id);
  let lift = fall * 1500;
  const move = moves.find((m) => m.block === id);
  if (move) {
    const p = interpolate(frame, [move.at, move.at + move.duration], [0, 1], clamp);
    lift += Math.sin(Math.PI * p) * 70;
  }
  const pose: BlockPose = {
    lift,
    depth: 70,
    opacity: interpolate(frame, [start, start + 3], [0, 1], clamp),
    rotation: [fall * (seed % 2 ? 0.5 : -0.4), fall * (seed % 3 ? -0.35 : 0.3), fall * (seed % 2 ? -0.5 : 0.45)],
  };
  if (id === "target") {
    const bump = (at: number) => interpolate(frame, [at, at + 8, at + 18], [0, 1, 0], { ...clamp, easing: [Easing.in(Easing.quad), out] });
    const out1 = interpolate(frame, [T.launch, T.launch + 24], [0, 1], { ...clamp, easing: out });
    const grow = interpolate(frame, [T.launch + 14, T.flash + 10], [0, 1], { ...clamp, easing: Easing.in(Easing.cubic) });
    return {
      ...pose,
      dx: bump(T.nudge) * 24 + bump(T.nudge + 18) * 24 + out1 * 330 - grow * 260,
      dy: -grow * 120,
      lift: lift + out1 * 520 + grow * 900,
      depth: 70,
      scale: 1 + out1 * 0.4 + grow * 15,
      rotation: [out1 * -0.3 + grow * 0.3, out1 * 0.7 - grow * 0.7, out1 * 0.18 - grow * 0.18],
    };

  }
  if (id === "b6") {
    const t = frame - (T.nudge + 8);
    const t2 = frame - (T.nudge + 26);
    const wobble = (x: number) => (x < 0 ? 0 : Math.exp(-x / 6) * Math.sin(x * 1.4) * 0.06);
    return { ...pose, rotation: [0, 0, wobble(t) + wobble(t2)] };
  }
  return pose;
};

const logoTilt = (frame: number): [number, number, number] => {
  const settle = interpolate(frame, [T.outro, T.end], [0, 1], { ...clamp, easing: out });
  const thud = Math.max(0, frame - letterLanding("B"));
  const shakeB = frame > letterLanding("B") ? Math.exp(-thud / 5) * Math.sin(thud * 2.1) * 0.03 : 0;
  return [0.5 - settle * 0.36 + shakeB, -0.3 + settle * 0.22, 0.04 - settle * 0.04];
};

const Payoff: React.FC<{ readonly frame: number }> = ({ frame }) => {
  const { stars, card } = (board as unknown as { result: { stars: number[][]; card: number[] } }).result;
  const cardP = interpolate(frame, [T.cardOut, T.cardOut + 30], [0, 1], { ...clamp, easing: out });
  const away = interpolate(frame, [T.spinA - 26, T.spinA + 4], [0, 1], { ...clamp, easing: Easing.in(Easing.cubic) });
  return (
    <>
      <Slab
        src="unblock/result-card.png"
        color="#E4E3D9"
        depth={60}
        x={card[0]}
        y={card[1] + cardP * 520 + away * 1600}
        width={card[2]}
        height={card[3]}
        z={1 + cardP * 520}
        rotation={[-cardP * 0.35, cardP * 0.12, 0]}
        scale={1 + cardP * 0.15}
      />
      {stars.map(([x, y, w, h], i) => {
        const at = T.starsOut + i * 15;
        const p = interpolate(frame, [at, at + 26], [0, 1], { ...clamp, easing: Easing.bezier(0.34, 1.56, 0.64, 1) });
        const spin = interpolate(frame, [at, at + 40], [0, Math.PI * 2], { ...clamp, easing: out });
        const spread = (i - 1) * 300;
        return (
          <Star
            key={i}
            size={w}
            position={[x + w / 2 + p * spread * (1 + away * 2), y + h / 2 - p * 640 + (i === 1 ? -p * 90 : 0) - away * 2200, 6 + p * 700 + away * 600]}
            rotation={[Math.PI, spin + (i - 1) * 0.3, (i - 1) * -0.25 * p]}
            scale={1 + p * 2.4}
          />
        );
      })}
    </>
  );
};

const MoveChip: React.FC<{ readonly frame: number }> = ({ frame }) => {
  const shown = interpolate(frame, [T.firstMove - 10, T.firstMove + 12, T.flash - 30, T.flash - 10], [0, 1, 1, 0], { ...clamp, easing: out });
  const count = moves.filter((move) => frame >= move.at + move.duration * 0.55).length;
  const last = [...moves].reverse().find((move) => frame >= move.at + move.duration * 0.55);
  const pop = last ? interpolate(frame, [last.at + last.duration * 0.55, last.at + last.duration * 0.55 + 14], [1.25, 1], { ...clamp, easing: out }) : 1;
  return (
    <div
      style={{
        position: "absolute",
        bottom: 260,
        left: "50%",
        translate: `-50% ${(1 - shown) * 80}px`,
        opacity: shown,
        display: "flex",
        alignItems: "baseline",
        gap: 22,
        padding: "22px 46px",
        borderRadius: 999,
        background: "rgba(238,240,226,0.94)",
        boxShadow: "0 30px 80px rgba(0,0,0,0.45), inset 0 -6px 0 rgba(33,61,52,0.12)",
        fontFamily,
        color: colors.ink,
      }}
    >
      <span style={{ fontWeight: 800, fontSize: 92, scale: `${pop}`, display: "inline-block", minWidth: 60, textAlign: "center" }}>{count}</span>
      <span style={{ fontWeight: 600, fontSize: 44, color: "#4F6358" }}>trekk</span>
      <span style={{ fontWeight: 600, fontSize: 44, color: "#4F6358", opacity: 0.5 }}>· minst 4</span>
    </div>
  );
};

const levelCopy: Record<string, [string, string]> = {
  serie: ["Serie", "5 brett av gangen, fra rolig til krevende"],
  rolig: ["Rolig", "4–7 trekk i korteste løsning"],
  utfordring: ["Utfordring", "8–12 trekk i korteste løsning"],
  krevende: ["Krevende", "13–20 trekk i korteste løsning"],
};

const LevelChip: React.FC<{ readonly frame: number }> = ({ frame }) => {
  const shown = interpolate(frame, [T.segOut + 10, T.segOut + 30, T.segIn - 4, T.segIn + 10], [0, 1, 1, 0], { ...clamp, easing: out });
  const [name, copy] = levelCopy[levelAt(frame)];
  const step = [...T.segSteps].reverse().find((at) => frame >= at) ?? T.segOut;
  const swap = interpolate(frame, [step, step + 12], [0, 1], { ...clamp, easing: out });
  return (
    <div style={{ position: "absolute", bottom: 170, left: 0, right: 0, display: "flex", justifyContent: "center", opacity: shown, translate: `0 ${(1 - shown) * 60}px` }}>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 6,
          padding: "26px 54px",
          borderRadius: 48,
          background: "rgba(238,240,226,0.95)",
          boxShadow: "0 30px 80px rgba(0,0,0,0.45), inset 0 -6px 0 rgba(33,61,52,0.12)",
          fontFamily,
          color: colors.ink,
        }}
      >
        <span style={{ fontWeight: 800, fontSize: 64, opacity: swap, translate: `0 ${(1 - swap) * 16}px` }}>{name}</span>
        <span style={{ fontWeight: 500, fontSize: 36, color: "#4F6358", opacity: swap }}>{copy}</span>
      </div>
    </div>
  );
};

const EndLine: React.FC<{ readonly frame: number }> = ({ frame }) => {
  const p = interpolate(frame, [T.tagline + 24, T.tagline + 50], [0, 1], { ...clamp, easing: out });
  return (
    <div style={{ position: "absolute", top: 1590, left: 0, right: 0, textAlign: "center", fontFamily, fontWeight: 600, fontSize: 40, letterSpacing: "0.02em", color: colors.teal, opacity: p, translate: `0 ${(1 - p) * 30}px` }}>
      Dagens fem · uendelig frispill · uten nett
    </div>
  );
};

const Backdrop: React.FC<{ readonly frame: number }> = ({ frame }) => {
  const glowX = 50 + Math.sin(frame / 90) * 8;
  const glowY = 42 + Math.cos(frame / 110) * 5;
  return (
    <>
      <AbsoluteFill style={{ background: `radial-gradient(ellipse 80% 55% at ${glowX}% ${glowY}%, ${colors.forestLight} 0%, ${colors.forest} 70%, #08110D 100%)` }} />
      <AbsoluteFill
        style={{
          background: `radial-gradient(circle at ${70 - frame * 0.03}% ${18 + frame * 0.01}%, rgba(209,175,115,0.18) 0%, rgba(209,175,115,0) 40%)`,
        }}
      />
    </>
  );
};

const Flash: React.FC<{ readonly frame: number }> = ({ frame }) => {
  const flash = interpolate(frame, [T.flash + 2, T.flash + 10, T.payoff, T.payoff + 26], [0, 1, 1, 0], clamp);
  return <AbsoluteFill style={{ background: `radial-gradient(circle at 50% 50%, #E2C48C 0%, ${colors.brassDeep} 100%)`, opacity: flash }} />;
};

const Grain: React.FC<{ readonly frame: number }> = ({ frame }) => (
  <AbsoluteFill style={{ opacity: 0.09, mixBlendMode: "overlay", pointerEvents: "none" }}>
    <svg width="100%" height="100%">
      <filter id="grain">
        <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed={Math.floor(frame / 2)} />
      </filter>
      <rect width="100%" height="100%" filter="url(#grain)" />
    </svg>
  </AbsoluteFill>
);

const Vignette = () => (
  <AbsoluteFill style={{ background: "radial-gradient(ellipse 75% 60% at 50% 50%, rgba(0,0,0,0) 55%, rgba(0,0,0,0.55) 100%)", pointerEvents: "none" }} />
);

export const UnblockPromo: React.FC = () => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const [fontHandle] = useState(() => delayRender("Loading fonts"));
  useEffect(() => {
    fontsReady.then(() => continueRender(fontHandle));
  }, [fontHandle]);

  const rig = rigPose(frame);
  const payoff = frame >= T.payoff;

  return (
    <AbsoluteFill style={{ backgroundColor: colors.forest }}>
      <Backdrop frame={frame} />
      <ThreeCanvas width={width} height={height} camera={{ fov: 30, position: [0, 0, 6] }} gl={{ antialias: true }}>
        <StudioLights />
        <group position={rig.position} rotation={rig.rotation} scale={rig.scale}>
          {frame >= T.spinB + 15 ? (
            frame < T.outro + 40 ? (
              <Phone screen="unblock/summary-empty.png">
                <SummaryScene frame={frame} />
              </Phone>
            ) : null
          ) : frame >= T.spinA + 15 ? (
            <Phone screen="unblock/home-empty.png">
              <HomeScene frame={frame} />
            </Phone>
          ) : payoff ? (
            <Phone screen="unblock/result-empty.png">
              <Payoff frame={frame} />
            </Phone>
          ) : (
            <Phone screen="unblock/board-empty.png" opacity={interpolate(frame, [T.reveal + 6, T.reveal + 40], [0, 1], { ...clamp, easing: inOut })}>
              {frame < T.reveal + 42 ? (
                <Slab src="unblock/board-tray.png" color="#5F7B6C" depth={90} x={tray[0]} y={tray[1]} width={tray[2]} height={tray[3]} z={0.3} radius={64} />
              ) : null}
              <BoardBlocks frame={frame} moves={moves} pose={blockPose(frame)} showCounter={frame > T.reveal + 30} />
            </Phone>
          )}
        </group>
        {frame >= T.outro - 5 ? (
          <group position={[0, 0.3, 0]} rotation={logoTilt(frame)} scale={[0.00196, -0.00196, 0.00196]}>
            <LogoScene frame={frame} />
          </group>
        ) : null}
      </ThreeCanvas>
      <MoveChip frame={frame} />
      <Title lines={[{ text: "Alt står" }, { text: "fast.", accent: "fast." }]} from={18} to={T.reveal - 6} />
      <Title lines={[{ text: "Én brikke." }, { text: "Én vei ut.", accent: "vei ut." }]} from={T.revealEnd - 36} to={T.firstMove - 20} />
      <Title lines={[{ text: "Skyv." }]} from={moves[0].at - 4} to={moves[1].at - 20} size={170} />
      <Title lines={[{ text: "Tenk." }]} from={moves[1].at - 4} to={moves[2].at - 20} size={170} />
      <Title lines={[{ text: "Skyv igjen." }]} from={moves[2].at - 4} to={moves[3].at - 22} size={170} />
      <Title lines={[{ text: "Ut!", accent: "Ut!" }]} from={moves[3].at - 2} to={T.flash - 12} size={230} />
      <Flash frame={frame} />
      <Title lines={[{ text: "Perfekt." }, { text: "Fri vei.", accent: "Fri vei." }]} from={T.payoff + 18} to={T.spinA - 16} />
      <Title lines={[{ text: "Uendelig" }, { text: "frispill.", accent: "frispill." }]} from={T.home + 10} to={T.dailyOut - 34} />
      <LevelChip frame={frame} />
      <Title lines={[{ text: "Ny utfordring" }, { text: "hver dag.", accent: "hver dag." }]} from={T.dailyOut - 14} to={T.spinB - 6} size={136} />
      <Title lines={[{ text: "Fem brett." }, { text: "Én score.", accent: "Én score." }]} from={T.summary + 4} to={T.sharePress - 40} />
      <Title lines={[{ text: "Utfordre" }, { text: "en venn.", accent: "en venn." }]} from={T.sharePress - 30} to={T.outro - 24} />
      <Title lines={[{ text: "Finn veien ut.", accent: "ut." }]} from={T.tagline} to={T.end + 30} top={1430} size={118} />
      <EndLine frame={frame} />
      <Vignette />
      <Grain frame={frame} />
      <Audio src={staticFile("unblock/soundtrack.wav")} />
    </AbsoluteFill>
  );
};
