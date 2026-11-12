import { fireEvent, render, screen } from '@testing-library/react';
import type { LewisStructure } from '~/utils/lewis';
import LewisCanvas, { DRAWING_ZOOM, fitZoom } from './lewis-canvas';

const atom = (id: number, symbol: string, x: number) => ({
  id,
  symbol,
  x,
  y: 0,
  lonePairs: 0,
  radicals: 0,
});

// the drawn line of a bond, not its invisible tap area
const bondLine = (name: string) =>
  screen.getByRole('button', { name }).querySelector('line:not(.hit)')!;

function renderStructure(structure: LewisStructure) {
  render(
    <LewisCanvas structure={structure} onTap={() => {}} onPress={() => {}} />,
  );
}

describe('LewisCanvas bonds', () => {
  it('still shows a bond between atoms that are very close together', () => {
    renderStructure({
      atoms: [atom(0, 'C', 0), atom(1, 'H', 0.2)],
      bonds: [{ a: 0, b: 1, order: 1 }],
    });
    const line = bondLine('C–H single bond');
    const x1 = Number(line.getAttribute('x1'));
    const x2 = Number(line.getAttribute('x2'));
    // runs from C towards H, with some length left after trimming
    expect(x2 - x1).toBeGreaterThan(2);
  });

  it('runs a bond right up to an open end', () => {
    renderStructure({
      atoms: [atom(0, 'C', 0), atom(1, '', 1)],
      bonds: [{ a: 0, b: 1, order: 1 }],
    });
    const line = bondLine('C–open end single bond');
    // one bond length is 64px; only the C end is trimmed back
    expect(Number(line.getAttribute('x2'))).toBe(64);
  });

  it('draws open ends as small targets with no symbol', () => {
    renderStructure({
      atoms: [atom(0, '', 0), atom(1, '', 1)],
      bonds: [{ a: 0, b: 1, order: 1 }],
    });
    expect(
      screen.getAllByRole('button', { name: 'Open bond end' }),
    ).toHaveLength(2);
    expect(screen.getByRole('group').textContent).toBe('');
  });

  it('keeps the white disc behind a symbol off a short bond', () => {
    renderStructure({
      atoms: [atom(0, 'C', 0), atom(1, 'H', 0.3)],
      bonds: [{ a: 0, b: 1, order: 1 }],
    });
    const line = bondLine('C–H single bond');
    const c = screen
      .getByRole('button', { name: /^C atom/ })
      .querySelector('circle:not(.hit)')!;
    // the bond starts outside C's disc
    expect(Number(line.getAttribute('x1'))).toBeGreaterThanOrEqual(
      Number(c.getAttribute('r')),
    );
  });
});

describe('LewisCanvas problems', () => {
  const water = {
    atoms: [atom(0, 'O', 0), atom(1, 'H', 1), atom(2, 'H', -1)],
    bonds: [
      { a: 0, b: 1, order: 1 as const },
      { a: 0, b: 2, order: 1 as const },
    ],
  };
  const problems = new Map([[0, ['O has 4 electrons around it. It needs 8.']]]);

  function renderWithProblems() {
    render(
      <LewisCanvas
        structure={water}
        onTap={() => {}}
        onPress={() => {}}
        problems={problems}
      />,
    );
    return screen.getByRole('button', { name: /^O atom/ });
  }

  it('rings atoms with problems in red', () => {
    const o = renderWithProblems();
    expect(o.querySelector('.problem-ring')).toBeInTheDocument();
    expect(
      screen
        .getAllByRole('button', { name: /^H atom/ })[0]
        .querySelector('.problem-ring'),
    ).toBeNull();
  });

  it('shows what is wrong when a problem atom is hovered', () => {
    const o = renderWithProblems();
    expect(screen.queryByRole('tooltip')).toBeNull();
    fireEvent.pointerEnter(o);
    expect(screen.getByRole('tooltip')).toHaveTextContent(
      'O has 4 electrons around it. It needs 8.',
    );
    fireEvent.pointerLeave(o);
    expect(screen.queryByRole('tooltip')).toBeNull();
  });

  it('shows it on keyboard focus too', () => {
    const o = renderWithProblems();
    fireEvent.focus(o);
    expect(screen.getByRole('tooltip')).toBeInTheDocument();
    fireEvent.blur(o);
    expect(screen.queryByRole('tooltip')).toBeNull();
  });

  it('shows nothing when hovering an atom without problems', () => {
    renderWithProblems();
    fireEvent.pointerEnter(
      screen.getAllByRole('button', { name: /^H atom/ })[0],
    );
    expect(screen.queryByRole('tooltip')).toBeNull();
  });

  it('includes the problem in the atom’s accessible name', () => {
    const o = renderWithProblems();
    expect(o).toHaveAccessibleName(
      /Problem: O has 4 electrons around it\. It needs 8\.$/,
    );
  });
});

describe('fitZoom', () => {
  it('draws larger than 1:1 so symbols are easy to read', () => {
    expect(DRAWING_ZOOM).toBeGreaterThanOrEqual(1.5);
    expect(fitZoom({ width: 800, height: 500 }, { x: 100, y: 60 })).toBe(
      DRAWING_ZOOM,
    );
  });

  it('zooms out to fit a drawing that outgrows the panel', () => {
    // 400px of reach either side of the centre in an 800px-wide panel
    expect(fitZoom({ width: 800, height: 500 }, { x: 400, y: 60 })).toBe(1);
    expect(fitZoom({ width: 800, height: 500 }, { x: 800, y: 60 })).toBe(0.5);
  });

  it('uses the full size before the panel has been measured', () => {
    expect(fitZoom(null, { x: 1000, y: 1000 })).toBe(DRAWING_ZOOM);
  });
});
