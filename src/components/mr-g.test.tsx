import { render, screen } from '@testing-library/react';
import { FRAMES, PALETTE } from '~/constants/mr-g-sprite';
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
