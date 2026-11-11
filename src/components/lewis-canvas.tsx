import {
  forwardRef,
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
} from 'react';
import {
  type CurvedArrow,
  electronCount,
  isOpenEnd,
  formalCharge,
  ionCharge,
  octetStatus,
  type LewisAtom,
  type LewisBond,
  type LewisStructure,
} from '~/utils/lewis';
import { bondAngles, lonePairSlots, toPoint } from '~/utils/lewis-layout';
import type { Target } from '~/utils/lewis-tools';
import { cn } from '~/utils/cn';

// Drawing sizes, in px at a bond length of SCALE
const SCALE = 64;
const PADDING = 44;
const BRACKET_MARGIN = 34; // brackets sit this far outside the outermost atoms
const BRACKET_SERIF = 8; // length of a bracket's top and bottom strokes
const ATOM_RADIUS = 13; // bonds stop this far from an atom's centre
const MAX_TRIM_SHARE = 0.3; // ...but never trim more than this share of a short bond
const OPEN_END_RADIUS = 4;
const HIT_RADIUS = 18; // big enough to tap on a phone, small enough not to swallow neighbours
const LABEL_RADIUS = 11; // white disc behind a symbol, so bonds don't run through it
const PAIR_DISTANCE = 20; // lone pair from the atom's centre
const PAIR_GAP = 3.5; // half the space between a pair's two dots
const DOT_RADIUS = 2;
const BOND_GAP = 4; // between the lines of a double or triple bond

const ORDER_NAME = { 1: 'single', 2: 'double', 3: 'triple' } as const;

