import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Setting from './setting';

describe('Setting', () => {
  it('is a labelled checkbox that reports changes', async () => {
    const onChange = jest.fn();
    render(
      <Setting checked={false} onChange={onChange}>
        Show hints
      </Setting>,
    );
    const box = screen.getByRole('checkbox', { name: 'Show hints' });
    expect(box).not.toBeChecked();
    await userEvent.click(box);
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it('toggles from the keyboard', async () => {
    const onChange = jest.fn();
    render(
      <Setting checked onChange={onChange}>
        Snap to grid
      </Setting>,
    );
    await userEvent.tab();
    expect(
      screen.getByRole('checkbox', { name: 'Snap to grid' }),
    ).toHaveFocus();
    await userEvent.keyboard(' ');
    expect(onChange).toHaveBeenCalledWith(false);
  });
});
