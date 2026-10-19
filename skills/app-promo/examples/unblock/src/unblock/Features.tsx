// Features.tsx — app-promo
import React from "react";
import { Easing, interpolate } from "remotion";
import { Lifted, Overlay } from "../three/Lifted";
import { Slab } from "../three/Sprite";
import meta from "../../public/unblock/board.json";
import timeline from "./timeline.json";

const T = timeline;
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const out = Easing.bezier(0.16, 1, 0.3, 1);
const back = Easing.bezier(0.34, 1.56, 0.64, 1);
const inOut = Easing.bezier(0.65, 0, 0.35, 1);

type Assets = {
  home: { card: number[]; pills: number[][]; seg: number[]; desc: number[]; spill: number[] };
  summary: { card: number[]; number: number[]; values: number[]; rows: number[][]; share: number[] };
  logo: { side: number; cell: number; gap: number; rim: number; letters: Record<string, [number, number]> };
};
const { home, summary, logo } = meta as unknown as Assets;

const ramp = (frame: number, from: number, to: number, easing = out) => interpolate(frame, [from, to], [0, 1], { ...clamp, easing });

// A quick press: dips toward the screen and springs back.
const press = (frame: number, at: number) =>
  interpolate(frame, [at - 6, at, at + 4, at + 16], [0, 1, 1, 0], { ...clamp, easing: [Easing.in(Easing.quad), Easing.linear, out] });

export const levels = ["serie", "rolig", "utfordring", "krevende"] as const;
export const levelAt = (frame: number) => levels[T.segSteps.filter((step) => frame >= step).length];

export const HomeScene: React.FC<{ readonly frame: number }> = ({ frame }) => {
  const seg = ramp(frame, T.segOut, T.segOut + 26, back) * (1 - ramp(frame, T.segIn, T.segIn + 24, inOut));
  const lastStep = [...T.segSteps].reverse().find((step) => frame >= step);
  const pop = lastStep === undefined ? 0 : interpolate(frame, [lastStep, lastStep + 4, lastStep + 16], [0, 1, 0], { ...clamp, easing: [Easing.out(Easing.quad), out] });
  const spill = press(frame, T.spillPress);
  const spillRise = ramp(frame, T.spillPress - 24, T.spillPress - 8) * (1 - ramp(frame, T.spillPress + 8, T.spillPress + 30));

  const card = ramp(frame, T.dailyOut, T.dailyOut + 30, back);
  const away = ramp(frame, T.spinB - 14, T.spinB + 6, Easing.in(Easing.cubic));
  const done = ramp(frame, T.dailyDone, T.dailyDone + 12, inOut);

  return (
    <>
      <Lifted
        rect={home.card}
        src="unblock/daily-card.png"
        color="#1C3027"
        depth={60}
        radius={84}
        lift={card * 820 + away * 2600}
        dy={-card * 900 - away * 900}
        scale={1 + card * 0.55}
        rotation={[-card * 0.32 + away * 0.6, card * 0.08, -card * 0.03]}
      >
        {home.pills.map((rect, i) => {
          const at = T.pills + i * 15;
          return <Overlay key={i} src={`unblock/daily-pill-${i}.png`} rect={rect} opacity={ramp(frame, at, at + 6)} z={0.2} />;
        })}
        <Overlay src="unblock/daily-card-done.png" rect={home.card} opacity={done} z={0.4} layer={2} />
      </Lifted>
      <Lifted
        rect={home.seg}
        src={`unblock/seg-${levelAt(frame)}.png`}
        color="#C9CDBF"
        depth={44}
        radius={72}
        lift={seg * 620}
        dy={-seg * 760}
        scale={1 + seg * 0.62 + pop * 0.06}
        rotation={[-seg * 0.18, 0, 0]}
      />
      <Lifted rect={home.spill} src="unblock/spill.png" color="#8F6A37" depth={40} radius={54} lift={spillRise * 120 - spill * 100} scale={1 + spillRise * 0.06 - spill * 0.05} />
    </>
  );
};

