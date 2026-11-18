import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  airDevices,
  balloonDevices,
  stationDevices,
} from '~/components/balloon-devices';
import Gauge, { CARD_WIDTH } from '~/components/balloon-gauges';
import PixelArt from '~/components/pixel-art';
import { BALLOON_PALETTE, balloonOutfit } from '~/constants/balloon-outfit';
import {
  BALLOON,
  type AreaKind,
  type Leg,
  type Platform,
} from '~/constants/balloon-world';
import { MR_G, type Rider } from '~/constants/riders';
import { gasInside, type Balloon, type Flight } from '~/utils/balloon';
import {
  STRUCTURE,
  camera,
  distanceAt,
  groundAt,
  rulerMarks,
  worldSize,
  worldX,
  worldY,
} from '~/utils/balloon-camera';
import {
  ENVELOPE_RADIUS,
  GUESSED_WIDTH,
  envelopeRadius,
  viewSize,
} from '~/utils/balloon-view';
import { halfSize } from '~/utils/mini-sprite';
import { useMedia } from '~/utils/use-media';
import { Painter } from '~/utils/pixel-painter';

const COLUMN = 2; // art px per column of ground
const PARALLAX = 0.5; // the far hills move half as fast as the camera
const SIGN_OFFSET = 330; // m from a landing spot to its signpost, clear of the balloon's gauges
const SIGN_POST = 6; // art px tall

const fmt = (n: number) => n.toLocaleString('en-US');

// a steady pseudo-random number from a seed, so the scenery doesn't shift
const hash = (n: number) => {
  const v = Math.sin(n * 12.9898 + 78.233) * 43758.5453;
  return v - Math.floor(v);
};

const SKY = ['#5aa9da', '#6cb4df', '#7fc0e5', '#93cbea', '#a8d6ef', '#bde1f3'];

// the ground's colours near each kind of place: top, body, and a darker band
const LAND: Record<AreaKind | 'valley', [string, string, string]> = {
  valley: ['#7cb342', '#6d8b3a', '#5e7a32'],
  field: ['#8bc34a', '#6d8b3a', '#5e7a32'],
  mesa: ['#e08a4f', '#c2683a', '#a2522d'],
  lookout: ['#4f8f3a', '#466b34', '#3c5c2d'],
  ridge: ['#9aa5b1', '#7c8794', '#66717d'],
};

/** Which place's colours the ground takes at a distance */
function landAt(leg: Leg, distance: number): AreaKind | 'valley' {
  const near = (p: Platform) => Math.abs(distance - p.distance) < 700;
  if (near(leg.from)) return leg.from.kind;
  if (near(leg.to)) return leg.to.kind;
  return 'valley';
}

/** The ground: columns from the surface down, banded like rock strata */
function Terrain({
  leg,
  width,
  height,
}: {
  leg: Leg;
  width: number;
  height: number;
}) {
  const columns = useMemo(() => {
    const out: ReactNode[] = [];
    for (let x = 0; x < width; x += COLUMN) {
      const d = distanceAt(leg, x + COLUMN / 2);
      const h = groundAt(leg, d);
      const top = Math.round(worldY(leg, h));
      const kind = landAt(leg, d);
      const [surface, body, band] = LAND[kind];
      out.push(
        <g key={x}>
          <rect
            x={x}
            y={top}
            width={COLUMN}
            height={height - top}
            fill={body}
          />
          {/* strata: darker bands every few pixels, steady in height */}
          {kind === 'mesa' &&
            Array.from({ length: Math.ceil((height - top) / 7) }, (_, i) => {
              const by = Math.ceil(top / 7) * 7 + i * 7;
              return (
                <rect
                  key={i}
                  x={x}
                  y={by}
                  width={COLUMN}
                  height={2}
                  fill={band}
                />
              );
            })}
          {/* snow on the ridge's upper slopes */}
          <rect
            x={x}
            y={top}
            width={COLUMN}
            height={2}
            fill={
              kind === 'ridge' &&
              h > leg.to.height - 120 &&
              leg.to.kind === 'ridge'
                ? '#f8fafc'
                : surface
            }
          />
        </g>,
      );
    }
    return out;
  }, [leg, width, height]);
  return <g>{columns}</g>;
}

