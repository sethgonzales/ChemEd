import { FRAMES, PALETTE } from './mr-g-sprite';
import { BALLOON_PALETTE, RIDER_ROWS, balloonOutfit } from './balloon-outfit';
import { MR_G } from './riders';

// another character on Mr. G's grid: just a face, no goggles or coat
const plain = Array.from({ length: 30 }, (_, y) =>
  y >= 6 && y <= 15 ? '....KSSSSSSSSSSK....' : '....................',
);

describe('balloonOutfit', () => {
  it('shows the rider from the chest up, above the basket', () => {
    const rows = balloonOutfit(FRAMES.idle);
    expect(rows).toHaveLength(RIDER_ROWS);
    for (const row of rows) expect(row).toHaveLength(20);
  });

  it('keeps the wearer’s own face', () => {
    const rows = balloonOutfit(FRAMES.talk);
    for (let y = 6; y <= 15; y++) expect(rows[y]).toBe(FRAMES.talk[y]);
  });

  it('adds a scarf at the neck and a flight jacket below it', () => {
    const rows = balloonOutfit(FRAMES.idle);
    expect(rows[16]).toContain('Z');
    for (let y = 17; y < RIDER_ROWS; y++) expect(rows[y]).toContain('J');
  });

  it('dresses any character on the grid, goggles pushed up on the forehead', () => {
    const rows = balloonOutfit(plain);
    expect(rows[8]).toBe(plain[8]);
    expect(rows[3]).toContain('G');
    expect(rows[4]).toContain('L');
    expect(rows[16]).toContain('Z');
  });

  it('has a colour for every letter it uses', () => {
    const colours = { ...PALETTE, ...BALLOON_PALETTE };
    const letters = new Set(balloonOutfit(plain).join('').replace(/\./g, ''));
    for (const l of letters) expect(colours).toHaveProperty(l);
  });
});

describe('riders', () => {
  it('Mr. G rides by default, in his own frames and colours', () => {
    expect(MR_G.name).toBe('Mr. G');
    expect(MR_G.rows('blink')).toEqual(FRAMES.blink);
    expect(MR_G.palette).toBe(PALETTE);
  });
});