export const SummaryScene: React.FC<{ readonly frame: number }> = ({ frame }) => {
  const card = ramp(frame, T.summary + 6, T.summary + 36, back);
  const count = interpolate(frame, [T.scoreCount, T.scoreCount + 60], [0, 5000], { ...clamp, easing: Easing.out(Easing.cubic) });
  const shown = [...summary.values].reverse().find((value) => value <= count + 0.5) ?? 0;
  const share = ramp(frame, T.sharePress - 30, T.sharePress - 6, back);
  const tap = press(frame, T.sharePress);
  const leave = ramp(frame, T.outro - 10, T.outro + 20, Easing.in(Easing.cubic));
  return (
    <>
      <Lifted rect={summary.card} src="unblock/score-card.png" color="#E4E3D9" depth={60} radius={84} lift={card * 520} dy={-card * 420} scale={1 + card * 0.4} rotation={[-card * 0.12, 0, 0]}>
        <Overlay src={`unblock/score-${shown}.png`} rect={summary.number} z={0.3} />
      </Lifted>
      {summary.rows.map((rect, i) => {
        const p = ramp(frame, T.rows + i * 7.5, T.rows + i * 7.5 + 22, back);
        const side = i % 2 ? 1 : -1;
        return (
          <Lifted
            key={i}
            rect={rect}
            src={`unblock/row-${i}.png`}
            color="#E7E5DC"
            depth={30}
            radius={40}
            lift={p * (180 + i * 30) + leave * 900}
            dx={p * side * 46}
            dy={leave * 1400}
            rotation={[0, 0, p * side * 0.035]}
          />
        );
      })}
      <Lifted rect={summary.share} src="unblock/share.png" color="#8F6A37" depth={40} radius={54} lift={share * 260 - tap * 120} dy={-share * 80} scale={1 + share * 0.12 - tap * 0.06} />
    </>
  );
};

const letterOrder = ["U", "N", "L", "O", "C", "K", "B"];
export const letterLanding = (letter: string) => T.logoDrop + letterOrder.indexOf(letter) * 7.5 + (letter === "B" ? 12 : 0) + 15;

export const LogoScene: React.FC<{ readonly frame: number }> = ({ frame }) => {
  const trayIn = ramp(frame, T.outro, T.outro + 30, back);
  const { side, cell, gap, rim } = logo;
  return (
    <group position={[-side / 2, -side / 2, 0]}>
      <Slab src="unblock/logo-tray.png" color="#5F7B6C" depth={110} radius={70} x={0} y={(1 - trayIn) * 1600} width={side} height={side} z={0} rotation={[(1 - trayIn) * 0.8, 0, 0]} />
      {Object.entries(logo.letters).map(([letter, [row, col]]) => {
        const land = letterLanding(letter);
        const fall = interpolate(frame, [land - 15, land, land + 4, land + 8], [1, 0, 0.02, 0], {
          ...clamp,
          easing: [Easing.bezier(0.5, 0, 0.9, 0.5), Easing.out(Easing.quad), Easing.in(Easing.quad)],
        });
        const seed = letterOrder.indexOf(letter);
        const size = cell - 4;
        return (
          <Slab
            key={letter}
            src={`unblock/logo-${letter}.png`}
            color={letter === "B" ? "#B8834A" : "#C9CCB8"}
            depth={60}
            radius={36}
            x={rim + gap / 2 + col * (cell + gap) + (gap + 4) / 2 - 2}
            y={rim + gap / 2 + row * (cell + gap) + (gap + 4) / 2 - 2}
            width={size}
            height={size}
            z={2 + fall * 1700}
            opacity={interpolate(frame, [land - 15, land - 12], [0, 1], clamp)}
            rotation={[fall * (seed % 2 ? 0.6 : -0.5), fall * (seed % 3 ? -0.4 : 0.35), fall * (seed % 2 ? -0.6 : 0.5)]}
          />
        );
      })}
    </group>
  );
};

export const logoSide = logo.side;
