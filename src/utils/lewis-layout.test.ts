import { MOLECULES } from '~/constants/molecules';
import type { LewisStructure } from './lewis';
import { skeletonEditor } from './lewis-editor';
import {
  cleanUp,
  layoutSkeleton,
  lonePairSlots,
  nextAtomPosition,
  snapPosition,
} from './lewis-layout';

const byId = (id: string) => MOLECULES.find((m) => m.id === id)!.skeleton;

const distance = (
  a: { x?: number; y?: number },
  b: { x?: number; y?: number },
) => Math.hypot((a.x ?? 0) - (b.x ?? 0), (a.y ?? 0) - (b.y ?? 0));

// smallest angle between two directions, in degrees
const angleBetween = (a: number, b: number) => {
  const d = Math.abs(a - b) % 360;
  return Math.min(d, 360 - d);
};

describe('layoutSkeleton', () => {
  it('puts the most-bonded atom at the origin', () => {
    const { atoms } = layoutSkeleton(byId('water'));
    expect(atoms[0]).toMatchObject({ x: 0, y: 0 });
  });

  it('places every bonded atom one bond length (1) apart', () => {
    for (const m of MOLECULES) {
      const { atoms, bonds } = layoutSkeleton(m.skeleton);
      for (const [a, b] of bonds) {
        expect(distance(atoms[a], atoms[b])).toBeCloseTo(1);
      }
    }
  });

  it('never puts two atoms on top of each other', () => {
    for (const m of MOLECULES) {
      const { atoms } = layoutSkeleton(m.skeleton);
      for (let i = 0; i < atoms.length; i++) {
        for (let j = i + 1; j < atoms.length; j++) {
          expect(distance(atoms[i], atoms[j])).toBeGreaterThan(0.6);
        }
      }
    }
  });

  it('spreads outer atoms evenly around a central atom', () => {
    const { atoms } = layoutSkeleton(byId('methane'));
    const angles = atoms
      .slice(1)
      .map((a) => (Math.atan2(-(a.y ?? 0), a.x ?? 0) * 180) / Math.PI);
    for (let i = 0; i < angles.length; i++) {
      for (let j = i + 1; j < angles.length; j++) {
        expect(angleBetween(angles[i], angles[j])).toBeGreaterThanOrEqual(89);
      }
    }
  });

  it('keeps the skeleton’s atoms and bonds', () => {
    const skeleton = byId('ethene');
    const laid = layoutSkeleton(skeleton);
    expect(laid.atoms.map((a) => a.symbol)).toEqual(
      skeleton.atoms.map((a) => a.symbol),
    );
    expect(laid.bonds).toEqual(skeleton.bonds);
  });
});

describe('lonePairSlots', () => {
  it('puts lone pairs between the bonds', () => {
    // water drawn linear: bonds at 0° and 180°
    const slots = lonePairSlots([0, 180], 2);
    expect(slots).toHaveLength(2);
    for (const s of slots) {
      expect(angleBetween(s, 0)).toBeGreaterThanOrEqual(90);
      expect(angleBetween(s, 180)).toBeGreaterThanOrEqual(90);
    }
  });

  it('keeps lone pairs apart from each other', () => {
    const slots = lonePairSlots([], 4);
    for (let i = 0; i < slots.length; i++) {
      for (let j = i + 1; j < slots.length; j++) {
        expect(angleBetween(slots[i], slots[j])).toBeGreaterThanOrEqual(90);
      }
    }
  });

  it('faces a terminal atom’s lone pairs away from its bond', () => {
    // fluorine bonded to the right: three pairs at the top, left and bottom
    const slots = lonePairSlots([0], 3);
    for (const s of slots) {
      expect(angleBetween(s, 0)).toBeGreaterThanOrEqual(90);
    }
  });

  it('still finds room when an atom is crowded (XeF4)', () => {
    const slots = lonePairSlots([0, 90, 180, 270], 2);
    expect(slots).toHaveLength(2);
    for (const s of slots) {
      for (const bond of [0, 90, 180, 270]) {
        expect(angleBetween(s, bond)).toBeGreaterThanOrEqual(45);
      }
    }
  });

  it('returns angles from 0 to 360', () => {
    for (const s of lonePairSlots([45], 4)) {
      expect(s).toBeGreaterThanOrEqual(0);
      expect(s).toBeLessThan(360);
    }
  });
});

