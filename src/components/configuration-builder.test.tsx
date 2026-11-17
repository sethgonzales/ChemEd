import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ELEMENTS } from '~/constants/elements';
import ConfigurationBuilder from './configuration-builder';

const carbon = ELEMENTS[5];
const button = (name: string) => screen.getByRole('button', { name });
const tap = (name: string) =>
  userEvent.click(screen.getByRole('button', { name }));

async function drawCarbon() {
  for (const b of ['1s box 1: empty', '1s box 1: up']) await tap(b);
  for (const b of ['2s box 1: empty', '2s box 1: up']) await tap(b);
  await tap('2p box 1: empty');
  await tap('2p box 2: empty');
  await userEvent.type(
    screen.getByRole('textbox', { name: 'Notation' }),
    '1s2 2s2 2p2',
  );
}

describe('ConfigurationBuilder with a set element, as a puzzle', () => {
  it('asks for that element, with no picker, charge or answer to show', () => {
    render(<ConfigurationBuilder target={{ element: carbon, charge: 0 }} />);
    expect(screen.getByText('Draw Carbon: 6 electrons')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Carbon' })).toBeNull();
    expect(screen.queryByRole('group', { name: 'Charge' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Show answer' })).toBeNull();
  });

  it('says when it’s drawn and written correctly', async () => {
    const onCorrect = jest.fn();
    render(
      <ConfigurationBuilder
        target={{ element: carbon, charge: 0 }}
        onCorrect={onCorrect}
      />,
    );
    await userEvent.click(button('Check'));
    expect(onCorrect).not.toHaveBeenCalled();
    await drawCarbon();
    await userEvent.click(button('Check'));
    expect(onCorrect).toHaveBeenCalledTimes(1);
  });

  it('can ask for an ion', () => {
    const iron = ELEMENTS[25];
    render(<ConfigurationBuilder target={{ element: iron, charge: 2 }} />);
    expect(screen.getByText('Draw Fe²⁺: 24 electrons')).toBeInTheDocument();
  });
});
