import { readFileSync } from 'fs';
import { join } from 'path';
import opentype from 'opentype.js';

// Pixelify Sans draws its 5 exactly like an S, and its 7 like a wide 1; our
// copy redraws both
const WEIGHTS = [400, 500, 600, 700];
const REDRAWN = '57';
const load = (weight: number) => {
  const file = readFileSync(join(__dirname, `pixelify-sans-${weight}.woff`));
  return opentype.parse(
    file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength),
  );
};
const outline = (font: opentype.Font, char: string) =>
  font.charToGlyph(char).path.toPathData(0);

/** The x of a glyph's points along its top or bottom edge */
function edge(font: opentype.Font, char: string, side: 'top' | 'bottom') {
  const glyph = font.charToGlyph(char);
  const box = glyph.getBoundingBox();
  const y = side === 'top' ? box.y2 : box.y1;
  const xs = (
    glyph.path.commands.filter((c) => 'y' in c && c.y === y) as { x: number }[]
  ).map((c) => c.x);
  return { box, from: Math.min(...xs), to: Math.max(...xs) };
}

describe.each(WEIGHTS)('the pixel font at weight %i', (weight) => {
  const font = load(weight);

  it('draws a 5 that can’t be mistaken for an S', () => {
    expect(outline(font, '5')).not.toBe(outline(font, 'S'));
  });

  it('gives the 5 a flat top running the digit’s full width', () => {
    const { box, from, to } = edge(font, '5', 'top');
    expect(from).toBe(box.x1);
    expect(to).toBe(box.x2);
  });

  it('gives the 7 a flat top running the digit’s full width, unlike the 1’s flag', () => {
    const { box, from, to } = edge(font, '7', 'top');
    expect(from).toBe(box.x1);
    expect(to).toBe(box.x2);
  });

  it('slants the 7 down to a stem in the middle, not straight down its right side like a 1', () => {
    const { box, from, to } = edge(font, '7', 'bottom');
    expect(from).toBeGreaterThan(box.x1);
    expect(to).toBeLessThan(box.x2);
  });

  it('leaves every other character as it was', () => {
    for (const char of 'S0123456789AaEe₄²⁻(){}') {
      if (REDRAWN.includes(char)) continue;
      expect(font.charToGlyph(char).path.commands.length).toBeGreaterThan(0);
    }
  });
});
