import {
  isOpenEnd,
  type BondOrder,
  type CurvedArrow,
  type LewisStructure,
} from './lewis';
import type { EditorAction } from './lewis-editor';
import { nextAtomPosition, snapPosition } from './lewis-layout';

export type Tool =
  | 'select'
  | 'bond1'
  | 'bond2'
  | 'bond3'
  | 'lonePair'
  | 'radical'
  | 'eraser'
  | 'chargePlus'
  | 'chargeMinus'
  | 'partial'
  | 'brackets'
  | 'curvedArrow'
  | `element:${string}`;

/** What a tap, drop or drag landed on. Canvas points are in bond lengths. */
export type Target =
  | { kind: 'atom'; id: number }
  | { kind: 'bond'; a: number; b: number }
  | { kind: 'lonePair'; atom: number }
  | { kind: 'mark'; atom: number } // an atom's charge or δ mark
  | { kind: 'bracket' } // the ion brackets around the whole structure
  | { kind: 'arrow'; index: number } // a curved arrow
  | { kind: 'canvas'; x: number; y: number };

const BOND_ORDER: Partial<Record<Tool, BondOrder>> = {
  bond1: 1,
  bond2: 2,
  bond3: 3,
};

// lone pairs and marks belong to an atom, so most tools treat them as that atom
const atomOf = (t: Target) =>
  t.kind === 'atom'
    ? t.id
    : t.kind === 'lonePair' || t.kind === 'mark'
      ? t.atom
      : null;

/** The edit for using a tool on a target: a tap, or a drop from the toolbar. */
export function toolAction(
  tool: Tool,
  target: Target,
  structure: LewisStructure,
): EditorAction | null {
  const atom = atomOf(target);

  if (tool.startsWith('element:')) {
    const symbol = tool.slice('element:'.length);
    if (target.kind === 'canvas') {
      return { type: 'addAtom', symbol, x: target.x, y: target.y };
    }
    if (target.kind === 'atom') {
      // an open bond end takes the element; a real atom gets a new neighbour
      const atom = structure.atoms.find((a) => a.id === target.id);
      if (atom && isOpenEnd(atom)) {
        return { type: 'setSymbol', atom: target.id, symbol };
      }
      return {
        type: 'addAtom',
        symbol,
        ...nextAtomPosition(structure, target.id),
        bondTo: target.id,
      };
    }
    return null;
  }

  // brackets go round the whole structure, so any target will do
  if (tool === 'brackets') return { type: 'toggleBracket' };
  if (target.kind === 'bracket') {
    if (tool === 'chargePlus' || tool === 'chargeMinus') {
      return {
        type: 'adjustBracketCharge',
        delta: tool === 'chargePlus' ? 1 : -1,
      };
    }
    return tool === 'eraser' ? { type: 'toggleBracket' } : null;
  }

  const order = BOND_ORDER[tool];
  if (order) {
    if (target.kind === 'bond') {
      return { type: 'setBondOrder', a: target.a, b: target.b, order };
    }
    // bonds are connectors: free ends stay open until an element is dropped on
    if (target.kind === 'canvas') {
      return { type: 'addBond', x: target.x, y: target.y, order };
    }
    if (target.kind === 'atom') {
      return {
        type: 'addAtom',
        symbol: '',
        ...nextAtomPosition(structure, target.id),
        bondTo: target.id,
        order,
      };
    }
    return null;
  }

  switch (tool) {
    case 'lonePair':
      return atom === null ? null : { type: 'addLonePair', atom };
    case 'radical':
      return atom === null ? null : { type: 'toggleRadical', atom };
    case 'chargePlus':
    case 'chargeMinus':
      return atom === null
        ? null
        : { type: 'adjustCharge', atom, delta: tool === 'chargePlus' ? 1 : -1 };
    case 'partial':
      return atom === null ? null : { type: 'cyclePartial', atom };
    case 'eraser':
      if (target.kind === 'atom') {
        return { type: 'removeAtom', atom: target.id };
      }
      if (target.kind === 'bond') {
        return { type: 'removeBond', a: target.a, b: target.b };
      }
      if (target.kind === 'lonePair') {
        return { type: 'removeLonePair', atom: target.atom };
      }
      if (target.kind === 'mark') {
        return { type: 'clearMarks', atom: target.atom };
      }
      if (target.kind === 'arrow') {
        return { type: 'removeArrow', index: target.index };
      }
      return null;
    default:
      return null;
  }
}

