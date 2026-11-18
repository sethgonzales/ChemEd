import { useEffect, useMemo, useRef } from 'react';
import PixelArt from '~/components/pixel-art';
import {
  BALLOON_PALETTE,
  RIDER_ROWS,
  balloonOutfit,
} from '~/constants/balloon-outfit';
import type { Platform, PlatformKind } from '~/constants/balloon-world';
import { MR_G, type Rider } from '~/constants/riders';
import { airAt } from '~/utils/atmosphere';
import { gasInside, type Balloon, type Flight } from '~/utils/balloon';
import { ENVELOPE_RADIUS, envelopeRadius } from '~/utils/balloon-view';
import { ZERO_CELSIUS } from '~/constants/physical';
import { Painter } from '~/utils/pixel-painter';

// The sky, side on, in art pixels: one viewBox unit is one art pixel.
// Wide and short, so the balloon fills it; on a phone it pans inside its frame.
const WIDTH = 400;
const HEIGHT = 150;
const GROUND_Y = 142; // sea level
const TOP_HEIGHT = 2000; // m, the top of the ruler
const PX_PER_M = 85 / TOP_HEIGHT; // so a balloon at 2,000 m still fits in
const MIN_WIDTH = 600; // px; narrower screens pan the sky, keeping it readable
const ROUTE_START = 40; // art px, clear of the ruler
const ROUTE_LENGTH = 4200; // m across the scene
const RULER_STEP = 500; // m between marks

// half the width of each kind of platform's top, art px
const TOP_HALF: Record<PlatformKind, number> = {
  pad: 16,
  mesa: 14,
  ridge: 14,
  tower: 12,
};

const y = (height: number) => GROUND_Y - height * PX_PER_M;
const x = (distance: number) =>
  ROUTE_START + (distance * (WIDTH - ROUTE_START - 10)) / ROUTE_LENGTH;

const SKY = ['#bfe3f5', '#a5d6f0', '#8bc8ea', '#72b9e3', '#5aa9da']; // low to high
const CRAFT_PALETTE = {
  K: '#1f2937',
  N: '#e4572e', // envelope gores
  n: '#f4d35e',
  W: '#fff7d6', // shine on a taut envelope
  f: '#b8431f', // folds in a slack one
  T: '#57534e', // ropes
  O: '#c08a4a', // wicker
  o: '#8a5a2b',
};
const ROCK = {
  mesa: ['#c2703d', '#9a5530'],
  ridge: ['#7c8a99', '#5d6875'],
  pad: ['#7b8b5a', '#5f6e43'],
  tower: ['#64748b', '#475569'],
};

const BASKET_W = 22;
const BASKET_H = 7;
const RIDER_SHOWN = 18; // rows of the rider above the rim; the rest hide behind it
const ROPE = 6; // art px from the rider's head to the envelope
const CRAFT_W = 2 * ENVELOPE_RADIUS + 4;
const CRAFT_H = BASKET_H + RIDER_SHOWN + ROPE + 2 * ENVELOPE_RADIUS + 2;

const fmt = (n: number, digits = 0) =>
  n.toLocaleString('en-US', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });

/** The envelope and ropes: curved gores, shining when taut, creased when slack */
function envelopeRows(radius: number, taut: boolean) {
  const p = new Painter(CRAFT_W, CRAFT_H - BASKET_H);
  const cx = CRAFT_W / 2;
  const ropeTop = CRAFT_H - BASKET_H - RIDER_SHOWN - ROPE;
  const ry = taut ? radius : radius * 1.08; // slack, it sags a little
  const cy = ropeTop - ry + 2;
  for (let py = Math.floor(cy - ry); py <= cy + ry; py++)
    for (let px = Math.floor(cx - radius); px <= cx + radius; px++) {
      const dx = (px + 0.5 - cx) / radius;
      const dy = (py + 0.5 - cy) / ry;
      if (dx * dx + dy * dy > 1) continue;
      // which gore: the fabric's panels curve round the sphere
      const u = dx / Math.sqrt(1 - Math.min(dy * dy, 0.999));
      const gore = Math.floor(
        (Math.asin(Math.max(-1, Math.min(1, u))) / Math.PI + 0.5) * 6,
      );
      p.set(px, py, gore % 2 ? 'n' : 'N');
    }
  if (taut)
    p.ellipse(
      cx - radius * 0.4,
      cy - ry * 0.45,
      radius * 0.18,
      ry * 0.12,
      'W',
      false,
    );
  else
    for (const fx of [-0.35, 0.3])
      p.line(
        cx + fx * radius,
        cy + ry * 0.2,
        cx + fx * radius * 0.8,
        cy + ry * 0.85,
        'f',
        false,
      );
  // ropes down to the basket's corners
  const rimY = CRAFT_H - BASKET_H;
  const bx = (CRAFT_W - BASKET_W) / 2;
  p.line(cx - radius * 0.5, cy + ry * 0.85, bx, rimY - 1, 'T', false);
  p.line(
    cx + radius * 0.5,
    cy + ry * 0.85,
    bx + BASKET_W - 1,
    rimY - 1,
    'T',
    false,
  );
  return p.rows();
}

