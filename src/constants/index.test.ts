import { existsSync } from 'fs';
import path from 'path';
import { DOOR_ART } from './door-art';
import { SIMULATIONS } from './index';

const root = path.resolve(__dirname, '../..');

describe('SIMULATIONS', () => {
  it('lists the six simulations in display order', () => {
    expect(SIMULATIONS.map((s) => s.title)).toEqual([
      'Periodic Table',
      'States of Matter',
      'Lewis Structures',
      'Electron Configurations',
      'Chemical Reactions',
      'Titrations',
    ]);
  });

  it.each(SIMULATIONS)('$title has a page and door art', (sim) => {
    expect(existsSync(path.join(root, 'src/pages', `${sim.path}.tsx`))).toBe(
      true,
    );
    expect(DOOR_ART[sim.art]).toBeDefined();
  });

  it('gives every simulation its own colour', () => {
    const colors = SIMULATIONS.map((s) => s.color);
    expect(new Set(colors).size).toBe(colors.length);
  });

  it('seals the simulations that are not built yet', () => {
    expect(SIMULATIONS.filter((s) => !s.ready).map((s) => s.title)).toEqual([
      'Titrations',
    ]);
  });
});
