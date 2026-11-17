import { COURSES, createRng, type Course } from '~/utils/quest';
import { SIMULATIONS } from '~/constants';
import { QUESTION_SOURCES } from '~/utils/quest-sources';
import { ROOMS } from '~/components/quest-rooms';
import { CHAMBERS, CHAMBER_IDS, findChamber } from './quest-chambers';

describe('the Dungeon Quest’s chambers', () => {
  it('starts with Reaction Balancing and its Golem', () => {
    const c = findChamber('balancing')!;
    expect(c.topic).toBe('Reaction Balancing');
    expect(c.villain.name).toBe('The Unbalanced Golem');
  });

  it('have their own ids, listed in order', () => {
    expect(new Set(CHAMBER_IDS).size).toBe(CHAMBERS.length);
    expect(CHAMBER_IDS).toEqual(CHAMBERS.map((c) => c.id));
    expect(findChamber('nowhere')).toBeUndefined();
  });

  it.each(CHAMBERS.map((c) => [c.id, c] as const))(
    '%s has a story, a door for each room and a boss of about 5 HP',
    (_, c) => {
      expect(c.story.length).toBeGreaterThan(0);
      expect(c.doors).toHaveLength(c.rooms);
      for (const door of c.doors) {
        expect(door.name).not.toBe('');
        expect(door.story).not.toBe('');
      }
      expect(c.bossHp).toBeGreaterThanOrEqual(4);
      expect(c.bossHp).toBeLessThanOrEqual(6);
    },
  );

  it.each(
    CHAMBERS.flatMap((c) =>
      (Object.keys(COURSES) as Course[]).map(
        (course) => [c.id, course, c] as const,
      ),
    ),
  )('%s asks questions across the %s course’s levels', (_, course, c) => {
    for (const level of c.courses[course]) {
      const q = c.bossQuestion(createRng(level), level);
      expect(q.choices.length).toBeGreaterThan(1);
    }
  });

  it('includes the Periodic Table and its Element Sphinx', () => {
    const c = findChamber('periodic')!;
    expect(c.topic).toBe('Periodic Table');
    expect(c.villain.name).toBe('The Element Sphinx');
  });

  it('includes Electron Configurations and its Orbital Lich', () => {
    const c = findChamber('electrons')!;
    expect(c.topic).toBe('Electron Configurations');
    expect(c.villain.name).toBe('The Orbital Lich');
  });

  it('includes Lewis Structures and its Bond Weaver', () => {
    const c = findChamber('lewis')!;
    expect(c.topic).toBe('Lewis Structures');
    expect(c.villain.name).toBe('The Bond Weaver');
  });

  it('includes States of Matter and its Frost Wyrm', () => {
    const c = findChamber('states')!;
    expect(c.topic).toBe('States of Matter');
    expect(c.villain.name).toBe('The Frost Wyrm');
  });

  it('includes Chemical Reactions and its Precipitate Slime', () => {
    const c = findChamber('reactions')!;
    expect(c.topic).toBe('Chemical Reactions');
    expect(c.villain.name).toBe('The Precipitate Slime');
  });

  it('includes Titrations and its Acid Hydra', () => {
    const c = findChamber('titrations')!;
    expect(c.topic).toBe('Titrations');
    expect(c.villain.name).toBe('The Acid Hydra');
  });

  it('includes Electrochemistry and its Voltaic Wraith', () => {
    const c = findChamber('electrochemistry')!;
    expect(c.topic).toBe('Electrochemistry');
    expect(c.villain.name).toBe('The Voltaic Wraith');
  });

  it('builds a chamber for every topic', () => {
    expect(CHAMBERS).toHaveLength(8);
  });

  it('keeps the dungeon’s topic order', () => {
    const order = [
      'periodic',
      'electrons',
      'lewis',
      'states',
      'balancing',
      'reactions',
      'titrations',
      'electrochemistry',
    ];
    const ids = CHAMBER_IDS.filter((id) => order.includes(id));
    expect(ids).toEqual(order.filter((id) => ids.includes(id)));
    expect(ids).toEqual(CHAMBER_IDS);
  });

  it.each(CHAMBERS.map((c) => [c.id, c] as const))(
    '%s asks its simulation’s questions, and has rooms to play',
    (_, c) => {
      const sim = SIMULATIONS.find((s) => s.path === c.page)!;
      expect(sim.title).toBe(c.topic);
      const source = QUESTION_SOURCES[c.page];
      expect(c.bossQuestion).toBe(source.question);
      expect(c.courses).toBe(source.levels);
      expect(ROOMS[c.id]).toBeDefined();
    },
  );
});
