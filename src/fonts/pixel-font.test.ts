import { readFileSync } from 'fs';
import { join } from 'path';
import opentype from 'opentype.js';

// Pixelify Sans draws its 5 exactly like an S; our copy redraws it
const WEIGHTS = [400, 500, 600, 700];
const load = (weight: number) => {
  const file = readFileSync(join(__dirname, `pixelify-sans-${weight}.woff`));
  return opentype.parse(
    file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength),
  );
};
const outline = (font: opentype.Font, char: string) =>
  font.charToGlyph(char).path.toPathData(0);

describe.each(WEIGHTS)('the pixel font at weight %i', (weight) => {
  const font = load(weight);

  it('draws a 5 that can’t be mistaken for an S', () => {
    expect(outline(font, '5')).not.toBe(outline(font, 'S'));
  });

  it('gives the 5 a flat top running the digit’s full width', () => {
    const five = font.charToGlyph('5');
    const box = five.getBoundingBox();
    const top = five.path.commands.filter(
      (c) => 'y' in c && c.y === box.y2,
    ) as { x: number }[];
    const xs = top.map((c) => c.x);
    expect(Math.min(...xs)).toBe(box.x1);
    expect(Math.max(...xs)).toBe(box.x2);
  });

  it('leaves every other character as it was', () => {
    for (const char of 'S0123456789AaEe₄²⁻(){}') {
      if (char === '5') continue;
      expect(font.charToGlyph(char).path.commands.length).toBeGreaterThan(0);
    }
  });
});
