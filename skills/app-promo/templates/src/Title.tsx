// Title.tsx — app-promo
import React from "react";
import { Easing, interpolate, useCurrentFrame } from "remotion";
import { colors, fontFamily } from "./brand";

export type TitleLine = { readonly text: string; readonly accent?: string };

type TitleProps = {
  readonly lines: TitleLine[];
  readonly from: number;
  readonly to: number;
  readonly top?: number;
  readonly size?: number;
  readonly stagger?: number;
  readonly color?: string;
  readonly accentColor?: string;
  readonly family?: string;
  readonly align?: "center" | "left";
  readonly left?: number;
  readonly shadow?: string;
  readonly weight?: number;
};

const enter = Easing.bezier(0.16, 1, 0.3, 1);
const leave = Easing.bezier(0.7, 0, 0.84, 0);

// Words rise into place one by one and leave upwards; an accent word is set in brass.
export const Title: React.FC<TitleProps> = ({ lines, from, to, top = 210, size = 150, stagger = 4, color = colors.cream, accentColor = colors.brass, family = fontFamily, align = "center", left = 0, shadow = "0 12px 40px rgba(0,0,0,0.35)", weight = 800 }) => {
  const frame = useCurrentFrame();
  if (frame < from - 1 || frame > to + 20) return null;
  let index = 0;
  return (
    <div
      style={{
        position: "absolute",
        top,
        left,
        right: align === "center" ? 0 : undefined,
        textAlign: align,
        fontFamily: family,
        fontWeight: weight,
        fontSize: size,
        lineHeight: 1.02,
        letterSpacing: "-0.035em",
        color,
      }}
    >
      {lines.map((line) => (
        <div key={line.text} style={{ display: "flex", justifyContent: align === "center" ? "center" : "flex-start", gap: size * 0.24 }}>
          {line.text.split(" ").map((word) => {
            const i = index++;
            const start = from + i * stagger;
            const exit = to + i * 2;
            const inP = interpolate(frame, [start, start + 22], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: enter });
            const outP = interpolate(frame, [exit, exit + 14], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: leave });
            const accent = line.accent && line.accent.split(" ").includes(word);
            return (
              <span key={word + i} style={{ display: "inline-block", overflow: "visible" }}>
                <span
                  style={{
                    display: "inline-block",
                    color: accent ? accentColor : color,
                    opacity: inP * (1 - outP),
                    translate: `0 ${(1 - inP) * 0.55 * size - outP * 0.4 * size}px`,
                    rotate: `${(1 - inP) * 6}deg`,
                    scale: `${0.92 + 0.08 * inP}`,
                    filter: `blur(${(1 - inP) * 14 + outP * 10}px)`,
                    textShadow: shadow,
                  }}
                >
                  {word}
                </span>
              </span>
            );
          })}
        </div>
      ))}
    </div>
  );
};
