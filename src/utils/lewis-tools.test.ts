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

  it('does nothing when a tool doesn’t apply to the target', () => {
    expect(toolAction('select', O, water)).toBeNull();
    expect(toolAction('lonePair', OH, water)).toBeNull();
    expect(toolAction('lonePair', empty, water)).toBeNull();
    expect(toolAction('bond1', O, water)).toBeNull();
    expect(toolAction('eraser', empty, water)).toBeNull();
    expect(toolAction('element:O', OH, water)).toBeNull();
    expect(toolAction('chargePlus', OH, water)).toBeNull();
    expect(toolAction('partial', empty, water)).toBeNull();
  });
});

describe('dragAction (drag that starts on the drawing)', () => {
  it('bonds two atoms with a bond tool', () => {
    expect(dragAction('bond2', O, H, { x: 0, y: 0 })).toEqual({
      type: 'setBondOrder',
      a: 0,
      b: 1,
      order: 2,
    });
    expect(dragAction('bond1', O, O, { x: 0, y: 0 })).toBeNull();
    expect(dragAction('bond1', O, empty, { x: 3, y: 4 })).toBeNull();
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

  it('leaves other edits alone', () => {
    const attach = {
      type: 'addAtom',
      symbol: 'H',
      x: 0.5,
      y: 0.87,
      bondTo: 0,
    } as const;
    expect(snapAction(attach, water)).toBe(attach);
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