function basketRows() {
  const p = new Painter(BASKET_W + 2, BASKET_H + 1);
  p.rect(1, 0, BASKET_W, BASKET_H, 'O');
  for (let i = 0; i < BASKET_W; i += 3)
    p.rect(1 + i, 1, 1, BASKET_H - 1, 'o', false);
  p.rect(1, 0, BASKET_W, 1, 'o', false); // the rim
  return p.rows();
}

/** A platform's rock, tower or pad, from its top down to the ground */
function PlatformShape({ platform }: { platform: Platform }) {
  const top = Math.round(y(platform.height));
  const cx = Math.round(x(platform.distance));
  const [light, dark] = ROCK[platform.kind as PlatformKind];
  const depth = GROUND_Y - top;
  if (platform.kind === 'tower')
    return (
      <g>
        <rect
          x={cx - TOP_HALF.tower}
          y={top}
          width={TOP_HALF.tower * 2}
          height={3}
          fill={dark}
        />
        {[-9, 7].map((dx) => (
          <rect
            key={dx}
            x={cx + dx}
            y={top + 3}
            width={2}
            height={depth - 3}
            fill={dark}
          />
        ))}
        {Array.from({ length: Math.floor(depth / 8) }, (_, i) => (
          <rect
            key={i}
            x={cx - 9}
            y={top + 6 + i * 8}
            width={18}
            height={1}
            fill={light}
          />
        ))}
      </g>
    );
  // stepped sides: wider further down, like eroded rock
  const steps = platform.kind === 'ridge' ? 6 : 3;
  const halfTop = TOP_HALF[platform.kind];
  return (
    <g>
      {Array.from({ length: steps }, (_, i) => {
        const sy = top + (depth * i) / steps;
        const half = halfTop + i * (platform.kind === 'ridge' ? 6 : 3);
        return (
          <g key={i}>
            <rect
              x={cx - half}
              y={Math.round(sy)}
              width={half * 2}
              height={Math.ceil(depth / steps) + 1}
              fill={light}
            />
            <rect
              x={cx + half - 3}
              y={Math.round(sy)}
              width={3}
              height={Math.ceil(depth / steps) + 1}
              fill={dark}
            />
          </g>
        );
      })}
      <rect
        x={cx - halfTop}
        y={top}
        width={halfTop * 2}
        height={1}
        fill="#e7e5e4"
      />
      {/* the weather station: a mast with a little vane */}
      <rect
        x={cx + halfTop - 6}
        y={top - 7}
        width={1}
        height={7}
        fill="#334155"
      />
      <rect
        x={cx + halfTop - 8}
        y={top - 8}
        width={5}
        height={1}
        fill="#334155"
      />
    </g>
  );
}

const CLOUDS = [
  [90, 30, 18],
  [230, 16, 24],
  [335, 52, 16],
  [160, 72, 14],
];

interface Props {
  balloon: Balloon;
  flight: Flight;
  distance: number; // m along the route
  platforms: Platform[];
  rider?: Rider; // Mr. G, until a student's avatar takes his place
}