/** Far hills, two layers of silhouette, drawn wider than the world for parallax */
function FarHills({ leg, width }: { leg: Leg; width: number }) {
  const base = worldY(leg, leg.valley) + 6;
  const layers = [
    { color: '#a7c3d9', amp: 70, seed: 1, step: 6 },
    { color: '#8fb3a0', amp: 38, seed: 7, step: 4 },
  ];
  return (
    <g>
      {layers.map(({ color, amp, seed, step }) => (
        <g key={seed} fill={color}>
          {Array.from({ length: Math.ceil(width / step) }, (_, i) => {
            const x = i * step;
            // whole pixels: the server's Math.sin and the browser's can differ
            // in the last digit, which would break hydration
            const h = Math.round(
              amp *
                (0.55 +
                  0.3 * Math.sin(x / 47 + seed) +
                  0.15 * Math.sin(x / 13 + seed * 3)),
            );
            return (
              <rect key={i} x={x} y={base - h} width={step} height={h + 40} />
            );
          })}
        </g>
      ))}
    </g>
  );
}

function Cloud({ x, y, w }: { x: number; y: number; w: number }) {
  return (
    <g fill="#ffffff" opacity={0.9}>
      <rect x={x} y={y} width={w} height={3} />
      <rect x={x + 2} y={y - 2} width={w - 5} height={2} />
      <rect x={x + w / 3} y={y - 4} width={w / 3} height={2} />
      <rect x={x + 1} y={y + 3} width={w - 2} height={1} fill="#dbe7ef" />
    </g>
  );
}

function Pine({ x, y, tall = 9 }: { x: number; y: number; tall?: number }) {
  return (
    <g>
      <rect x={x} y={y - 2} width={1} height={2} fill="#5b4636" />
      {Array.from({ length: Math.floor(tall / 3) }, (_, i) => {
        const w = 2 + (Math.floor(tall / 3) - i) * 2;
        return (
          <rect
            key={i}
            x={x - w / 2 + 0.5}
            y={y - 2 - (i + 1) * 3}
            width={w}
            height={3}
            fill={i % 2 ? '#2f6b3a' : '#367a42'}
          />
        );
      })}
    </g>
  );
}

function RoundTree({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <rect x={x} y={y - 3} width={1} height={3} fill="#5b4636" />
      <rect x={x - 2} y={y - 7} width={5} height={4} fill="#4e8c3a" />
      <rect x={x - 1} y={y - 8} width={3} height={1} fill="#5fa046" />
    </g>
  );
}

/** Trees, a river and birds scattered between the places */
/** A farm in the valley: a house, a red barn, a silo and a few rows of crops */
function Farm({ x, y }: { x: number; y: number }) {
  return (
    <g>
      {Array.from({ length: 9 }, (_, i) => (
        <rect
          key={i}
          x={x - 40 + i * 3}
          y={y}
          width={2}
          height={1}
          fill={i % 2 ? '#c5a02f' : '#9bbf3a'}
        />
      ))}
      <rect x={x - 10} y={y - 7} width={10} height={7} fill="#f5f0e1" />
      {[0, 1, 2].map((r) => (
        <rect
          key={r}
          x={x - 11 + r * 2}
          y={y - 8 - r}
          width={12 - r * 4}
          height={1}
          fill="#475569"
        />
      ))}
      <rect x={x - 8} y={y - 5} width={2} height={2} fill="#fde047" />
      <rect x={x - 4} y={y - 4} width={2} height={4} fill="#7c2d12" />
      <rect x={x + 4} y={y - 10} width={12} height={10} fill="#b91c1c" />
      {[0, 1, 2].map((r) => (
        <rect
          key={r}
          x={x + 3 + r * 2}
          y={y - 11 - r}
          width={14 - r * 4}
          height={1}
          fill="#7f1d1d"
        />
      ))}
      <rect x={x + 8} y={y - 6} width={4} height={6} fill="#f8fafc" />
      <rect x={x + 9} y={y - 5} width={2} height={5} fill="#7f1d1d" />
      <rect x={x + 18} y={y - 14} width={4} height={14} fill="#cbd5e1" />
      <rect x={x + 18} y={y - 16} width={4} height={2} fill="#94a3b8" />
    </g>
  );
}

