import { render, screen } from '@testing-library/react';
import { SUBSTANCES } from '~/constants/substances';
import HeatingCurve, { CHART, chart } from './heating-curve';

const water = SUBSTANCES.find((s) => s.id === 'water')!;

// a label's box, centred on x above its baseline, sized for its few characters
const box = (l: { x: number; y: number; text: string }) => ({
  left: l.x - (l.text.length * CHART.charWidth) / 2,
  right: l.x + (l.text.length * CHART.charWidth) / 2,
  top: l.y - CHART.ascent, // tall letters like l
  bottom: l.y + CHART.descent, // and the g's tail
});

// points every half unit along the line, to test against a box
function along(line: { x: number; y: number }[]) {
  const out: { x: number; y: number }[] = [];
  for (let i = 1; i < line.length; i++) {
    const [a, b] = [line[i - 1], line[i]];
    const n = Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) * 2);
    for (let k = 0; k <= n; k++) {
      out.push({
        x: a.x + ((b.x - a.x) * k) / n,
        y: a.y + ((b.y - a.y) * k) / n,
      });
    }
  }
  return out;
}

const inside = (
  p: { x: number; y: number },
  b: ReturnType<typeof box>,
  pad = 0,
) =>
  p.x > b.left - pad &&
  p.x < b.right + pad &&
  p.y > b.top - pad &&
  p.y < b.bottom + pad;

describe('HeatingCurve', () => {
  it('labels the plateaus s→l and l→g', () => {
    render(<HeatingCurve substance={water} temperature={20} />);
    expect(screen.getByText('s→l')).toBeInTheDocument();
    expect(screen.getByText('l→g')).toBeInTheDocument();
  });

  it.each(['water', 'benzene'])(
    'centres s→l under its plateau and l→g over its own (%s)',
    (id) => {
      const { labels, line } = chart(SUBSTANCES.find((s) => s.id === id)!, 20);
      const [melt, boil] = labels;
      expect(melt.x).toBeCloseTo((line[1].x + line[2].x) / 2);
      expect(melt.y).toBeGreaterThan(line[1].y); // below
      expect(boil.x).toBeCloseTo((line[3].x + line[4].x) / 2);
      expect(boil.y).toBeLessThan(line[3].y); // above
    },
  );

  it('slides a label along a plateau too short for it, just clear of the line', () => {
    const mercury = SUBSTANCES.find((s) => s.id === 'mercury')!;
    const { labels, line } = chart(mercury, 20);
    const melt = labels[0];
    const mid = (line[1].x + line[2].x) / 2;
    expect(melt.x).toBeGreaterThan(mid);
    // still under its plateau, so it reads as belonging to it
    expect(box(melt).left).toBeLessThan(line[2].x);
  });

  describe.each(SUBSTANCES.map((s) => [s.name, s] as const))('%s', (_, s) => {
    it('keeps each label inside the chart, clear of the line and the axes', () => {
      const { labels, line } = chart(s, s.meltC);
      for (const l of labels) {
        const b = box(l);
        expect(b.left).toBeGreaterThan(CHART.pad.left);
        expect(b.right).toBeLessThan(CHART.width - CHART.pad.right);
        expect(b.top).toBeGreaterThan(0);
        expect(b.bottom).toBeLessThan(CHART.height - CHART.pad.bottom);
        // the line is 3 wide, so leave it a little room
        for (const p of along(line)) expect(inside(p, b, 2)).toBe(false);
      }
    });

    it.each([
      ['melting', s.meltC],
      ['boiling', s.boilC],
    ])('keeps the labels clear of the dot while %s', (_, t) => {
      const { labels, dot } = chart(s, Math.round(t));
      for (const l of labels) {
        expect(inside(dot, box(l), CHART.dotRadius + 1)).toBe(false);
      }
    });
  });
});
