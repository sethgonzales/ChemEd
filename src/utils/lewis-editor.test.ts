import { MOLECULES } from '~/constants/molecules';
import {
  editorReducer,
  emptyEditor,
  formsReducer,
  skeletonEditor,
} from './lewis-editor';
import { electronsUsed } from './lewis';

const water = MOLECULES.find((m) => m.id === 'water')!;

describe('skeletonEditor', () => {
  it('starts from the molecule’s skeleton with single bonds and no lone pairs', () => {
    const { structure, history } = skeletonEditor(water);
    expect(structure.atoms.map((a) => a.symbol)).toEqual(['O', 'H', 'H']);
    expect(structure.atoms.every((a) => a.lonePairs === 0)).toBe(true);
    expect(structure.bonds.map((b) => b.order)).toEqual([1, 1]);
    expect(electronsUsed(structure)).toBe(4);
    expect(history).toEqual([]);
  });

  it('lays the atoms out so they don’t overlap', () => {
    const { atoms } = skeletonEditor(water).structure;
    expect(new Set(atoms.map((a) => `${a.x},${a.y}`)).size).toBe(3);
  });
});

describe('emptyEditor', () => {
  it('starts with no atoms', () => {
    expect(emptyEditor().structure).toEqual({ atoms: [], bonds: [] });
  });
});

