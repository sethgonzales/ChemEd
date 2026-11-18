// A sprite at half size, for a character seen from far off (the balloon's
// rider). Each 2 × 2 block becomes the colour it shows most; the outline only
// wins when nothing else does, so faces stay light, and a block with anything
// in it stays drawn, so thin details like goggle straps survive.

const OUTLINE = 'K';

export function halfSize(rows: string[]): string[] {
  const out: string[] = [];
  for (let y = 0; y < rows.length; y += 2) {
    let row = '';
    for (let x = 0; x < rows[y].length; x += 2) {
      const counts = new Map<string, number>();
      for (const [dx, dy] of [
        [0, 0],
        [1, 0],
        [0, 1],
        [1, 1],
      ]) {
        const p = rows[y + dy]?.[x + dx] ?? '.';
        if (p !== '.') counts.set(p, (counts.get(p) ?? 0) + 1);
      }
      const best = [...counts].sort(
        ([a, m], [b, n]) =>
          n - m || Number(a === OUTLINE) - Number(b === OUTLINE),
      )[0];
      row += best?.[0] ?? '.';
    }
    out.push(row);
  }
  return out;
}
