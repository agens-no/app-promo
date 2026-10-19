// BoardBlocks.tsx — app-promo
import React from "react";
import { Slab, Sprite } from "../three/Sprite";
import { blockColor, board, BlockId, Move, movesMade, offsetFor } from "./board";

export type BlockPose = {
  readonly lift?: number;
  readonly depth?: number;
  readonly dx?: number;
  readonly dy?: number;
  readonly scale?: number;
  readonly rotation?: [number, number, number];
  readonly opacity?: number;
};

type BoardBlocksProps = {
  readonly frame: number;
  readonly moves: Move[];
  readonly pose?: (id: BlockId, index: number) => BlockPose;
  readonly showCounter?: boolean;
};

// Lays the real block sprites out in screen pixels, so it can sit inside <Phone> or float in space.
export const BoardBlocks: React.FC<BoardBlocksProps> = ({ frame, moves, pose, showCounter = true }) => {
  const [cx, cy, cx2, cy2] = board.counter;
  return (
    <>
      {showCounter ? (
        <Sprite src={`unblock/counter-${Math.min(9, movesMade(moves, frame))}.png`} x={cx} y={cy} width={cx2 - cx} height={cy2 - cy} z={0.5} />
      ) : null}
      {board.blocks.map((block, index) => {
        const offset = offsetFor(block.id, moves, frame) * board.pitch;
        const p = pose?.(block.id, index) ?? {};
        const [x, y, width, height] = block.rect;
        return (
          <Slab
            key={block.id}
            src={`unblock/block-${block.id}.png`}
            color={blockColor(block.id)}
            depth={p.depth ?? 0}
            x={x + (block.horizontal ? offset : 0) + (p.dx ?? 0)}
            y={y + (block.horizontal ? 0 : offset) + (p.dy ?? 0)}
            width={width}
            height={height}
            z={1 + (p.lift ?? 0)}
            scale={p.scale}
            rotation={p.rotation}
            opacity={p.opacity}
          />
        );
      })}
    </>
  );
};