/** Trees, a farm, a road with a bridge, a river and birds between the places */
function Countryside({ leg, width }: { leg: Leg; width: number }) {
  const items: ReactNode[] = [];
  const mid = (leg.from.distance + leg.to.distance) / 2;
  const farm = leg.from.distance + (leg.to.distance - leg.from.distance) * 0.3;
  const surface = (d: number) => Math.round(worldY(leg, groundAt(leg, d)));

  // the dirt road along the valley floor, from one place towards the other
  for (let x = 0; x < width; x += COLUMN) {
    const d = distanceAt(leg, x);
    if (landAt(leg, d) !== 'valley' || Math.abs(d - mid) < 90) continue;
    items.push(
      <rect
        key={`road${x}`}
        x={x}
        y={surface(d)}
        width={COLUMN}
        height={1}
        fill="#c8a978"
      />,
    );
  }
  for (let i = 0; i < width / 5; i++) {
    const x = Math.round(hash(i) * width);
    const d = distanceAt(leg, x);
    const kind = landAt(leg, d);
    if (kind === 'mesa' || kind === 'field') continue; // open ground there
    if (Math.abs(d - mid) < 140 || Math.abs(d - farm) < 220) continue;
    items.push(
      kind === 'valley' && hash(i + 99) > 0.4 ? (
        <RoundTree key={i} x={x} y={surface(d)} />
      ) : (
        <Pine
          key={i}
          x={x}
          y={surface(d)}
          tall={6 + Math.round(hash(i + 7) * 6)}
        />
      ),
    );
  }
  items.push(
    <Farm key="farm" x={Math.round(worldX(leg, farm))} y={surface(farm)} />,
  );

  // the river through the valley floor, with the road's bridge over it
  const rx = Math.round(worldX(leg, mid));
  const ry = surface(mid);
  items.push(
    <g key="river">
      <rect x={rx - 18} y={ry} width={36} height={4} fill="#3b82c4" />
      <rect x={rx - 13} y={ry + 1} width={8} height={1} fill="#93c5fd" />
      <rect x={rx + 5} y={ry + 2} width={7} height={1} fill="#93c5fd" />
      <rect x={rx - 20} y={ry - 3} width={40} height={1} fill="#8b5a2b" />
      {[-16, -6, 4, 14].map((dx) => (
        <rect
          key={dx}
          x={rx + dx}
          y={ry - 2}
          width={1}
          height={5}
          fill="#5c3a1c"
        />
      ))}
    </g>,
  );
  return <g>{items}</g>;
}

function Birds({ leg, width }: { leg: Leg; width: number }) {
  return (
    <g fill="#334155">
      {Array.from({ length: Math.ceil(width / 160) }, (_, i) => {
        const x = Math.round(hash(i + 40) * width);
        const y = Math.round(
          worldY(leg, leg.valley + 250 + hash(i + 41) * 500),
        );
        return (
          <g key={i}>
            <rect x={x} y={y} width={1} height={1} />
            <rect x={x + 1} y={y + 1} width={1} height={1} />
            <rect x={x + 2} y={y} width={1} height={1} />
          </g>
        );
      })}
    </g>
  );
}

// where each place's weather station stands, art px from its landing spot
const STATION_AT: Record<AreaKind, number> = {
  field: 12,
  mesa: 12,
  lookout: -22,
  ridge: 12,
};

/** A weather station: a louvred Stevenson screen on legs, and an anemometer */
function WeatherStation({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <rect x={x} y={y - 4} width={1} height={4} fill="#475569" />
      <rect x={x + 5} y={y - 4} width={1} height={4} fill="#475569" />
      <rect x={x - 1} y={y - 10} width={8} height={6} fill="#f8fafc" />
      <rect x={x - 2} y={y - 11} width={10} height={1} fill="#cbd5e1" />
      {[0, 2, 4].map((dy) => (
        <rect
          key={dy}
          x={x}
          y={y - 9 + dy}
          width={6}
          height={1}
          fill="#cbd5e1"
        />
      ))}
      <rect x={x + 11} y={y - 16} width={1} height={16} fill="#475569" />
      <rect x={x + 9} y={y - 17} width={5} height={1} fill="#475569" />
      <rect x={x + 8} y={y - 18} width={1} height={1} fill="#475569" />
      <rect x={x + 14} y={y - 18} width={1} height={1} fill="#475569" />
      <rect x={x + 11} y={y - 19} width={4} height={1} fill="#ef4444" />
    </g>
  );
}

