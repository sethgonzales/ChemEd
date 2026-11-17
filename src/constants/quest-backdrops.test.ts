import { CHAMBER_IDS } from '~/constants/quest-chambers';
import { ALCHEMIST_ID } from '~/constants/quest-final';
import { BACKDROPS, backdropFor } from './quest-backdrops';

describe('the chambers’ backdrops', () => {
  const places = [...CHAMBER_IDS, ALCHEMIST_ID];

  it('gives every chamber and the Alchemist a backdrop', () => {
    for (const id of places) expect(BACKDROPS[id]).toBeDefined();
  });

  it('makes each one its own: its stones, and what decorates them', () => {
    const all = ['dungeon', ...places].map((id) => BACKDROPS[id]);
    expect(new Set(all.map((b) => b.stones.join())).size).toBe(all.length);
    const decor = places.map((id) => BACKDROPS[id].decor);
    expect(new Set(decor).size).toBe(places.length);
  });

  it('keeps the plain dungeon for the gate and map', () => {
    expect(backdropFor(undefined)).toBe(BACKDROPS.dungeon);
    expect(backdropFor('nowhere')).toBe(BACKDROPS.dungeon);
    expect(backdropFor('states')).toBe(BACKDROPS.states);
  });
});
