import { render, screen, within } from '@testing-library/react';
import { ELEMENTS } from '~/constants/elements';
import { groundState } from '~/utils/electron-configurations';
import OrbitalDiagram from './orbital-diagram';

const of = (symbol: string) =>
  groundState(ELEMENTS.find((e) => e.symbol === symbol)!.atomicNumber);

const rows = () => screen.getAllByRole('listitem');

describe('OrbitalDiagram', () => {
  it('stacks subshells by energy, lowest at the bottom', () => {
    render(<OrbitalDiagram occupancy={of('Na')} />);
    expect(rows().map((r) => r.dataset.subshell)).toEqual([
      '3s',
      '2p',
      '2s',
      '1s',
    ]);
  });

  it('says how many electrons each subshell holds', () => {
    render(<OrbitalDiagram occupancy={of('O')} />);
    expect(screen.getByText('2p: 4 electrons')).toBeInTheDocument();
    expect(screen.getByText('1s: 2 electrons')).toBeInTheDocument();
  });

  it('draws one box per orbital, with Hund’s-rule arrows', () => {
    render(<OrbitalDiagram occupancy={of('O')} />);
    const p = rows().find((r) => r.dataset.subshell === '2p')!;
    expect(p.querySelectorAll('[data-box]')).toHaveLength(3);
    expect(within(p).getAllByText('↑')).toHaveLength(3);
    expect(within(p).getAllByText('↓')).toHaveLength(1);
  });

  it('shows empty subshells below the highest filled one', () => {
    // palladium is [Kr] 4d10, with 5s left empty
    render(<OrbitalDiagram occupancy={of('Pd')} />);
    expect(screen.getByText('5s: 0 electrons')).toBeInTheDocument();
  });
});

describe('OrbitalDiagram stepping from the previous element', () => {
  const fresh = () => document.querySelectorAll('[data-new]');

  it('marks the arriving electron so it can drop in', () => {
    render(<OrbitalDiagram occupancy={of('N')} previous={of('C')} />);
    expect(fresh()).toHaveLength(1);
    const p = rows().find((r) => r.dataset.subshell === '2p')!;
    expect(p.querySelectorAll('[data-box]')[2]).toContainElement(
      fresh()[0] as HTMLElement,
    );
  });

  it('marks nothing without a previous element', () => {
    render(<OrbitalDiagram occupancy={of('N')} />);
    expect(fresh()).toHaveLength(0);
  });
});
