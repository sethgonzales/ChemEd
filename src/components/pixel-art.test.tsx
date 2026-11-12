import { render, screen } from '@testing-library/react';
import PixelArt from './pixel-art';

describe('PixelArt', () => {
  const art = { rows: ['AAB.', '.BB.'], palette: { A: '#f00', B: '#00f' } };

  it('is an image with a description', () => {
    render(<PixelArt {...art} label="Three jars" height={40} />);
    const img = screen.getByRole('img', { name: 'Three jars' });
    expect(img).toHaveAttribute('viewBox', '0 0 4 2');
    expect(img).toHaveAttribute('height', '40');
    expect(img).toHaveAttribute('width', '80');
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
