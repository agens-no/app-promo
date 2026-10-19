// Sprite.tsx — app-promo
import React, { useLayoutEffect, useMemo } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { useTexture } from "./assets";

type SpriteProps = {
  readonly src: string;
  // Top-left corner and size in screen pixels.
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly z?: number;
  readonly opacity?: number;
  readonly scale?: number;
  readonly rotation?: [number, number, number];
  // Transparent layers sort by distance; overlays on a tilted face need a fixed order instead.
  readonly renderOrder?: number;
};

export const Sprite: React.FC<SpriteProps> = ({ src, x, y, width, height, z = 0, opacity = 1, scale = 1, rotation, renderOrder = 2 }) => {
  const texture = useTexture(src);
  if (!texture) return null;
  return (
    <mesh position={[x + width / 2, y + height / 2, z]} scale={scale} rotation={rotation} renderOrder={renderOrder}>
      <planeGeometry args={[width, height]} />
      <meshBasicMaterial map={texture} transparent opacity={opacity} side={THREE.DoubleSide} toneMapped={false} depthWrite={false} />
    </mesh>
  );
};

const roundedRect = (width: number, height: number, radius: number) => {
  const shape = new THREE.Shape();
  const x = -width / 2;
  const y = -height / 2;
  shape.moveTo(x + radius, y);
  shape.lineTo(x + width - radius, y);
  shape.quadraticCurveTo(x + width, y, x + width, y + radius);
  shape.lineTo(x + width, y + height - radius);
  shape.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  shape.lineTo(x + radius, y + height);
  shape.quadraticCurveTo(x, y + height, x, y + height - radius);
  shape.lineTo(x, y + radius);
  shape.quadraticCurveTo(x, y, x + radius, y);
  return shape;
};

type SlabProps = SpriteProps & {
  readonly color: string;
  readonly depth: number;
  readonly radius?: number;
};

// A sprite with a solid body behind it, so the flat app block gains thickness as it lifts off the screen.
export const Slab: React.FC<SlabProps> = ({ color, depth, radius = 26, ...sprite }) => {
  const geometry = useMemo(() => {
    const geo = new THREE.ExtrudeGeometry(roundedRect(sprite.width - 6, sprite.height - 6, radius), {
      depth: 1,
      bevelEnabled: true,
      bevelThickness: 0.08,
      bevelSize: 3,
      bevelSegments: 4,
      curveSegments: 10,
    });
    geo.translate(0, 0, -1.08);
    return geo;
  }, [sprite.width, sprite.height, radius]);
  const z = sprite.z ?? 0;
  const scale = sprite.scale ?? 1;
  return (
    <group position={[sprite.x + sprite.width / 2, sprite.y + sprite.height / 2, z]} rotation={sprite.rotation} scale={scale}>
      {depth > 0.5 ? (
        <mesh geometry={geometry} scale={[1, 1, depth]} position={[0, 0, -0.5]}>
          <meshStandardMaterial color={color} roughness={0.55} metalness={0} side={THREE.DoubleSide} />
        </mesh>
      ) : null}
      <Sprite src={sprite.src} x={-sprite.width / 2} y={-sprite.height / 2} width={sprite.width} height={sprite.height} opacity={sprite.opacity} />
    </group>
  );
};

export const StudioLights: React.FC<{ readonly warmth?: number }> = ({ warmth = 1 }) => {
  const { gl, scene } = useThree();
  useLayoutEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl);
    const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = env;
    gl.localClippingEnabled = true;
    scene.environmentIntensity = 0.9;
    return () => {
      env.dispose();
      pmrem.dispose();
    };
  }, [gl, scene]);
  return (
    <>
      <ambientLight intensity={0.25} />
      <directionalLight position={[3, 5, 6]} intensity={1.6 * warmth} color="#FFE6C4" />
      <directionalLight position={[-5, 1, 3]} intensity={0.6} color="#BFD6C8" />
      <directionalLight position={[0, -4, -5]} intensity={0.9} color="#D1AF73" />
    </>
  );
};