/**
 * A curved arrow from a lone pair or bond to an atom or bond (a lone pair
 * counts as its atom); null for anything else.
 */
export function arrowBetween(
  source: Target,
  target: Target,
): CurvedArrow | null {
  const from: CurvedArrow['from'] | null =
    source.kind === 'lonePair'
      ? { kind: 'lonePair', atom: source.atom }
      : source.kind === 'bond'
        ? { kind: 'bond', a: source.a, b: source.b }
        : null;
  const to: CurvedArrow['to'] | null =
    target.kind === 'bond'
      ? { kind: 'bond', a: target.a, b: target.b }
      : atomOf(target) !== null && target.kind !== 'mark'
        ? { kind: 'atom', id: atomOf(target)! }
        : null;
  return from && to ? { from, to } : null;
}

const MIN_BOND = 0.75; // shorter drags are stretched to a full bond length

function atLeastABondAway(
  structure: LewisStructure | undefined,
  from: number,
  point: { x: number; y: number },
) {
  const anchor = structure?.atoms.find((a) => a.id === from);
  if (!anchor) return point;
  const dx = point.x - anchor.x;
  const dy = point.y - anchor.y;
  const d = Math.hypot(dx, dy);
  if (d >= MIN_BOND) return point;
  // no direction at all: point to the right
  const [ux, uy] = d ? [dx / d, dy / d] : [1, 0];
  return { x: anchor.x + ux, y: anchor.y + uy };
}

/** The edit for a drag that starts on the drawing and ends on `target`. */
export function dragAction(
  tool: Tool,
  source: Target,
  target: Target,
  point: { x: number; y: number },
  structure?: LewisStructure, // lets a short drag still make a full bond
): EditorAction | null {
  if (tool === 'curvedArrow') {
    const arrow = arrowBetween(source, target);
    return arrow ? { type: 'addArrow', arrow } : null;
  }

  const order = BOND_ORDER[tool];
  if (order) {
    // draw a bond from one atom to another, as in ChemDraw
    if (source.kind !== 'atom') return null;
    if (target.kind === 'canvas') {
      // or out into empty space, ending in an open end at least a bond away
      return {
        type: 'addAtom',
        symbol: '',
        ...atLeastABondAway(structure, source.id, point),
        bondTo: source.id,
        order,
      };
    }
    const to = atomOf(target);
    return to === null || to === source.id
      ? null
      : { type: 'setBondOrder', a: source.id, b: to, order };
  }

  if (tool !== 'select') return null;

  if (source.kind === 'atom') {
    return { type: 'moveAtom', atom: source.id, ...point };
  }
  if (source.kind === 'lonePair') {
    if (target.kind === 'canvas') {
      return { type: 'removeLonePair', atom: source.atom };
    }
    const to = atomOf(target);
    return to === null || to === source.atom
      ? null
      : { type: 'moveLonePair', from: source.atom, to };
  }
  return null;
}

/** Snaps where a moved or freely placed atom lands; other edits pass through. */
export function snapAction(
  action: EditorAction,
  structure: LewisStructure,
): EditorAction {
  if (action.type === 'moveAtom') {
    return { ...action, ...snapPosition(structure, action.atom, action) };
  }
  if (
    (action.type === 'addAtom' && action.bondTo === undefined) ||
    action.type === 'addBond'
  ) {
    // new atoms have no bonds yet, so they snap to the grid
    return { ...action, ...snapPosition(structure, -1, action) };
  }
  if (action.type === 'addAtom') {
    // a new bonded atom snaps to a bond length from its partner, at 30° steps
    const NEW = -1;
    const p = snapPosition(
      {
        ...structure,
        bonds: [...structure.bonds, { a: action.bondTo!, b: NEW, order: 1 }],
      },
      NEW,
      action,
    );
    const taken = structure.atoms.some(
      (a) => Math.hypot(a.x - p.x, a.y - p.y) < 0.5,
    );
    return taken ? action : { ...action, ...p };
  }
  return action;
}