/** What stands at each kind of place: its buildings and bits of life */
function AreaProps({
  kind,
  x,
  y,
  deck,
}: {
  kind: AreaKind;
  x: number;
  y: number;
  deck: number;
}) {
  switch (kind) {
    case 'field':
      return (
        <g>
          {/* the landing circle */}
          <rect x={x - 9} y={y} width={18} height={1} fill="#f1f5f9" />
          {/* the hangar, with a striped arched roof */}
          <rect x={x - 52} y={y - 11} width={26} height={11} fill="#a8b0ba" />
          <rect x={x - 46} y={y - 7} width={10} height={7} fill="#4b5563" />
          {[0, 1, 2].map((r) => (
            <rect
              key={r}
              x={x - 52 + r * 2}
              y={y - 13 - r}
              width={26 - r * 4}
              height={1}
              fill={r % 2 ? '#f8fafc' : '#dc2626'}
            />
          ))}
          {/* fence */}
          {Array.from({ length: 7 }, (_, i) => (
            <rect
              key={i}
              x={x - 80 + i * 4}
              y={y - 3}
              width={1}
              height={3}
              fill="#8b5a2b"
            />
          ))}
          <rect x={x - 80} y={y - 2} width={25} height={1} fill="#8b5a2b" />
          {/* flags */}
          {['#2563eb', '#f59e0b', '#16a34a'].map((c, i) => (
            <g key={c}>
              <rect
                x={x - 20 + i * 4}
                y={y - 9}
                width={1}
                height={9}
                fill="#475569"
              />
              <rect
                x={x - 19 + i * 4}
                y={y - 9}
                width={3}
                height={2}
                fill={c}
              />
            </g>
          ))}
          {/* helium cylinders on a trailer */}
          <rect x={x + 24} y={y - 2} width={14} height={2} fill="#374151" />
          {[0, 1, 2, 3].map((i) => (
            <rect
              key={i}
              x={x + 25 + i * 3}
              y={y - 8}
              width={2}
              height={6}
              fill={i % 2 ? '#8d6e63' : '#a1887f'}
            />
          ))}
          {/* windsock */}
          <rect x={x + 46} y={y - 14} width={1} height={14} fill="#475569" />
          <rect x={x + 47} y={y - 14} width={2} height={2} fill="#f97316" />
          <rect x={x + 49} y={y - 14} width={2} height={2} fill="#f8fafc" />
          <rect x={x + 51} y={y - 13} width={2} height={1} fill="#f97316" />
          <WeatherStation x={x + STATION_AT[kind]} y={y} />
        </g>
      );
    case 'mesa':
      return (
        <g>
          <rect x={x - 9} y={y} width={18} height={1} fill="#fde7c7" />
          {/* ranger cabin */}
          <rect x={x - 36} y={y - 8} width={13} height={8} fill="#8b5a2b" />
          {[0, 1, 2, 3].map((r) => (
            <rect
              key={r}
              x={x - 38 + r * 2}
              y={y - 9 - r}
              width={17 - r * 4}
              height={1}
              fill="#5c3a1c"
            />
          ))}
          <rect x={x - 33} y={y - 6} width={3} height={2} fill="#fde047" />
          <rect x={x - 27} y={y - 5} width={2} height={5} fill="#3f2a17" />
          {/* cacti */}
          {[-50, 26, 40].map((dx) => (
            <g key={dx} fill="#3f8f4a">
              <rect x={x + dx} y={y - 7} width={2} height={7} />
              <rect x={x + dx - 2} y={y - 5} width={1} height={3} />
              <rect x={x + dx - 2} y={y - 3} width={2} height={1} />
              <rect x={x + dx + 3} y={y - 6} width={1} height={3} />
              <rect x={x + dx + 2} y={y - 4} width={2} height={1} />
            </g>
          ))}
          <rect x={x + 48} y={y - 2} width={4} height={2} fill="#9a5530" />
          <WeatherStation x={x + STATION_AT[kind]} y={y} />
        </g>
      );
    case 'lookout':
      return (
        <g>
          {/* the fire lookout's legs, from the hill up to its deck */}
          {[-7, 6].map((dx) => (
            <rect
              key={dx}
              x={x + dx}
              y={deck}
              width={1}
              height={y - deck}
              fill="#57534e"
            />
          ))}
          {Array.from({ length: Math.floor((y - deck) / 5) }, (_, i) => (
            <rect
              key={i}
              x={x - 7}
              y={deck + 3 + i * 5}
              width={14}
              height={1}
              fill="#78716c"
            />
          ))}
          <rect x={x - 10} y={deck} width={20} height={1} fill="#57534e" />
          <rect x={x + 2} y={deck - 7} width={8} height={7} fill="#a16207" />
          <rect x={x + 3} y={deck - 5} width={6} height={2} fill="#bae6fd" />
          <rect x={x + 1} y={deck - 8} width={10} height={1} fill="#7c2d12" />
          <WeatherStation x={x + STATION_AT[kind]} y={y} />
        </g>
      );
    case 'ridge':
      return (
        <g>
          <rect x={x - 9} y={y} width={18} height={1} fill="#e2e8f0" />
          {/* stone hut */}
          <rect x={x - 34} y={y - 7} width={12} height={7} fill="#78716c" />
          <rect x={x - 34} y={y - 5} width={12} height={1} fill="#57534e" />
          <rect x={x - 36} y={y - 8} width={16} height={1} fill="#44403c" />
          <rect x={x - 30} y={y - 4} width={2} height={4} fill="#292524" />
          {/* a line of flags between two poles */}
          <rect x={x + 26} y={y - 9} width={1} height={9} fill="#57534e" />
          <rect x={x + 44} y={y - 9} width={1} height={9} fill="#57534e" />
          {['#ef4444', '#facc15', '#22c55e', '#3b82f6', '#f8fafc'].map(
            (c, i) => (
              <rect
                key={c}
                x={x + 28 + i * 3}
                y={y - 8 + (i % 2)}
                width={2}
                height={2}
                fill={c}
              />
            ),
          )}
          <WeatherStation x={x + STATION_AT[kind]} y={y} />
        </g>
      );
  }
}