describe('editorReducer', () => {
  const start = skeletonEditor(water);

  it('adds and removes lone pairs, from 0 up to 4', () => {
    let s = start;
    for (let i = 0; i < 6; i++) {
      s = editorReducer(s, { type: 'addLonePair', atom: 0 });
    }
    expect(s.structure.atoms[0].lonePairs).toBe(4);

    for (let i = 0; i < 6; i++) {
      s = editorReducer(s, { type: 'removeLonePair', atom: 0 });
    }
    expect(s.structure.atoms[0].lonePairs).toBe(0);
  });

  it('toggles an unpaired electron', () => {
    const on = editorReducer(start, { type: 'toggleRadical', atom: 0 });
    expect(on.structure.atoms[0].radicals).toBe(1);
    const off = editorReducer(on, { type: 'toggleRadical', atom: 0 });
    expect(off.structure.atoms[0].radicals).toBe(0);
  });

  it('sets a bond’s order, creating the bond if needed', () => {
    let s = editorReducer(start, {
      type: 'setBondOrder',
      a: 1,
      b: 0,
      order: 2,
    });
    expect(s.structure.bonds[0]).toEqual({ a: 0, b: 1, order: 2 });
    s = editorReducer(s, { type: 'setBondOrder', a: 1, b: 2, order: 3 });
    expect(s.structure.bonds).toContainEqual({ a: 1, b: 2, order: 3 });
  });

  it('ignores a bond from an atom to itself', () => {
    const s = editorReducer(start, {
      type: 'setBondOrder',
      a: 0,
      b: 0,
      order: 1,
    });
    expect(s).toBe(start);
  });

  it('removes a bond', () => {
    const s = editorReducer(start, { type: 'removeBond', a: 1, b: 0 });
    expect(s.structure.bonds).toEqual([{ a: 0, b: 2, order: 1 }]);
  });

  it('moves an atom', () => {
    const s = editorReducer(start, { type: 'moveAtom', atom: 1, x: 5, y: 6 });
    expect(s.structure.atoms[1]).toMatchObject({ x: 5, y: 6 });
  });

  it('moves a lone pair from one atom to another', () => {
    let s = editorReducer(start, { type: 'addLonePair', atom: 0 });
    s = editorReducer(s, { type: 'moveLonePair', from: 0, to: 1 });
    expect(s.structure.atoms[0].lonePairs).toBe(0);
    expect(s.structure.atoms[1].lonePairs).toBe(1);
    expect(s.history).toHaveLength(2);
  });

  it('only moves a lone pair that exists, to an atom with room', () => {
    expect(editorReducer(start, { type: 'moveLonePair', from: 0, to: 1 })).toBe(
      start,
    );
    let full = start;
    for (let i = 0; i < 4; i++) {
      full = editorReducer(full, { type: 'addLonePair', atom: 1 });
    }
    full = editorReducer(full, { type: 'addLonePair', atom: 0 });
    expect(editorReducer(full, { type: 'moveLonePair', from: 0, to: 1 })).toBe(
      full,
    );
  });

  it('places a bond between two open ends in one undoable step', () => {
    let s = emptyEditor();
    s = editorReducer(s, { type: 'addBond', x: 1, y: 2, order: 2 });
    const [first, second] = s.structure.atoms;
    // open ends have no element yet
    expect(first).toMatchObject({ id: 0, symbol: '', x: 1, y: 2 });
    expect(second).toMatchObject({ id: 1, symbol: '' });
    // one bond length away, angled up at 30°
    expect(second.x - first.x).toBeCloseTo(Math.cos(Math.PI / 6));
    expect(second.y - first.y).toBeCloseTo(-Math.sin(Math.PI / 6));
    expect(s.structure.bonds).toEqual([{ a: 0, b: 1, order: 2 }]);
    s = editorReducer(s, { type: 'addAtom', symbol: 'H', x: 5, y: 5 });
    expect(s.structure.atoms.at(-1)!.id).toBe(2);
    expect(editorReducer(s, { type: 'undo' }).structure.atoms).toHaveLength(2);
  });

  it('fills an open end with an element', () => {
    let s = editorReducer(emptyEditor(), {
      type: 'addBond',
      x: 0,
      y: 0,
      order: 1,
    });
    s = editorReducer(s, { type: 'setSymbol', atom: 1, symbol: 'H' });
    expect(s.structure.atoms[1].symbol).toBe('H');
  });

  it('bonds a new atom with any bond order', () => {
    const s = editorReducer(start, {
      type: 'addAtom',
      symbol: 'C',
      x: 2,
      y: 0,
      bondTo: 0,
      order: 3,
    });
    expect(s.structure.bonds.at(-1)).toEqual({ a: 0, b: 3, order: 3 });
  });

  it('places atoms with new ids', () => {
    let s = emptyEditor();
    s = editorReducer(s, { type: 'addAtom', symbol: 'O', x: 0, y: 0 });
    s = editorReducer(s, { type: 'addAtom', symbol: 'H', x: 1, y: 0 });
    expect(s.structure.atoms.map((a) => [a.id, a.symbol])).toEqual([
      [0, 'O'],
      [1, 'H'],
    ]);
    expect(s.structure.atoms[1]).toMatchObject({ lonePairs: 0, radicals: 0 });
  });

  it('can bond a new atom to an existing one in a single undoable step', () => {
    let s = emptyEditor();
    s = editorReducer(s, { type: 'addAtom', symbol: 'O', x: 0, y: 0 });
    s = editorReducer(s, {
      type: 'addAtom',
      symbol: 'H',
      x: 1,
      y: 0,
      bondTo: 0,
    });
    expect(s.structure.bonds).toEqual([{ a: 0, b: 1, order: 1 }]);
    s = editorReducer(s, { type: 'undo' });
    expect(s.structure.atoms).toHaveLength(1);
    expect(s.structure.bonds).toEqual([]);
  });

  it('removes an atom along with its bonds', () => {
    const s = editorReducer(start, { type: 'removeAtom', atom: 1 });
    expect(s.structure.atoms.map((a) => a.id)).toEqual([0, 2]);
    expect(s.structure.bonds).toEqual([{ a: 0, b: 2, order: 1 }]);
  });

  it('never reuses the id of a removed atom', () => {
    let s = editorReducer(start, { type: 'removeAtom', atom: 2 });
    s = editorReducer(s, { type: 'addAtom', symbol: 'H', x: 0, y: 1 });
    expect(s.structure.atoms.at(-1)!.id).toBe(3);
  });

  it('adds and subtracts a written charge, dropping it at zero', () => {
    let s = editorReducer(start, { type: 'adjustCharge', atom: 0, delta: 1 });
    s = editorReducer(s, { type: 'adjustCharge', atom: 0, delta: 1 });
    expect(s.structure.atoms[0].marks).toEqual({ charge: 2 });
    s = editorReducer(s, { type: 'adjustCharge', atom: 0, delta: -1 });
    s = editorReducer(s, { type: 'adjustCharge', atom: 0, delta: -1 });
    expect(s.structure.atoms[0].marks).toBeUndefined();
  });

  it('cycles a δ mark: δ+ → δ− → none', () => {
    const marks = [];
    let s = start;
    for (let i = 0; i < 3; i++) {
      s = editorReducer(s, { type: 'cyclePartial', atom: 1 });
      marks.push(s.structure.atoms[1].marks?.partial);
    }
    expect(marks).toEqual(['+', '-', undefined]);
    expect(s.structure.atoms[1].marks).toBeUndefined();
  });

  it('clears all marks on an atom', () => {
    let s = editorReducer(start, { type: 'adjustCharge', atom: 0, delta: 1 });
    s = editorReducer(s, { type: 'cyclePartial', atom: 0 });
    s = editorReducer(s, { type: 'clearMarks', atom: 0 });
    expect(s.structure.atoms[0].marks).toBeUndefined();
  });

  it('toggles brackets and adjusts their charge', () => {
    let s = editorReducer(start, { type: 'toggleBracket' });
    expect(s.structure.bracket).toEqual({ charge: 0 });
    s = editorReducer(s, { type: 'adjustBracketCharge', delta: -1 });
    s = editorReducer(s, { type: 'adjustBracketCharge', delta: -1 });
    expect(s.structure.bracket).toEqual({ charge: -2 });
    s = editorReducer(s, { type: 'toggleBracket' });
    expect(s.structure.bracket).toBeUndefined();
  });

  it('only adjusts the charge of brackets that exist', () => {
    expect(
      editorReducer(start, { type: 'adjustBracketCharge', delta: 1 }),
    ).toBe(start);
  });

  it('cleans up the layout in one undoable step', () => {
    let s = editorReducer(start, { type: 'moveAtom', atom: 1, x: 0.1, y: 0.1 });
    s = editorReducer(s, { type: 'cleanUp' });
    const [o, h] = s.structure.atoms;
    expect(Math.hypot(o.x - h.x, o.y - h.y)).toBeCloseTo(1);
    s = editorReducer(s, { type: 'undo' });
    expect(s.structure.atoms[1]).toMatchObject({ x: 0.1, y: 0.1 });
  });

  it('adds and removes curved arrows', () => {
    const arrow = {
      from: { kind: 'lonePair', atom: 0 },
      to: { kind: 'bond', a: 0, b: 1 },
    } as const;
    let s = editorReducer(start, { type: 'addArrow', arrow });
    expect(s.structure.arrows).toEqual([arrow]);
    s = editorReducer(s, { type: 'removeArrow', index: 0 });
    expect(s.structure.arrows).toEqual([]);
  });

  it('drops arrows that touch an erased atom or bond', () => {
    let s = editorReducer(start, {
      type: 'addArrow',
      arrow: {
        from: { kind: 'lonePair', atom: 0 },
        to: { kind: 'bond', a: 0, b: 1 },
      },
    });
    s = editorReducer(s, {
      type: 'addArrow',
      arrow: {
        from: { kind: 'lonePair', atom: 0 },
        to: { kind: 'atom', id: 2 },
      },
    });
    expect(
      editorReducer(s, { type: 'removeBond', a: 0, b: 1 }).structure.arrows,
    ).toHaveLength(1);
    expect(
      editorReducer(s, { type: 'removeAtom', atom: 2 }).structure.arrows,
    ).toHaveLength(1);
    expect(
      editorReducer(s, { type: 'removeAtom', atom: 0 }).structure.arrows,
    ).toEqual([]);
  });

  it('undoes one change at a time', () => {
    let s = editorReducer(start, { type: 'addLonePair', atom: 0 });
    s = editorReducer(s, { type: 'setBondOrder', a: 0, b: 1, order: 2 });
    s = editorReducer(s, { type: 'undo' });
    expect(s.structure.bonds[0].order).toBe(1);
    expect(s.structure.atoms[0].lonePairs).toBe(1);
    s = editorReducer(s, { type: 'undo' });
    expect(s.structure).toEqual(start.structure);
    expect(editorReducer(s, { type: 'undo' })).toBe(s);
  });

  it('redoes what was undone, one step at a time', () => {
    let s = editorReducer(start, { type: 'addLonePair', atom: 0 });
    s = editorReducer(s, { type: 'addLonePair', atom: 0 });
    s = editorReducer(s, { type: 'undo' });
    s = editorReducer(s, { type: 'undo' });
    expect(s.structure.atoms[0].lonePairs).toBe(0);
    s = editorReducer(s, { type: 'redo' });
    expect(s.structure.atoms[0].lonePairs).toBe(1);
    s = editorReducer(s, { type: 'redo' });
    expect(s.structure.atoms[0].lonePairs).toBe(2);
    // and undo still works after redoing
    expect(
      editorReducer(s, { type: 'undo' }).structure.atoms[0].lonePairs,
    ).toBe(1);
  });

  it('forgets redo once something new is drawn', () => {
    let s = editorReducer(start, { type: 'addLonePair', atom: 0 });
    s = editorReducer(s, { type: 'undo' });
    s = editorReducer(s, { type: 'toggleRadical', atom: 0 });
    expect(s.future).toEqual([]);
    expect(editorReducer(s, { type: 'redo' })).toBe(s);
  });

  it('does nothing when there is nothing to redo', () => {
    expect(editorReducer(start, { type: 'redo' })).toBe(start);
  });

  it('records no history for changes that change nothing', () => {
    const s = editorReducer(start, { type: 'removeLonePair', atom: 0 });
    expect(s).toBe(start);
  });

  it('replaces the structure on load and clears history', () => {
    const changed = editorReducer(start, { type: 'addLonePair', atom: 0 });
    const loaded = editorReducer(changed, {
      type: 'load',
      editor: skeletonEditor(water),
    });
    expect(loaded.structure).toEqual(start.structure);
    expect(loaded.history).toEqual([]);
  });
});

