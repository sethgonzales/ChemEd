import { MOLECULES } from '~/constants/molecules';
import { skeletonEditor } from './lewis-editor';
import {
  arrowBetween,
  dragAction,
  snapAction,
  toolAction,
} from './lewis-tools';

const water = skeletonEditor(
  MOLECULES.find((m) => m.id === 'water')!,
).structure;
const O = { kind: 'atom', id: 0 } as const;
const H = { kind: 'atom', id: 1 } as const;
const OH = { kind: 'bond', a: 0, b: 1 } as const;
const pairOnO = { kind: 'lonePair', atom: 0 } as const;
const empty = { kind: 'canvas', x: 3, y: 4 } as const;
const markOnO = { kind: 'mark', atom: 0 } as const;

describe('toolAction (tap, or drop from the toolbar)', () => {
  it('adds a lone pair or unpaired electron to an atom', () => {
    expect(toolAction('lonePair', O, water)).toEqual({
      type: 'addLonePair',
      atom: 0,
    });
    expect(toolAction('lonePair', pairOnO, water)).toEqual({
      type: 'addLonePair',
      atom: 0,
    });
    expect(toolAction('radical', H, water)).toEqual({
      type: 'toggleRadical',
      atom: 1,
    });
  });

  it('sets a bond to the bond tool’s order', () => {
    expect(toolAction('bond2', OH, water)).toEqual({
      type: 'setBondOrder',
      a: 0,
      b: 1,
      order: 2,
    });
    expect(toolAction('bond3', OH, water)).toMatchObject({ order: 3 });
  });

  it('erases atoms, bonds and lone pairs', () => {
    expect(toolAction('eraser', H, water)).toEqual({
      type: 'removeAtom',
      atom: 1,
    });
    expect(toolAction('eraser', OH, water)).toEqual({
      type: 'removeBond',
      a: 0,
      b: 1,
    });
    expect(toolAction('eraser', pairOnO, water)).toEqual({
      type: 'removeLonePair',
      atom: 0,
    });
  });

  it('writes charge and δ marks on an atom', () => {
    expect(toolAction('chargePlus', O, water)).toEqual({
      type: 'adjustCharge',
      atom: 0,
      delta: 1,
    });
    expect(toolAction('chargeMinus', markOnO, water)).toEqual({
      type: 'adjustCharge',
      atom: 0,
      delta: -1,
    });
    expect(toolAction('partial', H, water)).toEqual({
      type: 'cyclePartial',
      atom: 1,
    });
  });

  it('draws brackets with the bracket tool, anywhere on the drawing', () => {
    for (const target of [empty, O, OH]) {
      expect(toolAction('brackets', target, water)).toEqual({
        type: 'toggleBracket',
      });
    }
  });

  it('charges and erases brackets', () => {
    const bracket = { kind: 'bracket' } as const;
    expect(toolAction('chargeMinus', bracket, water)).toEqual({
      type: 'adjustBracketCharge',
      delta: -1,
    });
    expect(toolAction('eraser', bracket, water)).toEqual({
      type: 'toggleBracket',
    });
  });

  it('erases a curved arrow', () => {
    expect(toolAction('eraser', { kind: 'arrow', index: 2 }, water)).toEqual({
      type: 'removeArrow',
      index: 2,
    });
  });

  it('erases an atom’s marks', () => {
    expect(toolAction('eraser', markOnO, water)).toEqual({
      type: 'clearMarks',
      atom: 0,
    });
  });

  it('places an element on the canvas where it is dropped', () => {
    expect(toolAction('element:O', empty, water)).toEqual({
      type: 'addAtom',
      symbol: 'O',
      x: 3,
      y: 4,
    });
  });

  it('attaches an element dropped on an atom with a single bond', () => {
    const action = toolAction('element:Cl', O, water);
    expect(action).toMatchObject({ type: 'addAtom', symbol: 'Cl', bondTo: 0 });
  });

  it('places a bond with two open ends on empty canvas', () => {
    expect(toolAction('bond2', empty, water)).toEqual({
      type: 'addBond',
      x: 3,
      y: 4,
      order: 2,
    });
  });

  it('grows a bond out of an atom to an open end', () => {
    expect(toolAction('bond3', O, water)).toMatchObject({
      type: 'addAtom',
      symbol: '',
      bondTo: 0,
      order: 3,
    });
  });

  it('fills an open end with the element dropped on it', () => {
    const withEnd = {
      ...water,
      atoms: [
        ...water.atoms,
        { id: 3, symbol: '', x: 2, y: 0, lonePairs: 0, radicals: 0 },
      ],
      bonds: [...water.bonds, { a: 1, b: 3, order: 1 as const }],
    };
    expect(toolAction('element:Cl', { kind: 'atom', id: 3 }, withEnd)).toEqual({
      type: 'setSymbol',
      atom: 3,
      symbol: 'Cl',
    });
  });

  it('does nothing when a tool doesn’t apply to the target', () => {
    expect(toolAction('select', O, water)).toBeNull();
    expect(toolAction('lonePair', OH, water)).toBeNull();
    expect(toolAction('lonePair', empty, water)).toBeNull();
    expect(toolAction('eraser', empty, water)).toBeNull();
    expect(toolAction('element:O', OH, water)).toBeNull();
    expect(toolAction('chargePlus', OH, water)).toBeNull();
    expect(toolAction('partial', empty, water)).toBeNull();
  });
});