interface Props {
  structure: LewisStructure;
  onTap: (target: Target) => void;
  onPress: (target: Target, e: PointerEvent) => void; // may start a drag
  problems?: Map<number, string[]>; // atoms the last check flagged, with what's wrong
  bars?: boolean; // draw lone pairs as bars instead of dots
  hints?: boolean; // electron counts and formal charges on each atom
  showCharges?: boolean; // formal charges only mean something once every electron is placed
  preview?: { from: number; to: { x: number; y: number } } | null; // bond being drawn
  pending?: Target | null; // first tap of a two-tap curved arrow
  cursor?: string; // CSS cursor showing the active tool
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

const signed = (n: number) => (n > 0 ? `+${n}` : String(n));

function atomLabel(
  s: LewisStructure,
  atom: LewisAtom,
  hints: boolean,
  problems: string[] = [],
) {
  const parts = [plural(atom.lonePairs, 'lone pair')];
  if (atom.radicals) parts.push(plural(atom.radicals, 'unpaired electron'));
  if (hints) {
    parts.push(plural(electronCount(s, atom.id), 'electron'));
    parts.push(`formal charge ${signed(formalCharge(s, atom.id))}`);
  }
  const problem = problems.length ? `. Problem: ${problems.join(' ')}` : '';
  return `${atom.symbol} atom: ${parts.join(', ')}${problem}`;
}

const TOOLTIP_WIDTH = 200; // px
const TOOLTIP_LINE = 13; // px between lines
const TOOLTIP_CHARS = 36; // characters per line at the tooltip's font size

// Splits messages into lines short enough for the tooltip
function wrap(messages: string[]) {
  return messages.flatMap((message) => {
    const lines: string[] = [];
    let line = '';
    for (const word of message.split(' ')) {
      if (line && (line + ' ' + word).length > TOOLTIP_CHARS) {
        lines.push(line);
        line = word;
      } else {
        line = line ? `${line} ${word}` : word;
      }
    }
    return line ? [...lines, line] : lines;
  });
}

/** What's wrong with an atom, in a box above it */
function ProblemTooltip({
  atom,
  messages,
}: {
  atom: LewisAtom;
  messages: string[];
}) {
  const lines = wrap(messages);
  const height = lines.length * TOOLTIP_LINE + 12;
  const x = atom.x * SCALE - TOOLTIP_WIDTH / 2;
  const y = atom.y * SCALE - HIT_RADIUS - 8 - height;
  return (
    <g role="tooltip" className="pointer-events-none">
      <rect
        x={x}
        y={y}
        width={TOOLTIP_WIDTH}
        height={height}
        rx={6}
        fill="#111827"
      />
      <text x={x + 8} y={y + 6} className="text-[11px]" fill="white">
        {lines.map((line, i) => (
          <tspan key={i} x={x + 8} dy={TOOLTIP_LINE}>
            {/* keep the space at each break, so the text still reads as one */}
            {i < lines.length - 1 ? `${line} ` : line}
          </tspan>
        ))}
      </text>
    </g>
  );
}

const PROBLEM_RING = 3; // px outside the symbol's disc

/**
 * Radius of the white disc behind an atom's symbol: no wider than where its
 * shortest bond's line begins, so close atoms still look connected.
 */
function labelRadius(s: LewisStructure, atom: LewisAtom) {
  const lengths = s.bonds.flatMap((b) => {
    const other = b.a === atom.id ? b.b : b.b === atom.id ? b.a : null;
    const o = s.atoms.find((a) => a.id === other);
    return o ? [Math.hypot(o.x - atom.x, o.y - atom.y) * SCALE] : [];
  });
  return Math.min(LABEL_RADIUS, ...lengths.map((d) => d * MAX_TRIM_SHARE));
}

/** The atom, bond, lone pair or empty canvas an element belongs to. */
export function targetOf(el: Element | null): Target | null {
  const hit = el?.closest(
    '[data-pair],[data-mark],[data-arrow],[data-atom],[data-bond],[data-bracket],[data-canvas]',
  );
  if (!hit) return null;
  const { pair, mark, arrow, atom, bond, bracket } = (
    hit as HTMLElement | SVGElement
  ).dataset;
  if (pair !== undefined) return { kind: 'lonePair', atom: Number(pair) };
  if (mark !== undefined) return { kind: 'mark', atom: Number(mark) };
  if (bracket !== undefined) return { kind: 'bracket' };
  if (arrow !== undefined) return { kind: 'arrow', index: Number(arrow) };
  if (atom !== undefined) return { kind: 'atom', id: Number(atom) };
  if (bond !== undefined) {
    const [a, b] = bond.split('-').map(Number);
    return { kind: 'bond', a, b };
  }
  return { kind: 'canvas', x: 0, y: 0 };
}

/** A screen point in the drawing's units (bond lengths); null if not laid out. */
export function pointIn(svg: SVGSVGElement, clientX: number, clientY: number) {
  const rect = svg.getBoundingClientRect();
  if (!rect.width || !rect.height) return null;
  // the drawing's origin is the panel's centre, scaled by the current zoom
  const zoom = Number(svg.dataset.zoom ?? 1);
  return {
    x: (clientX - rect.left - rect.width / 2) / zoom / SCALE,
    y: (clientY - rect.top - rect.height / 2) / zoom / SCALE,
  };
}

function interactive(
  target: Target,
  onTap: Props['onTap'],
  onPress: Props['onPress'],
) {
  return {
    tabIndex: 0,
    role: 'button',
    onClick: (e: MouseEvent) => {
      e.stopPropagation();
      onTap(target);
    },
    onKeyDown: (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        e.stopPropagation();
        onTap(target);
      }
    },
    onPointerDown: (e: PointerEvent) => {
      e.stopPropagation();
      onPress(target, e);
    },
  };
}

function Bond({
  bond,
  atoms,
  onTap,
  onPress,
}: {
  bond: LewisBond;
  atoms: Map<number, LewisAtom>;
  onTap: Props['onTap'];
  onPress: Props['onPress'];
}) {
  const a = atoms.get(bond.a)!;
  const b = atoms.get(bond.b)!;
  const [ax, ay, bx, by] = [a.x, a.y, b.x, b.y].map((v) => v * SCALE);
  const length = Math.hypot(bx - ax, by - ay) || 1;
  const [ux, uy] = [(bx - ax) / length, (by - ay) / length];
  // perpendicular, for the parallel lines of multiple bonds
  const [px, py] = [-uy, ux];
  const offsets = { 1: [0], 2: [-1, 1], 3: [-2, 0, 2] }[bond.order];
  // stop short of an atom's symbol, but run right up to an open end; short
  // bonds trim less, so atoms that sit close together still look connected
  const trim = (atom: LewisAtom) =>
    isOpenEnd(atom) ? 0 : Math.min(ATOM_RADIUS, length * MAX_TRIM_SHARE);
  const start = { x: ax + ux * trim(a), y: ay + uy * trim(a) };
  const end = { x: bx - ux * trim(b), y: by - uy * trim(b) };
  const name = (atom: LewisAtom) => atom.symbol || 'open end';

  return (
    <g
      data-bond={`${bond.a}-${bond.b}`}
      aria-label={`${name(a)}–${name(b)} ${ORDER_NAME[bond.order]} bond`}
      className="outline-none focus-visible:[&>.hit]:stroke-sky-300"
      {...interactive({ kind: 'bond', a: bond.a, b: bond.b }, onTap, onPress)}
    >
      <line
        className="hit"
        x1={start.x}
        y1={start.y}
        x2={end.x}
        y2={end.y}
        stroke="transparent"
        strokeWidth={18}
        strokeLinecap="round"
      />
      {offsets.map((o) => (
        <line
          key={o}
          x1={start.x + px * o * BOND_GAP}
          y1={start.y + py * o * BOND_GAP}
          x2={end.x + px * o * BOND_GAP}
          y2={end.y + py * o * BOND_GAP}
          stroke="currentColor"
          strokeWidth={2}
        />
      ))}
    </g>
  );
}

