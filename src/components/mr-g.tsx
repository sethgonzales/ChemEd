import {
  FRAMES,
  PALETTE,
  SPRITE_HEIGHT,
  SPRITE_WIDTH,
  type Frame,
} from '~/constants/mr-g-sprite';

interface Props {
  frame?: Frame;
  height?: number; // px; width follows the sprite's proportions
  className?: string;
}

type Run = { x: number; y: number; width: number; fill: string };

// One rectangle per run of same-coloured pixels in a row
function runs(frame: string[]): Run[] {
  return frame.flatMap((row, y) => {
    const out: Run[] = [];
    let x = 0;
    for (const match of row.match(/(.)\1*/g) ?? []) {
      if (match[0] !== '.') {
        out.push({
          x,
          y,
          width: match.length,
          fill: PALETTE[match[0] as keyof typeof PALETTE],
        });
      }
      x += match.length;
    }
    return out;
  });
}

/** Mr. G as crisp 8-bit pixel art */
export default function MrG({ frame = 'idle', height = 96, className }: Props) {
  return (
    <svg
      role="img"
      aria-label="Mr. G"
      viewBox={`0 0 ${SPRITE_WIDTH} ${SPRITE_HEIGHT}`}
      width={(height * SPRITE_WIDTH) / SPRITE_HEIGHT}
      height={height}
      shapeRendering="crispEdges"
      className={className}
    >
      {runs(FRAMES[frame]).map((r) => (
        <rect
          key={`${r.x}-${r.y}`}
          x={r.x}
          y={r.y}
          width={r.width}
          height={1}
          fill={r.fill}
        />
      ))}
    </svg>
  );
}