describe('formsReducer', () => {
  const one = { forms: [skeletonEditor(water)], active: 0 };

  it('edits only the active form', () => {
    let s = formsReducer(one, { type: 'addForm' });
    s = formsReducer(s, {
      type: 'edit',
      action: { type: 'addLonePair', atom: 0 },
    });
    expect(s.forms[1].structure.atoms[0].lonePairs).toBe(1);
    expect(s.forms[0].structure.atoms[0].lonePairs).toBe(0);
  });

  it('adds a form as a copy of the active one, without its arrows or history', () => {
    let s = formsReducer(one, {
      type: 'edit',
      action: { type: 'addLonePair', atom: 0 },
    });
    s = formsReducer(s, {
      type: 'edit',
      action: {
        type: 'addArrow',
        arrow: {
          from: { kind: 'lonePair', atom: 0 },
          to: { kind: 'bond', a: 0, b: 1 },
        },
      },
    });
    s = formsReducer(s, { type: 'addForm' });
    expect(s.forms).toHaveLength(2);
    expect(s.active).toBe(1);
    expect(s.forms[1].structure.atoms[0].lonePairs).toBe(1);
    expect(s.forms[1].structure.arrows ?? []).toEqual([]);
    expect(s.forms[1].history).toEqual([]);
  });

  it('switches between forms', () => {
    let s = formsReducer(one, { type: 'addForm' });
    s = formsReducer(s, { type: 'selectForm', index: 0 });
    expect(s.active).toBe(0);
  });

  it('removes a form but always keeps one', () => {
    let s = formsReducer(one, { type: 'addForm' });
    s = formsReducer(s, { type: 'addForm' });
    s = formsReducer(s, { type: 'removeForm', index: 2 });
    expect(s.forms).toHaveLength(2);
    expect(s.active).toBe(1);
    s = formsReducer(s, { type: 'removeForm', index: 0 });
    expect(s.active).toBe(0);
    expect(formsReducer(s, { type: 'removeForm', index: 0 })).toBe(s);
  });

  it('starts over with a single form on load', () => {
    let s = formsReducer(one, { type: 'addForm' });
    s = formsReducer(s, { type: 'load', editor: emptyEditor() });
    expect(s.forms).toHaveLength(1);
    expect(s.active).toBe(0);
    expect(s.forms[0].structure.atoms).toEqual([]);
  });
});