/** Lone pairs (each its own target) and unpaired electrons around an atom */
/** Where each lone pair (then unpaired electron) sits around an atom, in px */
function electronSpots(structure: LewisStructure, atom: LewisAtom) {
  return lonePairSlots(
    bondAngles(structure, atom.id),
    atom.lonePairs + atom.radicals,
  ).map((angle) => {
    const dir = toPoint(angle);
    return {
      dir,
      x: atom.x * SCALE + dir.x * PAIR_DISTANCE,
      y: atom.y * SCALE + dir.y * PAIR_DISTANCE,
    };
  });
}

function Electrons({
  structure,
  atom,
  bars,
  onTap,
  onPress,
}: {
  structure: LewisStructure;
  atom: LewisAtom;
  bars: boolean;
  onTap: Props['onTap'];
  onPress: Props['onPress'];
}) {
  return (
    <>
      {electronSpots(structure, atom).map(({ dir, x, y }, i) => {
        // a pair's dots (or bar) run across the direction it points
        const [px, py] = [-dir.y, dir.x];

        if (i >= atom.lonePairs) {
          return (
            <circle key={i} cx={x} cy={y} r={DOT_RADIUS} fill="currentColor" />
          );
        }
        return (
          <g
            key={i}
            data-pair={atom.id}
            aria-label={`Lone pair on ${atom.symbol}`}
            className="outline-none focus-visible:[&>.hit]:fill-sky-200"
            {...interactive(
              { kind: 'lonePair', atom: atom.id },
              onTap,
              onPress,
            )}
          >
            <circle className="hit" cx={x} cy={y} r={8} fill="transparent" />
            {bars ? (
              <line
                x1={x - px * (PAIR_GAP + DOT_RADIUS)}
                y1={y - py * (PAIR_GAP + DOT_RADIUS)}
                x2={x + px * (PAIR_GAP + DOT_RADIUS)}
                y2={y + py * (PAIR_GAP + DOT_RADIUS)}
                stroke="currentColor"
                strokeWidth={2}
              />
            ) : (
              [-1, 1].map((side) => (
                <circle
                  key={side}
                  cx={x + px * PAIR_GAP * side}
                  cy={y + py * PAIR_GAP * side}
                  r={DOT_RADIUS}
                  fill="currentColor"
                />
              ))
            )}
          </g>
        );
      })}
    </>
  );
}

function Badges({
  structure,
  atom,
  showCharge,
}: {
  structure: LewisStructure;
  atom: LewisAtom;
  showCharge: boolean;
}) {
  const { electrons, ok } = octetStatus(structure, atom.id);
  const charge = formalCharge(structure, atom.id);
  const cx = atom.x * SCALE;
  const cy = atom.y * SCALE;

  return (
    <g
      aria-hidden="true"
      className="text-[9px] font-semibold pointer-events-none"
    >
      <text
        x={cx + 15}
        y={cy + 26}
        className={ok ? 'fill-green-700' : 'fill-red-600'}
      >
        {ok ? '✓' : '!'} {electrons}
      </text>
      {showCharge && charge !== 0 && (
        <text x={cx - 30} y={cy + 26} className="fill-sky-700">
          {charge > 0 ? `+${charge}` : `−${-charge}`}
        </text>
      )}
    </g>
  );
}

