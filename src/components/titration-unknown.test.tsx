import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ANALYTES, INDICATORS } from '~/constants/titrations';
import { newUnknown } from '~/utils/titrations';
import TitrationUnknown from './titration-unknown';

const WEAK = ANALYTES.filter((a) => a.protons === 1 && a.pKas.length);

function setup() {
  const onCorrect = jest.fn();
  const random = () => 0.4;
  render(
    <TitrationUnknown
      indicator={INDICATORS[0]}
      onIndicator={jest.fn()}
      random={random}
      choices={WEAK}
      onCorrect={onCorrect}
    />,
  );
  return { onCorrect, round: newUnknown(random, WEAK) };
}

describe('TitrationUnknown, dealt by a quest room', () => {
  it('titrates the unknown it’s dealt', () => {
    const { round } = setup();
    expect(
      screen.getByText(new RegExp(`of ${round.analyte.name.toLowerCase()}`)),
    ).toBeInTheDocument();
  });

  it('reports a right answer, and not a wrong one', async () => {
    const { onCorrect, round } = setup();
    const field = screen.getByRole('textbox', { name: 'Concentration (M)' });
    await userEvent.type(field, '9');
    await userEvent.click(screen.getByRole('button', { name: 'Check' }));
    expect(onCorrect).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'New unknown' }));
    await userEvent.type(field, String(round.concentration));
    await userEvent.click(screen.getByRole('button', { name: 'Check' }));
    expect(onCorrect).toHaveBeenCalled();
  });
});
