import { PIXEL } from '~/utils/pixel';

interface Props {
  rows: string[]; // palette letters; '.' is transparent
  palette: Record<string, string>;
  label?: string; // describes the picture; without one it's decorative
  scale?: number; // app pixels (PIXEL) per art pixel; whole numbers keep the grid
  className?: string;
  'data-frame'?: string;
}

// trims floating-point dust from fractional scales (30 × 3.2 = 96.00000000000001)
const round = (n: number) => Math.round(n * 100) / 100;

type Run = { x: number; y: number; width: number; fill: string };

// One rectangle per run of same-coloured pixels in a row
function runs(rows: string[], palette: Props['palette']): Run[] {
  return rows.flatMap((row, y) => {
    const out: Run[] = [];
    let x = 0;
    for (const match of row.match(/(.)\1*/g) ?? []) {
      if (match[0] !== '.') {
        out.push({ x, y, width: match.length, fill: palette[match[0]] });
      }
      x += match.length;
    }
    return out;
  });
}

/** Crisp 8-bit pixel art from a pixel map */
export default function PixelArt({
  rows,
  palette,
  label,
  scale = 1,
  className,
  ...rest
}: Props) {
  const width = rows[0]?.length ?? 0;
  const px = scale * PIXEL;
  return (
    <svg
      {...(label
        ? { role: 'img', 'aria-label': label }
        : { 'aria-hidden': true })}
      viewBox={`0 0 ${width} ${rows.length}`}
      width={round(width * px)}
      height={round(rows.length * px)}
      shapeRendering="crispEdges"
      className={className}
      {...rest}
    >
      {runs(rows, palette).map((r) => (
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