/** The charge and δ marks a student wrote on an atom */
function Marks({
  atom,
  onTap,
  onPress,
}: {
  atom: LewisAtom;
  onTap: Props['onTap'];
  onPress: Props['onPress'];
}) {
  const { charge, partial } = atom.marks ?? {};
  if (!charge && !partial) return null;
  const cx = atom.x * SCALE;
  const cy = atom.y * SCALE;
  const parts = [
    ...(charge ? [`charge ${ionCharge(charge)}`] : []),
    ...(partial ? [`δ${partial === '+' ? '+' : '−'}`] : []),
  ];

  return (
    <g
      data-mark={atom.id}
      aria-label={`Marks on ${atom.symbol}: ${parts.join(', ')}`}
      className="outline-none text-[11px] font-semibold focus-visible:[&_text]:fill-sky-600"
      {...interactive({ kind: 'mark', atom: atom.id }, onTap, onPress)}
    >
      {charge ? (
        <text x={cx + 11} y={cy - 12} className="fill-current">
          {ionCharge(charge)}
        </text>
      ) : null}
      {partial && (
        <text x={cx - 11} y={cy - 12} textAnchor="end" className="fill-current">
          δ{partial === '+' ? '+' : '−'}
        </text>
      )}
    </g>
  );
}

/** Square brackets round the whole structure, with the ion's overall charge */
function Brackets({
  charge,
  box,
  onTap,
  onPress,
}: {
  charge: number;
  box: { left: number; top: number; right: number; bottom: number };
  onTap: Props['onTap'];
  onPress: Props['onPress'];
}) {
  const { left, top, right, bottom } = box;
  const side = (x: number, dir: 1 | -1) =>
    `M ${x + dir * BRACKET_SERIF} ${top} H ${x} V ${bottom} H ${x + dir * BRACKET_SERIF}`;

  return (
    <g
      data-bracket=""
      aria-label={`Ion brackets, charge ${charge ? ionCharge(charge) : 'none'}`}
      className="outline-none focus-visible:[&>path]:stroke-sky-500"
      {...interactive({ kind: 'bracket' }, onTap, onPress)}
    >
      {[side(left, 1), side(right, -1)].map((d) => (
        <g key={d}>
          <path d={d} fill="none" stroke="transparent" strokeWidth={14} />
          <path d={d} fill="none" stroke="currentColor" strokeWidth={2} />
        </g>
      ))}
      {charge !== 0 && (
        <text
          x={right + 4}
          y={top + 6}
          className="fill-current text-xs font-semibold"
        >
          {ionCharge(charge)}
        </text>
      )}
    </g>
  );
}

type Point = { x: number; y: number };

const ARROW_BULGE = 0.6; // how far a curved arrow bows out, as a share of its length
const ARROW_MIN_BULGE = 22;
const ARROW_HEAD = 7;

/** Where an arrow end sits on the drawing, in px */
function endPoint(
  structure: LewisStructure,
  end: CurvedArrow['from'] | CurvedArrow['to'],
  toward: Point | null,
): Point {
  const atom = (id: number) => structure.atoms.find((a) => a.id === id)!;
  if (end.kind === 'bond') {
    const [a, b] = [atom(end.a), atom(end.b)];
    return { x: ((a.x + b.x) / 2) * SCALE, y: ((a.y + b.y) / 2) * SCALE };
  }
  if (end.kind === 'lonePair') {
    // start from the atom's lone pair nearest where the electrons go
    const a = atom(end.atom);
    const spots = electronSpots(structure, a).slice(0, a.lonePairs);
    if (!spots.length) return { x: a.x * SCALE, y: a.y * SCALE };
    if (!toward) return spots[0];
    return spots.reduce((best, p) =>
      Math.hypot(p.x - toward.x, p.y - toward.y) <
      Math.hypot(best.x - toward.x, best.y - toward.y)
        ? p
        : best,
    );
  }
  // arrows to an atom stop just short of its symbol
  const a = atom(end.id);
  const centre = { x: a.x * SCALE, y: a.y * SCALE };
  if (!toward) return centre;
  const d = Math.hypot(toward.x - centre.x, toward.y - centre.y) || 1;
  return {
    x: centre.x + ((toward.x - centre.x) / d) * PAIR_DISTANCE,
    y: centre.y + ((toward.y - centre.y) / d) * PAIR_DISTANCE,
  };
}