describe('nextAtomPosition', () => {
  const atom = (id: number, x: number, y: number) => ({
    id,
    symbol: 'C',
    x,
    y,
    lonePairs: 0,
    radicals: 0,
  });
  const twoBonded: LewisStructure = {
    atoms: [atom(0, 0, 0), atom(1, 1, 0)],
    bonds: [{ a: 0, b: 1, order: 1 }],
  };

  it('puts the first atom at the origin', () => {
    expect(nextAtomPosition({ atoms: [], bonds: [] })).toEqual({ x: 0, y: 0 });
  });

  it('puts an attached atom one bond length away, clear of existing bonds', () => {
    const p = nextAtomPosition(twoBonded, 0);
    expect(Math.hypot(p.x, p.y)).toBeCloseTo(1);
    const angle = (Math.atan2(-p.y, p.x) * 180) / Math.PI;
    expect(Math.abs(angle)).toBeGreaterThanOrEqual(45);
  });

  it('puts an unattached atom clear of every other atom', () => {
    const p = nextAtomPosition(twoBonded);
    for (const a of twoBonded.atoms) {
      expect(Math.hypot(p.x - a.x, p.y - a.y)).toBeGreaterThanOrEqual(1);
    }
  });
});

const waterSkeleton = () =>
  skeletonEditor(MOLECULES.find((m) => m.id === 'water')!).structure;

describe('snapPosition', () => {
  it('snaps an atom with one neighbour to a bond length at a multiple of 30°', () => {
    const s = waterSkeleton(); // H (atom 1) is bonded only to O at the origin
    const p = snapPosition(s, 1, { x: 1.7, y: -0.4 });
    expect(Math.hypot(p.x, p.y)).toBeCloseTo(1);
    const angle = (Math.atan2(-p.y, p.x) * 180) / Math.PI;
    expect(Math.abs(Math.round(angle) % 30)).toBe(0);
  });

  it('snaps other atoms to a quarter-bond grid', () => {
    const s = waterSkeleton(); // O has two neighbours
    expect(snapPosition(s, 0, { x: 0.33, y: -0.6 })).toEqual({
      x: 0.25,
      y: -0.5,
    });
  });

  it('snaps an atom that isn’t on the drawing yet to the grid', () => {
    expect(
      snapPosition({ atoms: [], bonds: [] }, 7, { x: 1.1, y: 0.9 }),
    ).toEqual({ x: 1, y: 1 });
  });
});

describe('cleanUp', () => {
  // a messy water: H atoms dragged to odd places, plus a stray Cl
  const messy = () => {
    const s = waterSkeleton();
    return {
      ...s,
      atoms: [
        ...s.atoms.map((a, i) =>
          i === 1
            ? { ...a, x: 0.2, y: 0.1, lonePairs: 0 }
            : { ...a, lonePairs: i === 0 ? 2 : 0 },
        ),
        { id: 9, symbol: 'Cl', x: 0.3, y: 0.2, lonePairs: 3, radicals: 1 },
      ],
    };
  };

  it('puts every bond at one bond length', () => {
    const tidy = cleanUp(messy());
    for (const b of tidy.bonds) {
      const a = tidy.atoms.find((x) => x.id === b.a)!;
      const c = tidy.atoms.find((x) => x.id === b.b)!;
      expect(Math.hypot(a.x - c.x, a.y - c.y)).toBeCloseTo(1);
    }
  });

  it('keeps every atom clear of the others, across separate pieces', () => {
    const { atoms } = cleanUp(messy());
    for (let i = 0; i < atoms.length; i++) {
      for (let j = i + 1; j < atoms.length; j++) {
        expect(
          Math.hypot(atoms[i].x - atoms[j].x, atoms[i].y - atoms[j].y),
        ).toBeGreaterThanOrEqual(0.99);
      }
    }
  });

  it('keeps atoms, electrons, bonds and brackets', () => {
    const before = { ...messy(), bracket: { charge: -1 } };
    const after = cleanUp(before);
    const strip = (s: LewisStructure) =>
      s.atoms.map((a) => ({ ...a, x: 0, y: 0 }));
    expect(strip(after)).toEqual(strip(before));
    expect(after.bonds).toEqual(before.bonds);
    expect(after.bracket).toEqual(before.bracket);
  });
});
