import type { BondOrder, LewisStructure } from './lewis';
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
  | `element:${string}`;

/** What a tap, drop or drag landed on. Canvas points are in bond lengths. */
export type Target =
  | { kind: 'atom'; id: number }
  | { kind: 'bond'; a: number; b: number }
  | { kind: 'lonePair'; atom: number }
  | { kind: 'mark'; atom: number } // an atom's charge or δ mark
  | { kind: 'bracket' } // the ion brackets around the whole structure
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
    return target.kind === 'bond'
      ? { type: 'setBondOrder', a: target.a, b: target.b, order }
      : null;
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
      return null;
    default:
      return null;
  }
}

/** The edit for a drag that starts on the drawing and ends on `target`. */
export function dragAction(
  tool: Tool,
  source: Target,
  target: Target,
  point: { x: number; y: number },
): EditorAction | null {
  const order = BOND_ORDER[tool];
  if (order) {
    // draw a bond from one atom to another, as in ChemDraw
    if (source.kind !== 'atom') return null;
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
  if (action.type === 'addAtom' && action.bondTo === undefined) {
    // a new atom has no bonds yet, so it snaps to the grid
    return { ...action, ...snapPosition(structure, -1, action) };
  }
  return action;
}
