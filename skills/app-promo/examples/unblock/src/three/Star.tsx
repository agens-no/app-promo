// Star.tsx — app-promo
import React, { useMemo } from "react";
import * as THREE from "three";

type StarProps = {
  readonly size: number;
  readonly position: [number, number, number];
  readonly rotation?: [number, number, number];
  readonly scale?: number;
  readonly color?: string;
};

// A bevelled brass star, sized in the same units as its parent (screen pixels inside <Phone>).
export const Star: React.FC<StarProps> = ({ size, position, rotation, scale = 1, color = "#B98A4C" }) => {
  const geometry = useMemo(() => {
    const shape = new THREE.Shape();
    const outer = size / 2;
    const inner = outer * 0.48;
    for (let i = 0; i < 10; i++) {
      const radius = i % 2 === 0 ? outer : inner;
      const angle = -Math.PI / 2 + (i * Math.PI) / 5;
      const point = [Math.cos(angle) * radius, Math.sin(angle) * radius] as const;
      if (i === 0) shape.moveTo(...point);
      else shape.lineTo(...point);
    }
    shape.closePath();
    const geo = new THREE.ExtrudeGeometry(shape, {
      depth: size * 0.12,
      bevelEnabled: true,
      bevelThickness: size * 0.08,
      bevelSize: size * 0.07,
      bevelSegments: 5,
    });
    geo.center();
    return geo;
  }, [size]);
  return (
    <mesh geometry={geometry} position={position} rotation={rotation} scale={scale}>
      <meshStandardMaterial color={color} metalness={0.85} roughness={0.28} />
    </mesh>
  );
};
