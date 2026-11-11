import {
  forwardRef,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
} from 'react';
import {
  electronCount,
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
const HIT_RADIUS = 22; // big enough to tap on a phone
const PAIR_DISTANCE = 20; // lone pair from the atom's centre
const PAIR_GAP = 3.5; // half the space between a pair's two dots
const DOT_RADIUS = 2;
const BOND_GAP = 4; // between the lines of a double or triple bond
const MAX_ZOOM = 1.6; // small molecules stop growing past this on wide screens

const ORDER_NAME = { 1: 'single', 2: 'double', 3: 'triple' } as const;

interface Props {
  structure: LewisStructure;
  onTap: (target: Target) => void;
  onPress: (target: Target, e: PointerEvent) => void; // may start a drag
  problems?: Set<number>; // atoms the last check flagged
  bars?: boolean; // draw lone pairs as bars instead of dots
  hints?: boolean; // electron counts and formal charges on each atom
  showCharges?: boolean; // formal charges only mean something once every electron is placed
  preview?: { from: number; to: { x: number; y: number } } | null; // bond being drawn
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

const signed = (n: number) => (n > 0 ? `+${n}` : String(n));

function atomLabel(s: LewisStructure, atom: LewisAtom, hints: boolean) {
  const parts = [plural(atom.lonePairs, 'lone pair')];
  if (atom.radicals) parts.push(plural(atom.radicals, 'unpaired electron'));
  if (hints) {
    parts.push(plural(electronCount(s, atom.id), 'electron'));
    parts.push(`formal charge ${signed(formalCharge(s, atom.id))}`);
  }
  return `${atom.symbol} atom: ${parts.join(', ')}`;
}

/** The atom, bond, lone pair or empty canvas an element belongs to. */
export function targetOf(el: Element | null): Target | null {
  const hit = el?.closest(
    '[data-pair],[data-mark],[data-atom],[data-bond],[data-bracket],[data-canvas]',
  );
  if (!hit) return null;
  const { pair, mark, atom, bond, bracket } = (hit as HTMLElement | SVGElement)
    .dataset;
  if (pair !== undefined) return { kind: 'lonePair', atom: Number(pair) };
  if (mark !== undefined) return { kind: 'mark', atom: Number(mark) };
  if (bracket !== undefined) return { kind: 'bracket' };
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
  const [vx, vy, vw, vh] = (svg.getAttribute('viewBox') ?? '')
    .split(' ')
    .map(Number);
  if (!rect.width || !rect.height || !vw || !vh) return null;
  return {
    x: (vx + ((clientX - rect.left) / rect.width) * vw) / SCALE,
    y: (vy + ((clientY - rect.top) / rect.height) * vh) / SCALE,
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
  const start = { x: ax + ux * ATOM_RADIUS, y: ay + uy * ATOM_RADIUS };
  const end = { x: bx - ux * ATOM_RADIUS, y: by - uy * ATOM_RADIUS };

  return (
    <g
      data-bond={`${bond.a}-${bond.b}`}
      aria-label={`${a.symbol}–${b.symbol} ${ORDER_NAME[bond.order]} bond`}
      className="cursor-pointer outline-none focus-visible:[&>.hit]:stroke-sky-300"
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
  const slots = lonePairSlots(
    bondAngles(structure, atom.id),
    atom.lonePairs + atom.radicals,
  );
  const cx = atom.x * SCALE;
  const cy = atom.y * SCALE;

  return (
    <>
      {slots.map((angle, i) => {
        const dir = toPoint(angle);
        const x = cx + dir.x * PAIR_DISTANCE;
        const y = cy + dir.y * PAIR_DISTANCE;
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
            className="cursor-grab outline-none focus-visible:[&>.hit]:fill-sky-200"
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
      className="cursor-pointer outline-none text-[11px] font-semibold focus-visible:[&_text]:fill-sky-600"
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
      className="cursor-pointer outline-none focus-visible:[&>path]:stroke-sky-500"
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
  },
  ref,
) {
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
  // leave room for the brackets and their charge when they're drawn
  const pad = structure.bracket ? BRACKET_MARGIN + 24 : PADDING;
  const box = structure.atoms.length
    ? [
        Math.min(...xs) - pad,
        Math.min(...ys) - pad,
        Math.max(...xs) - Math.min(...xs) + 2 * pad,
        Math.max(...ys) - Math.min(...ys) + 2 * pad,
      ]
    : [-120, -60, 240, 120];
  const from = preview && atoms.get(preview.from);

  return (
    <svg
      ref={ref}
      role="group"
      aria-label="Lewis structure"
      data-canvas=""
      viewBox={box.join(' ')}
      width={box[2] * MAX_ZOOM}
      height={box[3] * MAX_ZOOM}
      className="max-w-full max-h-full h-auto text-gray-900 select-none touch-none"
      onClick={(e) => {
        const point = pointIn(e.currentTarget, e.clientX, e.clientY);
        // NaN tells the page the point is unknown, so it picks a free spot
        onTap({ kind: 'canvas', x: point?.x ?? NaN, y: point?.y ?? NaN });
      }}
    >
      {!structure.atoms.length && (
        <text
          x={0}
          y={0}
          textAnchor="middle"
          className="fill-gray-400 text-[10px] pointer-events-none"
        >
          Drag atoms here from the toolbar
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

      {structure.atoms.map((atom) => (
        <g key={atom.id}>
          <g
            data-atom={atom.id}
            aria-label={atomLabel(structure, atom, hints)}
            className="cursor-pointer outline-none focus-visible:[&>.hit]:stroke-sky-400"
            {...interactive({ kind: 'atom', id: atom.id }, onTap, onPress)}
          >
            <circle
              className={cn(
                'hit',
                problems?.has(atom.id) ? 'fill-red-100' : 'fill-white',
              )}
              cx={atom.x * SCALE}
              cy={atom.y * SCALE}
              r={HIT_RADIUS}
              stroke="transparent"
              strokeWidth={2}
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
      ))}
    </svg>
  );
});

export default LewisCanvas;
