// Lifted.tsx — app-promo
import React from "react";
import { Slab, Sprite } from "./Sprite";

export type Lift = {
  readonly lift?: number;
  readonly dx?: number;
  readonly dy?: number;
  readonly scale?: number;
  readonly rotation?: [number, number, number];
};

type LiftedProps = Lift & {
  // The element's resting rectangle on the screen, in screen pixels.
  readonly rect: number[];
  readonly src: string;
  readonly color: string;
  readonly depth?: number;
  readonly radius?: number;
  readonly opacity?: number;
  // Extra layers drawn on the element's face, positioned in screen pixels like the element itself.
  readonly children?: React.ReactNode;
};

// A piece of real app UI that can rise off the display as a solid slab, carrying any overlays with it.
export const Lifted: React.FC<LiftedProps> = ({ rect, src, color, depth = 50, radius = 40, opacity, lift = 0, dx = 0, dy = 0, scale = 1, rotation, children }) => {
  const [x, y, width, height] = rect;
  return (
    <group position={[x + width / 2 + dx, y + height / 2 + dy, 1 + lift]} rotation={rotation} scale={scale}>
      <Slab src={src} color={color} depth={depth} radius={radius} x={-width / 2} y={-height / 2} width={width} height={height} opacity={opacity} />
      <group position={[-x - width / 2, -y - height / 2, 0.6]}>{children}</group>
    </group>
  );
};

export const Overlay: React.FC<{ readonly src: string; readonly rect: number[]; readonly opacity?: number; readonly z?: number; readonly layer?: number }> = ({
  src,
  rect,
  opacity,
  z = 0,
  layer = 1,
}) => (
  <Sprite src={src} x={rect[0]} y={rect[1]} width={rect[2]} height={rect[3]} opacity={opacity} z={z} renderOrder={2 + layer} />
);
