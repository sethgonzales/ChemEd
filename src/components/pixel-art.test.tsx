import { render, screen } from '@testing-library/react';
import { PIXEL } from '~/utils/pixel';
import PixelArt from './pixel-art';

describe('PixelArt', () => {
  const art = { rows: ['AAB.', '.BB.'], palette: { A: '#f00', B: '#00f' } };

  it('is an image with a description', () => {
    render(<PixelArt {...art} label="Three jars" />);
    const img = screen.getByRole('img', { name: 'Three jars' });
    expect(img).toHaveAttribute('viewBox', '0 0 4 2');
  });

  it('draws each pixel as one of the app’s 4px pixels', () => {
    render(<PixelArt {...art} label="Jars" />);
    const img = screen.getByRole('img');
    expect(img).toHaveAttribute('width', String(4 * PIXEL));
    expect(img).toHaveAttribute('height', String(2 * PIXEL));
    expect(PIXEL).toBe(4);
  });

  it('can draw bigger, in whole app pixels', () => {
    render(<PixelArt {...art} label="Jars" scale={2} />);
    const img = screen.getByRole('img');
    expect(img).toHaveAttribute('width', String(4 * 2 * PIXEL));
    expect(img).toHaveAttribute('height', String(2 * 2 * PIXEL));
  });

  it('draws one rectangle per run of a colour, skipping transparent pixels', () => {
    render(<PixelArt {...art} label="Runs" />);
    const rects = [...screen.getByRole('img').querySelectorAll('rect')];
    expect(
      rects.map((r) => [
        r.getAttribute('x'),
        r.getAttribute('y'),
        r.getAttribute('width'),
        r.getAttribute('fill'),
      ]),
    ).toEqual([
      ['0', '0', '2', '#f00'],
      ['2', '0', '1', '#00f'],
      ['1', '1', '2', '#00f'],
    ]);
  });

  it('can be decorative', () => {
    render(<PixelArt {...art} />);
    expect(screen.queryByRole('img')).toBeNull();
  });
});
