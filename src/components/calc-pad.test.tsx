import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CalcPad, { Working } from './calc-pad';

const renderPad = () => {
  const onSubmit = jest.fn();
  render(
    <CalcPad
      label="Volume to tie off at"
      units={['m³', 'L']}
      hint="P₁V₁ = P₂V₂"
      action="Tie off and fly"
      onSubmit={onSubmit}
    />,
  );
  return onSubmit;
};

const answer = () =>
  screen.getByRole('textbox', { name: 'Volume to tie off at' });
const go = () => screen.getByRole('button', { name: 'Tie off and fly' });

describe('CalcPad', () => {
  it('sends the typed answer in SI units', async () => {
    const onSubmit = renderPad();
    await userEvent.type(answer(), '540');
    await userEvent.click(go());
    expect(onSubmit).toHaveBeenCalledWith(540);
  });

  it('converts from the unit picked', async () => {
    const onSubmit = renderPad();
    await userEvent.click(screen.getByRole('button', { name: /Unit/ }));
    await userEvent.click(screen.getByRole('button', { name: 'L' }));
    await userEvent.type(answer(), '540,000');
    await userEvent.keyboard('{Enter}');
    expect(onSubmit).toHaveBeenCalledWith(540);
  });

  it('asks for a number rather than sending nonsense', async () => {
    const onSubmit = renderPad();
    await userEvent.type(answer(), 'lots');
    await userEvent.click(go());
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByText(/Type a number/)).toBeInTheDocument();
  });

  it('shows Mr. G’s hint on request', async () => {
    renderPad();
    expect(screen.queryByText('P₁V₁ = P₂V₂')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Hint' }));
    expect(screen.getByText('P₁V₁ = P₂V₂')).toBeInTheDocument();
  });

  it('has room to work it out', () => {
    renderPad();
    expect(
      screen.getByRole('textbox', { name: 'Working' }),
    ).toBeInTheDocument();
  });

  it('can leave its working space to sit somewhere else', () => {
    render(
      <CalcPad
        label="Volume to tie off at"
        units={['m³', 'L']}
        hint="Boyle’s law"
        action="Tie off and fly"
        onSubmit={jest.fn()}
        working={false}
      />,
    );
    expect(screen.queryByRole('textbox', { name: 'Working' })).toBeNull();
    render(<Working />);
    expect(
      screen.getByRole('textbox', { name: 'Working' }),
    ).toBeInTheDocument();
  });
});
