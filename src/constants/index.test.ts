import { existsSync } from 'fs';
import path from 'path';
import { DOOR_ART } from './door-art';
import { GAMES, SIMULATIONS } from './index';

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

describe('GAMES', () => {
  it('lists the games apart from the simulations, unbuilt ones last', () => {
    expect(GAMES.map((g) => [g.title, g.ready])).toEqual([
      ['Dungeon Quest', true],
      ['Balloon Riser', true],
    ]);
  });

  it.each(GAMES.filter((g) => g.ready))('$title has a page', (game) => {
    expect(existsSync(path.join(root, 'src/pages', `${game.path}.tsx`))).toBe(
      true,
    );
  });

  it.each(GAMES)('$title has door art and its own colour', (game) => {
    expect(DOOR_ART[game.art]).toBeDefined();
    const colors = [...SIMULATIONS, ...GAMES].map((s) => s.color);
    expect(colors.filter((c) => c === game.color)).toHaveLength(1);
  });
});