function describeEnd(
  structure: LewisStructure,
  end: CurvedArrow['from'] | CurvedArrow['to'],
) {
  const symbol = (id: number) =>
    structure.atoms.find((a) => a.id === id)?.symbol ?? '?';
  if (end.kind === 'bond') return `${symbol(end.a)}–${symbol(end.b)} bond`;
  if (end.kind === 'lonePair') return `lone pair on ${symbol(end.atom)}`;
  return symbol(end.id);
}

/** A curved electron-pushing arrow, bowing away from the molecule's centre */
function Arrow({
  structure,
  arrow,
  index,
  onTap,
  onPress,
}: {
  structure: LewisStructure;
  arrow: CurvedArrow;
  index: number;
  onTap: Props['onTap'];
  onPress: Props['onPress'];
}) {
  const centre = {
    x:
      (structure.atoms.reduce((s, a) => s + a.x, 0) / structure.atoms.length) *
      SCALE,
    y:
      (structure.atoms.reduce((s, a) => s + a.y, 0) / structure.atoms.length) *
      SCALE,
  };
  let start: Point;
  let end: Point;
  const { from, to } = arrow;
  if (
    from.kind === 'bond' &&
    to.kind === 'atom' &&
    (to.id === from.a || to.id === from.b)
  ) {
    // a bond breaking onto one of its atoms: arc from the bond to the outer
    // side of that atom, where the new lone pair will sit
    const atom = structure.atoms.find((a) => a.id === to.id)!;
    const other = structure.atoms.find(
      (a) => a.id === (to.id === from.a ? from.b : from.a),
    )!;
    const bondMid = endPoint(structure, from, null);
    const ux = other.x - atom.x;
    const uy = other.y - atom.y;
    const u = Math.hypot(ux, uy) || 1;
    let side = { x: -uy / u, y: ux / u };
    if (side.x * (bondMid.x - centre.x) + side.y * (bondMid.y - centre.y) < 0) {
      side = { x: -side.x, y: -side.y };
    }
    start = { x: bondMid.x + side.x * 6, y: bondMid.y + side.y * 6 };
    end = {
      x: atom.x * SCALE + side.x * PAIR_DISTANCE - (ux / u) * 4,
      y: atom.y * SCALE + side.y * PAIR_DISTANCE - (uy / u) * 4,
    };
  } else {
    const roughEnd = endPoint(structure, to, null);
    start = endPoint(structure, from, roughEnd);
    end = endPoint(structure, to, start);
  }
  const mid = { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 };
  const length = Math.hypot(end.x - start.x, end.y - start.y) || 1;
  let normal = {
    x: -(end.y - start.y) / length,
    y: (end.x - start.x) / length,
  };
  if (normal.x * (mid.x - centre.x) + normal.y * (mid.y - centre.y) < 0) {
    normal = { x: -normal.x, y: -normal.y };
  }
  const bulge = Math.max(ARROW_MIN_BULGE, length * ARROW_BULGE);
  const control = { x: mid.x + normal.x * bulge, y: mid.y + normal.y * bulge };
  // the head points along the curve's final direction
  const tx = end.x - control.x;
  const ty = end.y - control.y;
  const t = Math.hypot(tx, ty) || 1;
  const [ux, uy] = [tx / t, ty / t];
  const head = [
    end,
    {
      x: end.x - ux * ARROW_HEAD - uy * ARROW_HEAD * 0.5,
      y: end.y - uy * ARROW_HEAD + ux * ARROW_HEAD * 0.5,
    },
    {
      x: end.x - ux * ARROW_HEAD + uy * ARROW_HEAD * 0.5,
      y: end.y - uy * ARROW_HEAD - ux * ARROW_HEAD * 0.5,
    },
  ];
  const d = `M ${start.x} ${start.y} Q ${control.x} ${control.y} ${end.x} ${end.y}`;

  return (
    <g
      data-arrow={index}
      aria-label={`Curved arrow from ${describeEnd(structure, arrow.from)} to ${describeEnd(structure, arrow.to)}`}
      className="outline-none text-rose-600 focus-visible:[&>.hit]:stroke-sky-200"
      {...interactive({ kind: 'arrow', index }, onTap, onPress)}
    >
      <path
        className="hit"
        d={d}
        fill="none"
        stroke="transparent"
        strokeWidth={12}
      />
      <path d={d} fill="none" stroke="currentColor" strokeWidth={1.6} />
      <polygon
        points={head.map((p) => `${p.x},${p.y}`).join(' ')}
        fill="currentColor"
      />
    </g>
  );
}

