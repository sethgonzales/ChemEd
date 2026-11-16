import { render, screen } from '@testing-library/react';
import GalvanicCell from '~/components/galvanic-cell';
import { analyzeCell, runCell, type Cell } from '~/utils/electrochemistry';

const daniell: Cell = {
  left: { electrode: 'Zn', solution: 'Zn', concentration: 1 },
  right: { electrode: 'Cu', solution: 'Cu', concentration: 1 },
  saltBridge: true,
};

describe('GalvanicCell', () => {
  it('keeps each metal’s label off its electrode, so it stays readable as the anode thins', () => {
    // run until the zinc has thinned as far as it goes
    let cell = daniell;
    for (let i = 0; i < 100; i++) cell = runCell(cell, 3600);
    render(
      <GalvanicCell
        start={daniell}
        cell={cell}
        reading={analyzeCell(daniell)}
        flowing
        zoomed={null}
        onZoom={() => {}}
      />,
    );
    for (const [side, metal] of [
      ['left', 'Zn'],
      ['right', 'Cu'],
    ]) {
      const label = screen.getByText(metal);
      const electrode = screen.getByTestId(`${side}-electrode`);
      const left = Number(electrode.getAttribute('x'));
      const right = left + Number(electrode.getAttribute('width'));
      const x = Number(label.getAttribute('x'));
      if (side === 'left') {
        // anchored at its end, the text runs leftwards from x, clear of the metal
        expect(label).toHaveAttribute('text-anchor', 'end');
        expect(x).toBeLessThan(left);
      } else {
        // the right beaker's label sits on its outer side
        expect(label).toHaveAttribute('text-anchor', 'start');
        expect(x).toBeGreaterThan(right);
      }
    }
  });
});

describe('GalvanicCell labels under the beakers', () => {
  it('centres Anode and Cathode under their beakers', () => {
    render(
      <GalvanicCell
        start={daniell}
        cell={daniell}
        reading={analyzeCell(daniell)}
        flowing
        zoomed={null}
        onZoom={() => {}}
      />,
    );
    for (const [side, name] of [
      ['left', 'Anode (−)'],
      ['right', 'Cathode (+)'],
    ]) {
      const beaker = screen.getByTestId(`${side}-beaker`);
      const centre =
        Number(beaker.getAttribute('x')) +
        Number(beaker.getAttribute('width')) / 2;
      const label = screen.getByText(name);
      expect(label).toHaveAttribute('text-anchor', 'middle');
      expect(Number(label.getAttribute('x'))).toBeCloseTo(centre);
    }
  });
});
