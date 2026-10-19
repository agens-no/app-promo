// brand.ts — app-promo
import { loadFont } from "@remotion/fonts";
import { staticFile } from "remotion";

export const colors = {
  forest: "#0E1B16",
  forestLight: "#24443A",
  felt: "#15261E",
  paper: "#F2F1EA",
  cream: "#EEF0E2",
  ink: "#213D34",
  teal: "#A6B9AA",
  brass: "#D1AF73",
  brassDeep: "#96703C",
  copper: "#C8864A",
};

export const fontFamily = "SF Pro Rounded";

const weights = [
  ["Heavy", "800"],
  ["Bold", "700"],
  ["Semibold", "600"],
  ["Medium", "500"],
] as const;

export const fontsReady = Promise.all(
  weights.map(([file, weight]) => loadFont({ family: fontFamily, url: staticFile(`fonts/SF-Pro-Rounded-${file}.otf`), weight })),
);
