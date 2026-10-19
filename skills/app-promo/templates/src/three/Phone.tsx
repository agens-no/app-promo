// Phone.tsx — app-promo
import React, { useMemo, useRef } from "react";
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
  // A live texture (e.g. a video frame) shown instead of the still screen.
  readonly texture?: THREE.Texture | null;
  readonly finish?: Finish;
  readonly opacity?: number;
  // false draws only the screen-space children, so they can live on a separate layer while the phone fades.
  readonly body?: boolean;
  // Children are laid out in screen pixels: origin top-left, +x right, +y down, +z toward the viewer.
  readonly children?: React.ReactNode;
} & Omit<ThreeElements["group"], "children">;

const MODEL_SCALE = 10;

export const Phone: React.FC<PhoneProps> = ({ screen, texture, finish = "cosmic-orange", opacity = 1, body = true, children, ...group }) => {
  const source = useModel("models/iphone-17-pro.glb");
  const screenTexture = useTexture(screen);
  const groupRef = useRef<THREE.Group>(null);

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
        const tinted = material.clone();
        // The cosmic-orange finish is partly baked into textures; tinting them gives brown, so drop the map.
        tinted.map = null;
        tinted.color.set(color);
        mesh.material = tinted;
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
    // While fading, everything behind the middle of the body is clipped away; otherwise the camera
    // plateau shows through the translucent display. The plane follows the phone each draw.
    const plane = new THREE.Plane();
    const normal = new THREE.Vector3();
    const point = new THREE.Vector3();
    const quaternion = new THREE.Quaternion();
    model.traverse((node) => {
      const mesh = node as THREE.Mesh;
      if (!mesh.isMesh) return;
      mesh.onBeforeRender = () => {
        const group = groupRef.current;
        if (!group) return;
        group.getWorldQuaternion(quaternion);
        normal.set(0, 0, 1).applyQuaternion(quaternion);
        point.set(0, 0, -0.002);
        group.localToWorld(point);
        plane.setFromNormalAndCoplanarPoint(normal, point);
      };
    });
    return { model, screenMesh: screenMesh as THREE.Mesh, screenBox, plane };
  }, [source, finish]);

  const screenMaterial = useMemo(() => new THREE.MeshBasicMaterial({ toneMapped: false }), []);
  if (rig) {
    const map = texture ?? screenTexture;
    if (screenMaterial.map !== map) {
      screenMaterial.map = map;
      screenMaterial.needsUpdate = true;
    }
    rig.screenMesh.material = screenMaterial;
  }

  if (!rig) return null;
  rig.model.visible = body && opacity > 0.001;
  rig.model.traverse((node) => {
    const mesh = node as THREE.Mesh;
    if (!mesh.isMesh) return;
    const material = mesh.material as THREE.Material;
    material.transparent = opacity < 0.999;
    material.opacity = opacity;
    material.depthWrite = opacity > 0.98;
    material.clippingPlanes = opacity < 0.999 ? [rig.plane] : null;
  });
  const { screenBox } = rig;
  const width = screenBox.max.x - screenBox.min.x;
  const height = screenBox.max.y - screenBox.min.y;
  const unit = width / SCREEN_PIXELS.width;

  return (
    <group {...group} ref={groupRef}>
      <primitive object={rig.model} />
      <group position={[screenBox.min.x, screenBox.max.y, screenBox.max.z + 0.0004]} scale={[unit, -height / SCREEN_PIXELS.height, unit]}>
        {children}
      </group>
    </group>
  );
};
