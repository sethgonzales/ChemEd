// Balloon Riser outfit: flying goggles pushed up on the forehead, a white
// scarf and a leather flight jacket. Like the Dungeon Quest's cloak, it's a
// layer over any character sprite on Mr. G's grid (20 × 30, face on rows
// 6–15), so a student's avatar can wear it. Only the chest up shows over the
// basket's rim.

export const RIDER_ROWS = 20; // rows above the basket's rim

export const BALLOON_PALETTE = {
  G: '#334155', // goggle frames, as in the wet labs
  g: '#475569', // goggle strap
  L: '#cbe8f7', // goggle lenses
  Z: '#f8fafc', // scarf
  z: '#cbd5e1', // its folds
  J: '#8b5a2b', // leather jacket
  j: '#5c3a1c', // its seams and shadow
} as const;

// goggles up on the forehead, over whatever hair is there
const GOGGLES: Record<number, string> = {
  3: '....gGGGG..GGGGg....',
  4: '....gGLLGggGLLGg....',
};

// the neck, then the jacket open over the scarf's hanging ends
const JACKET: Record<number, string> = {
  16: '......KZZZZZZZK.....',
  17: '...KJJJjZzZzjJJJK...',
  18: '..KJJJJjzZzZjJJJJK..',
  19: '..KJjJJjJJJJjJJjJK..',
};

const overlay = (under: string, over: string) =>
  [...under].map((p, i) => (over[i] !== '.' ? over[i] : p)).join('');

/** Dress a character's frame for flying, chest up */
export function balloonOutfit(rows: string[]): string[] {
  return rows
    .slice(0, RIDER_ROWS)
    .map(
      (row, y) => JACKET[y] ?? (GOGGLES[y] ? overlay(row, GOGGLES[y]) : row),
    );
}
