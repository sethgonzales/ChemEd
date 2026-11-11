import type { BondOrder, LewisStructure, Molecule } from './lewis';
import { cleanUp, layoutSkeleton } from './lewis-layout';

export type EditorState = {
  structure: LewisStructure;
  history: LewisStructure[]; // earlier structures, for undo
  nextId: number;
};

export type EditorAction =
  | { type: 'addLonePair'; atom: number }
  | { type: 'removeLonePair'; atom: number }
  | { type: 'toggleRadical'; atom: number }
  | { type: 'setBondOrder'; a: number; b: number; order: BondOrder }
  | { type: 'removeBond'; a: number; b: number }
  | { type: 'moveAtom'; atom: number; x: number; y: number }
  | { type: 'moveLonePair'; from: number; to: number }
  | { type: 'adjustCharge'; atom: number; delta: 1 | -1 }
  | { type: 'cyclePartial'; atom: number }
  | { type: 'clearMarks'; atom: number }
  | { type: 'toggleBracket' }
  | { type: 'adjustBracketCharge'; delta: 1 | -1 }
  | { type: 'cleanUp' }
  | { type: 'addAtom'; symbol: string; x: number; y: number; bondTo?: number }
  | { type: 'removeAtom'; atom: number }
  | { type: 'undo' }
  | { type: 'load'; editor: EditorState };

const MAX_LONE_PAIRS = 4;
const NEXT_PARTIAL = { none: '+', '+': '-', '-': undefined } as const;

type Marks = NonNullable<LewisStructure['atoms'][number]['marks']>;

// An atom's marks with empty ones dropped, so "no marks" is always undefined
function tidyMarks(marks: Marks): Marks | undefined {
  const tidy: Marks = {};
  if (marks.charge) tidy.charge = marks.charge;
  if (marks.partial) tidy.partial = marks.partial;
  return Object.keys(tidy).length ? tidy : undefined;
}

/** A molecule's skeleton joined by single bonds, ready for electrons. */
export function skeletonEditor(molecule: Molecule): EditorState {
  const { atoms, bonds } = layoutSkeleton(molecule.skeleton);
  return {
    structure: {
      atoms: atoms.map((atom, id) => ({
        id,
        symbol: atom.symbol,
        x: atom.x ?? 0,
        y: atom.y ?? 0,
        lonePairs: 0,
        radicals: 0,
      })),
      bonds: bonds.map(([a, b]) => ({ a, b, order: 1 })),
    },
    history: [],
    nextId: atoms.length,
  };
}

export function emptyEditor(): EditorState {
  return { structure: { atoms: [], bonds: [] }, history: [], nextId: 0 };
}

const joins = (a: number, b: number) => (bond: { a: number; b: number }) =>
  (bond.a === a && bond.b === b) || (bond.a === b && bond.b === a);

function change(
  s: LewisStructure,
  action: Exclude<EditorAction, { type: 'undo' } | { type: 'load' }>,
  nextId: number,
): LewisStructure {
  const updateAtom = (
    id: number,
    update: (atom: LewisStructure['atoms'][number]) => object,
  ) => ({
    ...s,
    atoms: s.atoms.map((a) => (a.id === id ? { ...a, ...update(a) } : a)),
  });

  switch (action.type) {
    case 'addLonePair':
      return updateAtom(action.atom, (a) => ({
        lonePairs: Math.min(MAX_LONE_PAIRS, a.lonePairs + 1),
      }));
    case 'removeLonePair':
      return updateAtom(action.atom, (a) => ({
        lonePairs: Math.max(0, a.lonePairs - 1),
      }));
    case 'toggleRadical':
      return updateAtom(action.atom, (a) => ({ radicals: a.radicals ? 0 : 1 }));
    case 'setBondOrder': {
      const { a, b, order } = action;
      if (a === b) return s;
      const has = s.bonds.some(joins(a, b));
      return {
        ...s,
        bonds: has
          ? s.bonds.map((bond) =>
              joins(a, b)(bond) ? { ...bond, order } : bond,
            )
          : [...s.bonds, { a, b, order }],
      };
    }
    case 'removeBond':
      return {
        ...s,
        bonds: s.bonds.filter((b) => !joins(action.a, action.b)(b)),
      };
    case 'adjustCharge':
      return updateAtom(action.atom, (a) => ({
        marks: tidyMarks({
          ...a.marks,
          charge: (a.marks?.charge ?? 0) + action.delta,
        }),
      }));
    case 'cyclePartial':
      return updateAtom(action.atom, (a) => ({
        marks: tidyMarks({
          ...a.marks,
          partial: NEXT_PARTIAL[a.marks?.partial ?? 'none'],
        }),
      }));
    case 'clearMarks':
      return updateAtom(action.atom, () => ({ marks: undefined }));
    case 'toggleBracket': {
      if (!s.bracket) return { ...s, bracket: { charge: 0 } };
      const rest = { ...s };
      delete rest.bracket;
      return rest;
    }
    case 'adjustBracketCharge':
      return s.bracket
        ? { ...s, bracket: { charge: s.bracket.charge + action.delta } }
        : s;
    case 'cleanUp':
      return cleanUp(s);
    case 'moveAtom':
      return updateAtom(action.atom, () => ({ x: action.x, y: action.y }));
    case 'moveLonePair': {
      const from = s.atoms.find((a) => a.id === action.from);
      const to = s.atoms.find((a) => a.id === action.to);
      if (
        !from ||
        !to ||
        from === to ||
        from.lonePairs === 0 ||
        to.lonePairs >= MAX_LONE_PAIRS
      ) {
        return s;
      }
      return {
        ...s,
        atoms: s.atoms.map((a) =>
          a === from
            ? { ...a, lonePairs: a.lonePairs - 1 }
            : a === to
              ? { ...a, lonePairs: a.lonePairs + 1 }
              : a,
        ),
      };
    }
    case 'addAtom':
      return {
        bonds:
          action.bondTo === undefined
            ? s.bonds
            : [...s.bonds, { a: action.bondTo, b: nextId, order: 1 }],
        atoms: [
          ...s.atoms,
          {
            id: nextId,
            symbol: action.symbol,
            x: action.x,
            y: action.y,
            lonePairs: 0,
            radicals: 0,
          },
        ],
      };
    case 'removeAtom':
      return {
        atoms: s.atoms.filter((a) => a.id !== action.atom),
        bonds: s.bonds.filter(
          (b) => b.a !== action.atom && b.b !== action.atom,
        ),
      };
  }
}

const same = (a: LewisStructure, b: LewisStructure) =>
  JSON.stringify(a) === JSON.stringify(b);

export function editorReducer(
  state: EditorState,
  action: EditorAction,
): EditorState {
  if (action.type === 'load') return action.editor;
  if (action.type === 'undo') {
    if (!state.history.length) return state;
    return {
      ...state,
      structure: state.history[state.history.length - 1],
      history: state.history.slice(0, -1),
    };
  }

  const structure = change(state.structure, action, state.nextId);
  if (same(structure, state.structure)) return state;
  return {
    structure,
    history: [...state.history, state.structure],
    nextId: action.type === 'addAtom' ? state.nextId + 1 : state.nextId,
  };
}
