// assets.ts — app-promo
// Suspense-based loaders: <ThreeCanvas> holds the render until every suspended asset resolves.
import { staticFile } from "remotion";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

type Entry<T> = { promise: Promise<T>; value?: T; error?: unknown };
const cache = new Map<string, Entry<unknown>>();

const suspend = <T,>(key: string, load: () => Promise<T>): T => {
  let entry = cache.get(key) as Entry<T> | undefined;
  if (!entry) {
    const created: Entry<T> = { promise: Promise.resolve() as Promise<T> };
    created.promise = load().then(
      (value) => (created.value = value),
      (error) => {
        created.error = error;
        throw error;
      },
    );
    cache.set(key, created as Entry<unknown>);
    entry = created;
  }
  if (entry.error) throw entry.error;
  if (entry.value === undefined) throw entry.promise;
  return entry.value;
};

export const useTexture = (path: string, srgb = true) =>
  suspend(`texture:${path}:${srgb}`, () =>
    new THREE.TextureLoader().loadAsync(staticFile(path)).then((texture) => {
      texture.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
      texture.flipY = false;
      texture.anisotropy = 8;
      return texture;
    }),
  );

export const useModel = (path: string) =>
  suspend(`model:${path}`, () => new GLTFLoader().loadAsync(staticFile(path)).then((gltf) => gltf.scene));