describe('dragAction (drag that starts on the drawing)', () => {
  it('draws a bond from an atom out to an open end where it is dropped', () => {
    expect(dragAction('bond2', O, empty, { x: 3, y: 4 })).toEqual({
      type: 'addAtom',
      symbol: '',
      x: 3,
      y: 4,
      bondTo: 0,
      order: 2,
    });
  });

  it('never draws a bond shorter than a normal bond', () => {
    // O is at the origin; dropping just next to it still makes a full bond
    const action = dragAction('bond1', O, empty, { x: 0.1, y: 0 }, water);
    expect(action).toMatchObject({ type: 'addAtom', x: 1, y: 0 });
  });

  it('bonds two atoms with a bond tool', () => {
    expect(dragAction('bond2', O, H, { x: 0, y: 0 })).toEqual({
      type: 'setBondOrder',
      a: 0,
      b: 1,
      order: 2,
    });
    expect(dragAction('bond1', O, O, { x: 0, y: 0 })).toBeNull();
  });

  it('moves an atom to where it is dropped with the select tool', () => {
    expect(dragAction('select', H, empty, { x: 3, y: 4 })).toEqual({
      type: 'moveAtom',
      atom: 1,
      x: 3,
      y: 4,
    });
  });

  it('moves a lone pair to another atom with the select tool', () => {
    expect(dragAction('select', pairOnO, H, { x: 0, y: 0 })).toEqual({
      type: 'moveLonePair',
      from: 0,
      to: 1,
    });
    expect(
      dragAction(
        'select',
        pairOnO,
        { kind: 'lonePair', atom: 1 },
        { x: 0, y: 0 },
      ),
    ).toEqual({ type: 'moveLonePair', from: 0, to: 1 });
  });

  it('removes a lone pair dragged off into empty space', () => {
    expect(dragAction('select', pairOnO, empty, { x: 3, y: 4 })).toEqual({
      type: 'removeLonePair',
      atom: 0,
    });
  });

  it('draws a curved arrow from a lone pair or bond to an atom or bond', () => {
    expect(dragAction('curvedArrow', pairOnO, OH, { x: 0, y: 0 })).toEqual({
      type: 'addArrow',
      arrow: {
        from: { kind: 'lonePair', atom: 0 },
        to: { kind: 'bond', a: 0, b: 1 },
      },
    });
    expect(dragAction('curvedArrow', OH, H, { x: 0, y: 0 })).toEqual({
      type: 'addArrow',
      arrow: {
        from: { kind: 'bond', a: 0, b: 1 },
        to: { kind: 'atom', id: 1 },
      },
    });
    // a lone pair dropped on counts as its atom
    expect(
      dragAction(
        'curvedArrow',
        OH,
        { kind: 'lonePair', atom: 1 },
        { x: 0, y: 0 },
      ),
    ).toMatchObject({ arrow: { to: { kind: 'atom', id: 1 } } });
  });

  it('only starts curved arrows from lone pairs and bonds', () => {
    expect(dragAction('curvedArrow', O, OH, { x: 0, y: 0 })).toBeNull();
    expect(
      dragAction('curvedArrow', pairOnO, empty, { x: 0, y: 0 }),
    ).toBeNull();
  });

  it('leaves a lone pair dropped back on its own atom', () => {
    expect(dragAction('select', pairOnO, O, { x: 0, y: 0 })).toBeNull();
  });
});

describe('snapAction', () => {
  it('snaps a bond drawn out of an atom to a bond length and 30°', () => {
    const action = snapAction(
      { type: 'addAtom', symbol: 'C', x: 0.7, y: -0.8, bondTo: 0, order: 1 },
      water,
    );
    if (action.type !== 'addAtom') throw new Error('expected an atom');
    expect(Math.hypot(action.x, action.y)).toBeCloseTo(1);
    const angle = (Math.atan2(-action.y, action.x) * 180) / Math.PI;
    expect(Math.abs(Math.round(angle) % 30)).toBe(0);
  });

  it('snaps a placed bond to the grid', () => {
    expect(
      snapAction({ type: 'addBond', x: 1.1, y: 0.9, order: 1 }, water),
    ).toMatchObject({ x: 1, y: 1 });
  });

  it('snaps a moved atom', () => {
    const action = snapAction(
      { type: 'moveAtom', atom: 1, x: 1.7, y: -0.4 },
      water,
    );
    expect(action).toMatchObject({ type: 'moveAtom', atom: 1 });
    if (action.type !== 'moveAtom') throw new Error('expected a move');
    expect(Math.hypot(action.x, action.y)).toBeCloseTo(1);
  });

  it('snaps an atom placed on empty canvas to the grid', () => {
    expect(
      snapAction({ type: 'addAtom', symbol: 'O', x: 1.1, y: 0.9 }, water),
    ).toEqual({ type: 'addAtom', symbol: 'O', x: 1, y: 1 });
  });

  it('never snaps a new atom onto an existing one', () => {
    // the only nearby 30° spot from O is where an H already sits
    const h = water.atoms[1];
    const action = snapAction(
      { type: 'addAtom', symbol: 'C', x: h.x + 0.05, y: h.y + 0.05, bondTo: 0 },
      water,
    );
    expect(action).toMatchObject({ x: h.x + 0.05, y: h.y + 0.05 });
  });

  it('leaves other edits alone', () => {
    const pair = { type: 'addLonePair', atom: 0 } as const;
    expect(snapAction(pair, water)).toBe(pair);
  });
});

describe('arrowBetween', () => {
  it('builds the arrow for a two-tap curved arrow', () => {
    expect(arrowBetween(pairOnO, OH)).toEqual({
      from: { kind: 'lonePair', atom: 0 },
      to: { kind: 'bond', a: 0, b: 1 },
    });
    expect(arrowBetween(O, OH)).toBeNull();
  });
});