const LewisCanvas = forwardRef<SVGSVGElement, Props>(function LewisCanvas(
  {
    structure,
    onTap,
    onPress,
    problems,
    bars = false,
    hints = true,
    showCharges = true,
    preview,
    pending,
    cursor,
  },
  ref,
) {
  // the problem atom under the pointer or keyboard focus
  const [inspected, setInspected] = useState<number | null>(null);
  const inspect = (id: number) => ({
    onPointerEnter: () => setInspected(id),
    onPointerLeave: () => setInspected(null),
    onFocus: () => setInspected(id),
    onBlur: () => setInspected(null),
  });
  const inspectedAtom = structure.atoms.find((a) => a.id === inspected);
  const inspectedProblems =
    inspected === null ? undefined : problems?.get(inspected);

  // the drawing panel's size, so one bond length is always the same on screen
  const [size, setSize] = useState<{ width: number; height: number } | null>(
    null,
  );
  const svg = useRef<SVGSVGElement | null>(null);
  const setRefs = useCallback(
    (el: SVGSVGElement | null) => {
      svg.current = el;
      if (typeof ref === 'function') ref(el);
      else if (ref) ref.current = el;
    },
    [ref],
  );
  useEffect(() => {
    const el = svg.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      if (width && height) setSize({ width, height });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const atoms = new Map(structure.atoms.map((a) => [a.id, a]));
  const xs = structure.atoms.map((a) => a.x * SCALE);
  const ys = structure.atoms.map((a) => a.y * SCALE);
  const bracketBox = structure.atoms.length
    ? {
        left: Math.min(...xs) - BRACKET_MARGIN,
        top: Math.min(...ys) - BRACKET_MARGIN,
        right: Math.max(...xs) + BRACKET_MARGIN,
        bottom: Math.max(...ys) + BRACKET_MARGIN,
      }
    : { left: -60, top: -30, right: 60, bottom: 30 };
  // The drawing's origin sits at the panel's centre at a fixed scale, so
  // adding atoms never shifts the picture. It only zooms out when the drawing
  // outgrows the panel. Leave room for brackets and their charge.
  const pad = structure.bracket ? BRACKET_MARGIN + 24 : PADDING;
  const reachX = Math.max(0, ...xs.map(Math.abs)) + pad;
  const reachY = Math.max(0, ...ys.map(Math.abs)) + pad;
  const zoom = size
    ? Math.min(1, size.width / 2 / reachX, size.height / 2 / reachY)
    : 1;
  const from = preview && atoms.get(preview.from);
  const pendingSpot =
    pending?.kind === 'bond'
      ? endPoint(structure, { kind: 'bond', a: pending.a, b: pending.b }, null)
      : pending?.kind === 'lonePair'
        ? endPoint(structure, { kind: 'lonePair', atom: pending.atom }, null)
        : null;

  return (
    <svg
      ref={setRefs}
      role="group"
      aria-label="Lewis structure"
      data-canvas=""
      data-zoom={zoom}
      width="100%"
      height="100%"
      style={{ cursor }}
      className="block text-gray-900 select-none touch-none"
      onClick={(e) => {
        const point = pointIn(e.currentTarget, e.clientX, e.clientY);
        // NaN tells the page the point is unknown, so it picks a free spot
        onTap({ kind: 'canvas', x: point?.x ?? NaN, y: point?.y ?? NaN });
      }}
    >
      {/* origin at the panel's centre; plain pixels inside */}
      <svg x="50%" y="50%" overflow="visible">
        <g transform={`scale(${zoom})`}>
          {!structure.atoms.length && (
            <text
              x={0}
              y={0}
              textAnchor="middle"
              className="fill-gray-400 text-sm pointer-events-none"
            >
              Click anywhere to place the selected atom
            </text>
          )}

          {structure.bracket && (
            <Brackets
              charge={structure.bracket.charge}
              box={bracketBox}
              onTap={onTap}
              onPress={onPress}
            />
          )}

          {structure.bonds.map((bond) => (
            <Bond
              key={`${bond.a}-${bond.b}`}
              bond={bond}
              atoms={atoms}
              onTap={onTap}
              onPress={onPress}
            />
          ))}

          {pendingSpot && (
            <circle
              cx={pendingSpot.x}
              cy={pendingSpot.y}
              r={9}
              className="fill-sky-200/70 stroke-sky-500 pointer-events-none"
            />
          )}

          {from && preview && (
            <line
              x1={from.x * SCALE}
              y1={from.y * SCALE}
              x2={preview.to.x * SCALE}
              y2={preview.to.y * SCALE}
              stroke="#0284c7"
              strokeWidth={2}
              strokeDasharray="4 3"
              className="pointer-events-none"
            />
          )}

          {structure.atoms.map((atom) =>
            isOpenEnd(atom) ? (
              <g
                key={atom.id}
                data-atom={atom.id}
                aria-label={
                  problems?.has(atom.id)
                    ? `Open bond end. Problem: ${problems.get(atom.id)!.join(' ')}`
                    : 'Open bond end'
                }
                className="outline-none focus-visible:[&>.mark]:stroke-sky-500"
                {...interactive({ kind: 'atom', id: atom.id }, onTap, onPress)}
                {...inspect(atom.id)}
              >
                <circle
                  className="hit"
                  cx={atom.x * SCALE}
                  cy={atom.y * SCALE}
                  r={HIT_RADIUS}
                  fill="transparent"
                />
                <circle
                  className={cn(
                    'mark',
                    problems?.has(atom.id)
                      ? 'stroke-red-500'
                      : 'stroke-gray-400',
                  )}
                  cx={atom.x * SCALE}
                  cy={atom.y * SCALE}
                  r={OPEN_END_RADIUS}
                  fill="white"
                  strokeWidth={1.5}
                />
                {problems?.has(atom.id) && (
                  <circle
                    className="problem-ring pointer-events-none"
                    cx={atom.x * SCALE}
                    cy={atom.y * SCALE}
                    r={OPEN_END_RADIUS + PROBLEM_RING}
                    fill="none"
                    stroke="#ef4444"
                    strokeWidth={2}
                  />
                )}
              </g>
            ) : (
              <g key={atom.id}>
                <g
                  data-atom={atom.id}
                  aria-label={atomLabel(
                    structure,
                    atom,
                    hints,
                    problems?.get(atom.id),
                  )}
                  className="outline-none focus-visible:[&>.hit]:stroke-sky-400"
                  {...interactive(
                    { kind: 'atom', id: atom.id },
                    onTap,
                    onPress,
                  )}
                  {...inspect(atom.id)}
                >
                  {problems?.has(atom.id) && (
                    <circle
                      className="problem-ring pointer-events-none"
                      cx={atom.x * SCALE}
                      cy={atom.y * SCALE}
                      r={labelRadius(structure, atom) + PROBLEM_RING}
                      fill="none"
                      stroke="#ef4444"
                      strokeWidth={2}
                    />
                  )}
                  <circle
                    className="hit"
                    cx={atom.x * SCALE}
                    cy={atom.y * SCALE}
                    r={HIT_RADIUS}
                    fill="transparent"
                    stroke="transparent"
                    strokeWidth={2}
                  />
                  <circle
                    className={cn(
                      'pointer-events-none',
                      problems?.has(atom.id) ? 'fill-red-100' : 'fill-white',
                    )}
                    cx={atom.x * SCALE}
                    cy={atom.y * SCALE}
                    r={labelRadius(structure, atom)}
                  />
                  <text
                    x={atom.x * SCALE}
                    y={atom.y * SCALE}
                    textAnchor="middle"
                    dominantBaseline="central"
                    className="fill-current text-base font-semibold pointer-events-none"
                  >
                    {atom.symbol}
                  </text>
                </g>
                <Electrons
                  structure={structure}
                  atom={atom}
                  bars={bars}
                  onTap={onTap}
                  onPress={onPress}
                />
                <Marks atom={atom} onTap={onTap} onPress={onPress} />
                {hints && (
                  <Badges
                    structure={structure}
                    atom={atom}
                    showCharge={showCharges}
                  />
                )}
              </g>
            ),
          )}

          {structure.arrows?.map((arrow, i) => (
            <Arrow
              key={i}
              structure={structure}
              arrow={arrow}
              index={i}
              onTap={onTap}
              onPress={onPress}
            />
          ))}

          {/* on top of everything, so nothing covers it */}
          {inspectedAtom && inspectedProblems && (
            <ProblemTooltip atom={inspectedAtom} messages={inspectedProblems} />
          )}
        </g>
      </svg>
    </svg>
  );
});

export default LewisCanvas;
