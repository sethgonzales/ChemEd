import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MOLECULES } from '~/constants/molecules';
import LewisChallenge from './lewis-challenge';

const molecule = (id: string) => MOLECULES.find((m) => m.id === id)!;
const SETTINGS = { snap: true, bars: false, hints: false };

function setup(id: string) {
  const onCheck = jest.fn();
  render(
    <LewisChallenge
      molecule={molecule(id)}
      start="given"
      settings={SETTINGS}
      onSettings={jest.fn()}
      onCheck={onCheck}
    />,
  );
  return onCheck;
}

describe('LewisChallenge', () => {
  it('names the molecule and counts its valence electrons', () => {
    setup('water');
    expect(
      screen.getByRole('heading', { name: 'Water, H₂O' }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/of 8 valence electrons placed/),
    ).toBeInTheDocument();
  });

  it('reports a correct structure when it’s checked', async () => {
    const onCheck = setup('hydrogen'); // its skeleton is already the answer
    await userEvent.click(
      screen.getByRole('button', { name: 'Check your work' }),
    );
    expect(onCheck).toHaveBeenCalledWith('best');
  });

  it('reports an unfinished one too', async () => {
    const onCheck = setup('water'); // no lone pairs yet
    await userEvent.click(
      screen.getByRole('button', { name: 'Check your work' }),
    );
    expect(onCheck).toHaveBeenCalledWith(expect.not.stringMatching(/^best$/));
  });
});
