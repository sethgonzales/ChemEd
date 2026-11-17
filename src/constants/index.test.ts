import { existsSync } from 'fs';
import path from 'path';
import { DOOR_ART } from './door-art';
import { SIMULATIONS } from './index';

const root = path.resolve(__dirname, '../..');

describe('SIMULATIONS', () => {
  it('lists the simulations in display order, unbuilt ones last', () => {
    expect(SIMULATIONS.map((s) => s.title)).toEqual([
      'Periodic Table',
      'States of Matter',
      'Lewis Structures',
      'Electron Configurations',
      'Reaction Balancing',
      'Titrations',
      'Electrochemistry',
      'Chemical Reactions',
      'Dungeon Quest',
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

  it('opens every door now Chemical Reactions is built', () => {
    expect(SIMULATIONS.filter((s) => !s.ready)).toEqual([]);
  });
});
