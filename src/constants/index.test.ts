import { existsSync } from 'fs';
import path from 'path';
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

  it.each(SIMULATIONS)('$title has a page and a card image', (sim) => {
    expect(existsSync(path.join(root, 'src/pages', `${sim.path}.tsx`))).toBe(
      true,
    );
    expect(existsSync(path.join(root, 'public', sim.img))).toBe(true);
  });
});
