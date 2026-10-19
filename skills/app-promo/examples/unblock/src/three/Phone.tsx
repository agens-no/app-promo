// Phone.tsx — app-promo
import React, { useMemo } from "react";
import type { ThreeElements } from "@react-three/fiber";
import * as THREE from "three";
import { useModel, useTexture } from "./assets";

export const SCREEN_PIXELS = { width: 1206, height: 2622 };

export type Finish = "cosmic-orange" | "deep-blue" | "silver";

// Material overrides from baguette's iphone-17-pro definition.json.
const finishMaterials = [
  "HETovHCBsEjcSiP", "SMUhrjUPCjJkPUK", "PJgHvfOhNXkxvzq", "SLmJkLdkhbbuEfG", "VXTclbUnoLmmPoD",
  "YQFhPSFSryEqJMp", "awYxKfiOpRgQIxD", "hiWLrxfkqoGxruc", "iAKEWdNafBldSCV", "nwfiSfJrPZRLBAj",
  "ooxVuxObmmqIeuh", "sJxAokqqlZYuwzy", "yPEFElLJTRhfWfw", "ybSvSfarxzoBKlb",
];
const finishColors: Record<Finish, string | null> = {
  "cosmic-orange": null,
  "deep-blue": "#5B627C",
  silver: "#D8D8D8",
};

type PhoneProps = {
  readonly screen: string;
  readonly finish?: Finish;
  readonly opacity?: number;
  // Children are laid out in screen pixels: origin top-left, +x right, +y down, +z toward the viewer.
  readonly children?: React.ReactNode;
} & Omit<ThreeElements["group"], "children">;

const MODEL_SCALE = 10;

export const Phone: React.FC<PhoneProps> = ({ screen, finish = "cosmic-orange", opacity = 1, children, ...group }) => {
  const source = useModel("models/iphone-17-pro.glb");
  const screenTexture = useTexture(screen);

  const rig = useMemo(() => {
    if (!source) return null;
    const model = source.clone(true);
    model.scale.setScalar(MODEL_SCALE);
    let screenMesh: THREE.Mesh | null = null;
    model.traverse((node) => {
      const mesh = node as THREE.Mesh;
      if (!mesh.isMesh) return;
      const material = mesh.material as THREE.MeshStandardMaterial;
      if (material.name === "ScreenMaterial") screenMesh = mesh;
      const color = finishColors[finish];
      if (color && finishMaterials.includes(material.name)) {
        mesh.material = material.clone();
        (mesh.material as THREE.MeshStandardMaterial).color.set(color);
      }
    });
    if (!screenMesh) throw new Error("Phone model has no screen");
    model.updateMatrixWorld(true);
    let screenBox = new THREE.Box3().setFromObject(screenMesh);
    const body = new THREE.Box3().setFromObject(model);
    if (screenBox.max.z < body.getCenter(new THREE.Vector3()).z) {
      model.rotation.y = Math.PI;
      model.updateMatrixWorld(true);
      screenBox = new THREE.Box3().setFromObject(screenMesh);
    }
    const center = new THREE.Box3().setFromObject(model).getCenter(new THREE.Vector3());
    model.position.sub(center);
    model.updateMatrixWorld(true);
    screenBox = new THREE.Box3().setFromObject(screenMesh);
    return { model, screenMesh: screenMesh as THREE.Mesh, screenBox };
  }, [source, finish]);

  useMemo(() => {
    if (!rig || !screenTexture) return;
    rig.screenMesh.material = new THREE.MeshBasicMaterial({ map: screenTexture, toneMapped: false });
  }, [rig, screenTexture]);

  if (!rig) return null;
  rig.model.visible = opacity > 0.001;
  rig.model.traverse((node) => {
    const mesh = node as THREE.Mesh;
    if (!mesh.isMesh) return;
    const material = mesh.material as THREE.Material;
    material.transparent = opacity < 0.999;
    material.opacity = opacity;
    material.depthWrite = opacity > 0.98;
    // While fading only the display shows; the camera plateau would show through a translucent body.
    mesh.visible = opacity > 0.999 || mesh === rig.screenMesh;
  });
  const { screenBox } = rig;
  const width = screenBox.max.x - screenBox.min.x;
  const height = screenBox.max.y - screenBox.min.y;
  const unit = width / SCREEN_PIXELS.width;

  return (
    <group {...group}>
      <primitive object={rig.model} />
      <group position={[screenBox.min.x, screenBox.max.y, screenBox.max.z + 0.0004]} scale={[unit, -height / SCREEN_PIXELS.height, unit]}>
        {children}
      </group>
    </group>
  );
};
