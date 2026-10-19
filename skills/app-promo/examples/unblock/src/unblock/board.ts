// board.ts — app-promo
import { Easing, interpolate } from "remotion";
import meta from "../../public/unblock/board.json";

export type BlockId = "b1" | "b2" | "b3" | "b4" | "b5" | "b6" | "b7" | "b8" | "target";

export type BlockMeta = {
  id: BlockId;
  horizontal: boolean;
  row: number;
  col: number;
  length: number;
  rect: [number, number, number, number];
};

export const board = meta as unknown as {
  counter: [number, number, number, number];
  pitch: number;
  blocks: BlockMeta[];
};

export type Move = { block: BlockId; cells: number; at: number; duration: number };

// Today's daily, solved in the minimum four moves. The last move carries the brass piece out of the exit.
export const solution = (start: number, gap: number, duration: number): Move[] => [
  { block: "b8", cells: -3, at: start, duration },
  { block: "b6", cells: 2, at: start + gap, duration },
  { block: "b4", cells: 2, at: start + gap * 2, duration },
  { block: "target", cells: 4, at: start + gap * 3, duration: duration * 1.15 },
];

const slide = Easing.bezier(0.22, 1, 0.36, 1);

export const offsetFor = (id: BlockId, moves: Move[], frame: number) =>
  moves
    .filter((move) => move.block === id)
    .reduce(
      (sum, move) =>
        sum +
        interpolate(frame, [move.at, move.at + move.duration], [0, move.cells], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
          easing: slide,
        }),
      0,
    );

export const movesMade = (moves: Move[], frame: number) =>
  moves.filter((move) => frame >= move.at + move.duration * 0.55).length;

export const blockColor = (id: BlockId) => (id === "target" ? "#B8834A" : "#C9CCB8");
