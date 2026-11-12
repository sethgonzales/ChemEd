import { render, screen } from '@testing-library/react';
import { ELEMENTS } from '~/constants/elements';
import { groundState } from '~/utils/electron-configurations';
import ShellDiagram from './shell-diagram';

const of = (symbol: string) =>
  groundState(ELEMENTS.find((e) => e.symbol === symbol)!.atomicNumber);

const electrons = () => document.querySelectorAll('[data-electron]');

describe('ShellDiagram (Bohr model)', () => {
  it('describes the shells for screen readers', () => {
    render(<ShellDiagram symbol="Na" occupancy={of('Na')} />);
    expect(
      screen.getByRole('img', {
        name: 'Bohr model of Na: 2 electrons in shell 1, 8 in shell 2, 1 in shell 3',
      }),
    ).toBeInTheDocument();
  });

  it('draws a ring per shell and every electron', () => {
    render(<ShellDiagram symbol="Na" occupancy={of('Na')} />);
    expect(document.querySelectorAll('[data-ring]')).toHaveLength(3);
    expect(electrons()).toHaveLength(11);
  });

  it('marks the electron that arrives when stepping from the previous element', () => {
    render(
      <ShellDiagram symbol="Mg" occupancy={of('Mg')} previous={of('Na')} />,
    );
    const fresh = document.querySelectorAll('[data-new]');
    expect(fresh).toHaveLength(1);
    expect(fresh[0]).toHaveAttribute('data-shell', '3');
  });
});
