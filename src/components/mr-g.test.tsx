import { render, screen } from '@testing-library/react';
import {
  FRAMES,
  PALETTE,
  SPRITE_HEIGHT,
  SPRITE_WIDTH,
  spriteRows,
  type Frame,
} from '~/constants/mr-g-sprite';
import MrG from './mr-g';

describe('MrG', () => {
  it('is an image named Mr. G', () => {
    render(<MrG />);
    expect(screen.getByRole('img', { name: 'Mr. G' })).toBeInTheDocument();
  });

  it('draws crisp pixels in his palette', () => {
    const { container } = render(<MrG />);
    const svg = container.querySelector('svg')!;
    expect(svg).toHaveAttribute('shape-rendering', 'crispEdges');
    const fills = new Set(
      [...svg.querySelectorAll('rect')].map((r) => r.getAttribute('fill')),
    );
    expect(fills).toContain(PALETTE.C); // the lab coat
    for (const fill of fills) {
      expect(Object.values(PALETTE)).toContain(fill);
    }
  });

  it('draws the frame it is given', () => {
    const { container, rerender } = render(<MrG frame="idle" />);
    const idle = container.innerHTML;
    rerender(<MrG frame="blink" />);
    expect(container.innerHTML).not.toBe(idle);
  });

  it('merges runs of the same colour into one rectangle per run', () => {
    const { container } = render(<MrG frame="idle" />);
    const runs = FRAMES.idle.reduce(
      (n, row) => n + (row.match(/([^.])\1*/g) ?? []).length,
      0,
    );
    expect(container.querySelectorAll('rect')).toHaveLength(runs);
  });
});

describe('MrG in a wet lab', () => {
  const eyeRow = (rows: string[]) => rows.findIndex((r) => r.includes('E'));
  const lensRow = (rows: string[]) => rows.findIndex((r) => r.includes('L'));

  it('says he’s wearing safety goggles', () => {
    render(<MrG goggles />);
    expect(
      screen.getByRole('img', { name: 'Mr. G, wearing safety goggles' }),
    ).toBeInTheDocument();
  });

  it('wears them pushed up on his head otherwise', () => {
    const rows = spriteRows('idle', false);
    expect(lensRow(rows)).toBeLessThan(eyeRow(rows)); // lenses above his eyes
  });

  it('pulls them down over his eyes, which still show through', () => {
    const rows = spriteRows('idle', true);
    const eyes = eyeRow(rows);
    expect(eyes).toBeGreaterThan(0);
    // goggle frames above, beside and below the eyes; none left in his hair
    expect(rows[eyes]).toMatch(/G.*E.*G.*G.*E.*G/);
    expect(rows[eyes - 1]).toMatch(/G/);
    expect(rows[eyes + 1]).toMatch(/G/);
    expect(rows.slice(0, eyes - 1).join('')).not.toMatch(/[GgL]/);
  });

  it('blinks behind them', () => {
    const rows = spriteRows('blink', true);
    expect(rows.join('')).not.toMatch(/E/);
    expect(rows.join('')).toMatch(/G/);
  });

  it.each(Object.keys(FRAMES) as Frame[])(
    'keeps the %s frame the same size',
    (frame) => {
      const rows = spriteRows(frame, true);
      expect(rows).toHaveLength(SPRITE_HEIGHT);
      for (const row of rows) expect(row).toHaveLength(SPRITE_WIDTH);
    },
  );
});