/** The sky side on: platforms, the height ruler, and the balloon with its rider */
export default function BalloonScene({
  balloon,
  flight,
  distance,
  platforms,
  rider = MR_G,
}: Props) {
  const gas = gasInside(balloon, flight);
  const radius = Math.round(envelopeRadius(gas.volume, balloon.fullVolume));
  const envelope = useMemo(
    () => envelopeRows(radius, gas.taut),
    [radius, gas.taut],
  );
  const basket = useMemo(basketRows, []);
  const riderRows = balloonOutfit(rider.rows('idle')).slice(0, RIDER_ROWS);

  const craftX = Math.round(x(distance) - CRAFT_W / 2);
  const craftY = Math.round(y(flight.height) - CRAFT_H);
  const rimY = craftY + CRAFT_H - BASKET_H;
  const percent = (v: number, of: number) => `${(v / of) * 100}%`;

  // on a narrow screen, pan to keep the balloon in view
  const frame = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = frame.current;
    if (!el || el.scrollWidth <= el.clientWidth) return;
    el.scrollLeft = (x(distance) / WIDTH) * el.scrollWidth - el.clientWidth / 3;
  }, [distance]);

  return (
    <div className="relative w-full pixel-control">
      <div ref={frame} className="overflow-x-auto">
        <div className="relative" style={{ minWidth: MIN_WIDTH }}>
          <svg
            viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
            shapeRendering="crispEdges"
            className="block h-auto w-full"
            aria-hidden="true"
          >
            {SKY.map((c, i) => (
              <rect
                key={c}
                x={0}
                y={(HEIGHT * (SKY.length - 1 - i)) / SKY.length}
                width={WIDTH}
                height={HEIGHT / SKY.length + 1}
                fill={c}
              />
            ))}
            {CLOUDS.map(([cx, cy, w]) => (
              <g key={cx} fill="#ffffff" opacity={0.85}>
                <rect x={cx} y={cy} width={w} height={4} />
                <rect x={cx + 3} y={cy - 3} width={w - 8} height={3} />
              </g>
            ))}
            <rect
              x={0}
              y={GROUND_Y}
              width={WIDTH}
              height={HEIGHT - GROUND_Y}
              fill="#6a9a4a"
            />
            <rect x={0} y={GROUND_Y} width={WIDTH} height={1} fill="#8cc068" />
            {platforms.map((p) => (
              <PlatformShape key={p.name} platform={p} />
            ))}
          </svg>

          {/* the balloon: envelope and ropes, the rider, then the basket over their legs */}
          <svg
            viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
            className="pointer-events-none absolute inset-0 h-full w-full"
            role="img"
            aria-label={`${rider.name} in the balloon’s basket, at ${fmt(flight.height)} m`}
          >
            <g transform={`translate(${craftX} ${craftY})`}>
              <PixelArt rows={envelope} palette={CRAFT_PALETTE} scale={1 / 4} />
            </g>
            <g
              transform={`translate(${craftX + (CRAFT_W - 20) / 2} ${rimY - RIDER_SHOWN})`}
            >
              <PixelArt
                rows={riderRows}
                palette={{ ...rider.palette, ...BALLOON_PALETTE }}
                scale={1 / 4}
              />
            </g>
            <g
              transform={`translate(${craftX + (CRAFT_W - BASKET_W) / 2 - 1} ${rimY})`}
            >
              <PixelArt rows={basket} palette={CRAFT_PALETTE} scale={1 / 4} />
            </g>
          </svg>

          {platforms.map((p) => {
            const air = airAt(p.height);
            return (
              <div
                key={p.name}
                role="group"
                aria-label={p.name}
                // just right of the platform's top, clear of the balloon
                className="absolute flex flex-col whitespace-nowrap rounded-sm bg-slate-900/75 px-1 py-0.5 font-sans text-[10px] leading-none text-white sm:px-1.5 sm:text-[11px] sm:leading-tight"
                style={{
                  left: percent(x(p.distance) + TOP_HALF[p.kind] + 2, WIDTH),
                  bottom: percent(HEIGHT - y(p.height), HEIGHT),
                }}
              >
                <span className="font-semibold">{fmt(p.height)} m</span>
                <span>{fmt(air.pressure / 1000, 1)} kPa</span>
                <span>{fmt(air.temperature - ZERO_CELSIUS, 1)} °C</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* pinned at the left, so it stays put while the sky pans */}
      <ul
        aria-label="Height"
        className="pointer-events-none absolute inset-y-0 left-0 w-12 bg-gradient-to-r from-sky-100/70 to-transparent font-sans text-[10px] text-slate-800 sm:text-[11px]"
      >
        {Array.from(
          { length: TOP_HEIGHT / RULER_STEP + 1 },
          (_, i) => i * RULER_STEP,
        ).map((h) => (
          <li
            key={h}
            className="absolute left-1.5 -translate-y-1/2 whitespace-nowrap border-b border-slate-700/60 leading-none"
            style={{ top: percent(y(h), HEIGHT) }}
          >
            {fmt(h)} m
          </li>
        ))}
      </ul>
    </div>
  );
}
