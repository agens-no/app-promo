// useFrameTexture.ts — app-promo
// One pre-extracted recording frame (JPEG) as a texture for the phone display, held until the canvas has drawn it.
import React, { useLayoutEffect, useRef, useState } from "react";
import { useThree } from "@react-three/fiber";
import { staticFile, useDelayRender } from "remotion";
import * as THREE from "three";

export type FrameTexture = { texture: THREE.Texture | null; drawn: () => void };

export const useFrameTexture = (path: string | null): FrameTexture => {
  const { delayRender, continueRender, cancelRender } = useDelayRender();
  const [texture, setTexture] = useState<THREE.Texture | null>(null);
  const pending = useRef<number | null>(null);
  const url = path ? staticFile(path) : null;

  useLayoutEffect(() => {
    if (!url) {
      setTexture(null);
      return;
    }
    const handle = delayRender(`frame ${url}`);
    pending.current = handle;
    let loaded: THREE.Texture | null = null;
    let cancelled = false;
    new THREE.TextureLoader()
      .loadAsync(url)
      .then((next) => {
        next.colorSpace = THREE.SRGBColorSpace;
        next.flipY = false;
        next.anisotropy = 8;
        loaded = next;
        if (!cancelled) setTexture(next);
      })
      .catch((error) => cancelRender(error));
    return () => {
      cancelled = true;
      if (pending.current === handle) pending.current = null;
      continueRender(handle);
      setTimeout(() => loaded?.dispose(), 3000);
    };
  }, [url, delayRender, continueRender, cancelRender]);

  const drawn = () => {
    if (pending.current !== null) {
      continueRender(pending.current);
      pending.current = null;
    }
  };
  return { texture: url ? texture : null, drawn };
};

// Lives inside <ThreeCanvas>: redraws when a frame texture arrives, then releases the render.
export const Redraw: React.FC<{ readonly frames: FrameTexture[] }> = ({ frames }) => {
  const { advance } = useThree();
  useLayoutEffect(() => {
    advance(performance.now());
    frames.forEach((f) => f.texture && f.drawn());
  });
  return null;
};