// the balloon, small in its world
const BASKET_W = 10;
const BASKET_H = 4;
const RIDER_SHOWN = 8; // rows of the half-size rider above the rim
const ROPE = 3;
const CRAFT_W = 2 * ENVELOPE_RADIUS + 4;
const CRAFT_H = BASKET_H + RIDER_SHOWN + ROPE + 2 * ENVELOPE_RADIUS + 2;
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

/** The envelope and ropes: curved gores, shining when taut, creased when slack */
function envelopeRows(radius: number, taut: boolean) {
  const p = new Painter(CRAFT_W, CRAFT_H - BASKET_H);
  const cx = CRAFT_W / 2;
  const ropeTop = CRAFT_H - BASKET_H - RIDER_SHOWN - ROPE;
  const ry = taut ? radius : radius * 1.08; // slack, it sags a little
  const cy = ropeTop - ry + 1;
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
  if (taut) p.set(cx - radius * 0.45, cy - ry * 0.45, 'W', false);
  else
    p.line(
      cx - radius * 0.3,
      cy + ry * 0.2,
      cx - radius * 0.25,
      cy + ry * 0.8,
      'f',
      false,
    );
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

// the burst envelope's peels, split open from the top like a banana's:
// [where on the cup's rim (−1 to 1), how high it arches (art px), how far out]
const PEELS: [number, number, number][] = [
  [-1, 3, 3],
  [-0.4, 6, 6],
  [0.4, 5, 6],
  [1, 3, 3],
];
const DROOP = 4; // art px the peels hang down past the rim, flopped over
const CUP = 5; // art px, the radius of the envelope's bottom, still whole

/**
 * A burst envelope, split open like a banana: the bottom still whole, and its
 * panels peeled back from the tear, curling out and over
 */
function burstRows() {
  const p = new Painter(CRAFT_W, CRAFT_H - BASKET_H);
  const cx = CRAFT_W / 2;
  const mouth = CRAFT_H - BASKET_H - RIDER_SHOWN - ROPE; // where the ropes meet it
  const rimY = mouth - CUP; // the cup's open top
  // the whole bottom: a half sphere, its gores still striped
  for (let py = rimY; py < mouth; py++)
    for (let px = Math.floor(cx - CUP); px <= cx + CUP; px++) {
      const dx = (px + 0.5 - cx) / CUP;
      const dy = (py + 0.5 - rimY) / CUP;
      if (dx * dx + dy * dy <= 1)
        p.set(px, py, Math.floor((dx + 1) * 3) % 2 ? 'n' : 'N');
    }
  // the peels: arching up and out from the rim, then flopping over to hang
  // down outside the cup, their darker inside showing once they've turned
  PEELS.forEach(([along, height, out], i) => {
    const x0 = cx + along * (CUP - 0.5);
    const side = Math.sign(along);
    const STEPS = 32;
    for (let k = 0; k <= STEPS; k++) {
      const turn = (k / STEPS) * Math.PI; // up and over
      p.set(
        x0 + (side * out * (1 - Math.cos(turn))) / 2,
        rimY - height * Math.sin(turn),
        turn > Math.PI / 2 ? 'f' : i % 2 ? 'n' : 'N',
      );
    }
    // the tip, hanging straight down
    p.line(x0 + side * out, rimY, x0 + side * out, rimY + DROOP, 'f');
  });
  // the tear, dark inside the cup
  p.line(cx - CUP + 1, rimY, cx + CUP - 1, rimY, 'f', false);
  const bx = (CRAFT_W - BASKET_W) / 2;
  p.line(
    cx - CUP * 0.7,
    mouth - 1,
    bx,
    mouth + ROPE + RIDER_SHOWN - 1,
    'T',
    false,
  );
  p.line(
    cx + CUP * 0.7,
    mouth - 1,
    bx + BASKET_W - 1,
    mouth + ROPE + RIDER_SHOWN - 1,
    'T',
    false,
  );
  return p.rows();
}

function basketRows() {
  const p = new Painter(BASKET_W + 2, BASKET_H + 1);
  p.rect(1, 0, BASKET_W, BASKET_H, 'O');
  for (let i = 1; i < BASKET_W; i += 3)
    p.rect(1 + i, 1, 1, BASKET_H - 1, 'o', false);
  return p.rows();
}

/** The view's size in art px, from the space it has on screen */
function useViewSize() {
  const frame = useRef<HTMLDivElement>(null);
  const [screenWidth, setScreenWidth] = useState(GUESSED_WIDTH); // CSS px
  // until it's measured, the gauges' places are only the server's guess
  const [measured, setMeasured] = useState(false);
  // the window's height too, so the scene fits on the screen
  const [windowHeight, setWindowHeight] = useState(900); // CSS px
  useEffect(() => {
    const resize = () => setWindowHeight(window.innerHeight);
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);
  useEffect(() => {
    const el = frame.current;
    if (!el || typeof ResizeObserver === 'undefined') {
      setMeasured(true);
      return;
    }
    const observer = new ResizeObserver(([entry]) => {
      setScreenWidth(entry.contentRect.width);
      setMeasured(true);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  const { width, height, scale } = viewSize(screenWidth, windowHeight);
  return {
    frame,
    view: { width, height },
    scale, // CSS px per art px, for placing the gauges over the art
    measured,
  };
}

// The balloon's gauges sit round it, CSS px from the middle of the craft:
// helium temperature and pressure above, its volume and amount below
const ORBIT = { x: 74, y: 36 };
const GAUGE = { width: 64, height: 56 }; // CSS px, about, with its readout
const ORBIT_AT = [
  [-1, -1],
  [1, -1],
  [-1, 1],
  [1, 1],
] as const;

const STATION_BOARD = { width: 132, height: 56 }; // CSS px: two gauges side by side
const SKY_COLUMN = 84; // CSS px kept clear at the right for the air's gauges

const clamp = (v: number, lo: number, hi: number) =>
  Math.min(Math.max(v, lo), hi);

interface Props {
  balloon: Balloon;
  flight: Flight;
  distance: number; // m along the route
  leg: Leg;
  rider?: Rider; // Mr. G, until a student's avatar takes his place
  instruments?: boolean; // the gauges, once there's a leg to fly
  children?: ReactNode; // Mr. G and the controls: in the sky when there's room
}

// the panel starts this far across, right of the balloon and its gauges,
// which the camera keeps about a third of the way in
const PANEL_FROM = 0.48;

/** One leg of the journey, side on, with the camera following the balloon */
export default function BalloonScene({
  balloon,
  flight,
  distance,
  leg,
  rider = MR_G,
  instruments = true,
  children,
}: Props) {
  const { frame, view, scale, measured } = useViewSize();
  const inSky = useMedia('(min-width: 1024px)');
  const world = worldSize(leg);
  const gas = gasInside(balloon, flight);
  // drawn against the whole envelope, even when Mr. G has tied it off smaller
  const radius = Math.round(envelopeRadius(gas.volume, BALLOON.fullVolume));
  const burst = gas.burst || !!flight.burst;
  const envelope = useMemo(
    () => (burst ? burstRows() : envelopeRows(radius, gas.taut)),
    [burst, radius, gas.taut],
  );
  const basket = useMemo(basketRows, []);
  const riderRows = halfSize(balloonOutfit(rider.rows('idle')));

  const at = { x: worldX(leg, distance), y: worldY(leg, flight.height) };
  const cam = camera(leg, view, at);
  // not snapped to whole pixels: the camera glides, so the balloon must too,
  // or it jitters against the world
  const craftX = at.x - CRAFT_W / 2;
  const craftY = at.y - CRAFT_H;
  const rimY = craftY + CRAFT_H - BASKET_H;
  const inView = (wx: number, wy: number) => ({
    left: `${((wx - cam.x) / view.width) * 100}%`,
    top: `${((wy - cam.y) / view.height) * 100}%`,
  });

  const clouds = useMemo(
    () =>
      Array.from({ length: Math.ceil(world.width / 70) }, (_, i) => ({
        x: Math.round(hash(i + 3) * world.width),
        // up in the sky, above the places, not drifting through them
        y: Math.round(
          8 +
            hash(i + 5) *
              (worldY(leg, Math.max(leg.from.height, leg.to.height) + 120) - 8),
        ),
        w: 12 + Math.round(hash(i + 9) * 16),
      })),
    [leg, world.width],
  );
  // where each place's signpost stands: on its ground, off to one side
  const sign = (p: Platform) => ({
    x: Math.round(worldX(leg, p.distance + SIGN_OFFSET)),
    y: Math.round(worldY(leg, groundAt(leg, p.distance + SIGN_OFFSET))),
  });

  const places = [leg.from, leg.to];

  // the scene in CSS px, for the gauges laid over it
  const screen = { width: view.width * scale, height: view.height * scale };
  const toScreen = (wx: number, wy: number) => ({
    x: (wx - cam.x) * scale,
    y: (wy - cam.y) * scale,
  });
  const craft = toScreen(at.x, craftY + CRAFT_H / 2);
  const own = balloonDevices(balloon, flight).map((device, i) => {
    const [sx, sy] = ORBIT_AT[i];
    const x = clamp(
      craft.x + sx * ORBIT.x,
      GAUGE.width / 2 + 4,
      screen.width - GAUGE.width / 2 - 4,
    );
    const y = clamp(
      craft.y + sy * ORBIT.y,
      GAUGE.height / 2 + 4,
      screen.height - GAUGE.height / 2 - 4,
    );
    return { device, x, y };
  });
  // a card opening up or down is nudged back inside the scene's edges
  const cardShift = (x: number) =>
    clamp(0, CARD_WIDTH / 2 + 4 - x, screen.width - 4 - CARD_WIDTH / 2 - x);

  // the next stop's weather station, read on the station once it's in view
  const next = leg.to;
  const station = toScreen(
    worldX(leg, next.distance) + STATION_AT[next.kind] + 3,
    worldY(leg, next.height - STRUCTURE[next.kind]) - 12,
  );
  // a level leg's station would only repeat the air gauges
  const hasStation = next.height !== leg.from.height;
  const stationInView =
    hasStation && station.x > 40 && station.x < screen.width - 40;
  // its readouts hang above it, or step aside on a tether when the balloon's
  // gauges are in the way, as you arrive
  const ring = {
    left: craft.x - ORBIT.x - GAUGE.width / 2,
    right: craft.x + ORBIT.x + GAUGE.width / 2,
    top: craft.y - ORBIT.y - GAUGE.height / 2,
    bottom: craft.y + ORBIT.y + GAUGE.height / 2,
  };
  const half = STATION_BOARD.width / 2;
  const blocked =
    station.x + half > ring.left &&
    station.x - half < ring.right &&
    station.y > ring.top &&
    station.y - STATION_BOARD.height < ring.bottom;
  // beside the ring if there's room, else below it, on the cliff face
  const besideRight = ring.right + 8 + half;
  const besideLeft = ring.left - 8 - half;
  const board = !blocked
    ? station
    : besideRight + half < screen.width - SKY_COLUMN
      ? { x: besideRight, y: station.y }
      : besideLeft - half > 4
        ? { x: besideLeft, y: station.y }
        : {
            x: clamp(station.x, half + 4, screen.width - SKY_COLUMN - half),
            y: Math.min(
              ring.bottom + 8 + STATION_BOARD.height,
              screen.height - 4,
            ),
          };

  const scene = (
    <div ref={frame} className="relative w-full overflow-hidden pixel-control">
      <svg
        viewBox={`${cam.x} ${cam.y} ${view.width} ${view.height}`}
        shapeRendering="crispEdges"
        className="block h-auto w-full"
        aria-hidden="true"
      >
        {SKY.map((c, i) => (
          <rect
            key={c}
            x={0}
            // whole pixels, so server and browser round them alike
            y={Math.round((world.height * i) / SKY.length)}
            width={world.width}
            height={Math.ceil(world.height / SKY.length) + 1}
            fill={c}
          />
        ))}
        <g
          transform={`translate(${cam.x * PARALLAX} ${cam.y * PARALLAX * 0.5})`}
        >
          <FarHills leg={leg} width={world.width} />
        </g>
        {clouds.map((c, i) => (
          <Cloud key={i} {...c} />
        ))}
        <Birds leg={leg} width={world.width} />
        <Terrain leg={leg} width={world.width} height={world.height} />
        <Countryside leg={leg} width={world.width} />
        {places.map((p) => {
          const ground = Math.round(worldY(leg, p.height - STRUCTURE[p.kind]));
          return (
            <AreaProps
              key={p.name}
              kind={p.kind}
              x={Math.round(worldX(leg, p.distance))}
              y={ground}
              deck={Math.round(worldY(leg, p.height))}
            />
          );
        })}
        {places.map((p) => (
          <rect
            key={p.name}
            x={sign(p).x}
            y={sign(p).y - SIGN_POST}
            width={1}
            height={SIGN_POST}
            fill="#5c3a1c"
          />
        ))}
      </svg>

      {/* the balloon: envelope and ropes, the rider, then the basket over their legs */}
      <svg
        viewBox={`${cam.x} ${cam.y} ${view.width} ${view.height}`}
        className="pointer-events-none absolute inset-0 h-full w-full"
        role="img"
        aria-label={`${rider.name} in the balloon’s basket, at ${fmt(Math.round(flight.height))} m${burst ? ': the envelope’s burst' : ''}`}
      >
        <g transform={`translate(${craftX} ${craftY})`}>
          <PixelArt rows={envelope} palette={CRAFT_PALETTE} scale={1 / 4} />
        </g>
        <g
          transform={`translate(${craftX + (CRAFT_W - riderRows[0].length) / 2} ${rimY - RIDER_SHOWN})`}
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

      {/* each place's signboard, on its post: its name and height */}
      {places.map((p) => (
        <div
          key={p.name}
          role="group"
          aria-label={p.name}
          className="absolute -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-sm border border-amber-900 bg-amber-100 px-1.5 py-0.5 font-sans text-[10px] leading-tight text-amber-950 shadow sm:text-xs"
          style={inView(sign(p).x, sign(p).y - SIGN_POST)}
        >
          <span className="font-semibold">{p.name}</span>{' '}
          <span>{fmt(p.height)} m</span>
        </div>
      ))}

      {/* under the gauges, so they're never hidden behind it */}
      <ul
        aria-label="Height"
        className="pointer-events-none absolute inset-y-0 left-0 w-12 bg-gradient-to-r from-sky-100/70 to-transparent font-sans text-[10px] text-slate-800 sm:text-[11px]"
      >
        {rulerMarks(leg, { y: cam.y, height: view.height }).map((m) => (
          <li
            key={m.height}
            className="absolute left-1.5 -translate-y-1/2 whitespace-nowrap border-b border-slate-700/60 leading-none"
            style={{ top: `${((m.y - cam.y) / view.height) * 100}%` }}
          >
            {fmt(m.height)} m
          </li>
        ))}
      </ul>

      {/* the balloon's own gauges, tethered to it */}
      {instruments && (
        <div className={measured ? undefined : 'invisible'}>
          <svg
            className="pointer-events-none absolute inset-0 h-full w-full"
            aria-hidden="true"
          >
            {own.map(({ device, x, y }) => (
              <line
                key={device.name}
                x1={craft.x}
                y1={craft.y}
                x2={x}
                y2={y}
                stroke="#fff7d6"
                strokeOpacity={0.7}
                strokeWidth={1}
                strokeDasharray="3 3"
              />
            ))}
            {stationInView && blocked && (
              <line
                x1={station.x}
                y1={station.y + 10}
                x2={board.x}
                y2={board.y - STATION_BOARD.height / 2}
                stroke="#f8fafc"
                strokeOpacity={0.7}
                strokeDasharray="3 3"
              />
            )}
          </svg>
          <div role="group" aria-label="The balloon">
            {own.map(({ device, x, y }) => (
              <div
                key={device.name}
                className="absolute -translate-x-1/2 -translate-y-1/2 has-[[aria-expanded=true]]:z-30"
                style={{ left: x, top: y }}
              >
                <Gauge
                  device={device}
                  opens={y < screen.height / 2 ? 'down' : 'up'}
                  shift={cardShift(x)}
                />
              </div>
            ))}
          </div>

          {stationInView && (
            <div
              role="group"
              aria-label={`${next.name} weather station`}
              className="absolute flex -translate-x-1/2 -translate-y-full gap-1 has-[[aria-expanded=true]]:z-30"
              style={{ left: board.x, top: board.y }}
            >
              {stationDevices(next).map((device) => (
                <Gauge
                  key={device.name}
                  device={device}
                  opens="up"
                  shift={cardShift(board.x)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* the sky's instruments, apart from the balloon's, and below them the
          next stop's station, radioing its readings while it's out of sight */}
      {instruments && (
        <div className="absolute top-1.5 right-1.5 flex flex-col items-stretch gap-1.5 has-[[aria-expanded=true]]:z-30 sm:top-2 sm:right-2">
          <div
            role="group"
            aria-label="The air here"
            className="flex flex-col items-center gap-1 rounded-sm bg-primary-800/40 p-1 sm:gap-2 sm:p-1.5"
          >
            {airDevices(balloon, flight).map((device) => (
              <Gauge key={device.name} device={device} opens="left" />
            ))}
          </div>
          {hasStation && !stationInView && (
            <div
              role="group"
              aria-label={`${next.name} weather station, by radio`}
              className="flex flex-col items-center gap-1 rounded-sm bg-primary-800/40 p-1 sm:gap-2 sm:p-1.5"
            >
              <span className="max-w-16 text-center font-sans text-[10px] leading-tight text-white sm:max-w-20 sm:text-xs">
                {next.name} ›
              </span>
              {stationDevices(next).map((device) => (
                <Gauge key={device.name} device={device} opens="left" />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Mr. G and the controls, up in the sky right of the balloon */}
      {children && inSky && (
        <div
          className="absolute top-2 z-20 flex flex-col gap-3 has-[[aria-expanded=true]]:z-40"
          style={{
            left: screen.width * PANEL_FROM,
            right: instruments ? SKY_COLUMN + 8 : 8,
          }}
        >
          {children}
        </div>
      )}
    </div>
  );
  // narrower, there's no room in the sky: it goes underneath. Always the same
  // wrapper, so switching doesn't remount the frame its size is measured from
  return (
    <div className="flex flex-col gap-4">
      {scene}
      {!inSky && children}
    </div>
  );
}
