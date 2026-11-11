import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Dropdown from './dropdown';

function renderDropdown(closeOnClickAway?: boolean) {
  render(
    <div>
      <p>outside</p>
      <Dropdown label="Theme" closeOnClickAway={closeOnClickAway}>
        <li>Option</li>
      </Dropdown>
    </div>,
  );
}

describe('Dropdown', () => {
  it('is closed by default and toggles when its button is clicked', async () => {
    renderDropdown();
    expect(screen.queryByText('Option')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Theme' }));
    expect(screen.getByText('Option')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Theme' }));
    expect(screen.queryByText('Option')).not.toBeInTheDocument();
  });

  it('closes when clicking outside', async () => {
    renderDropdown();
    await userEvent.click(screen.getByRole('button', { name: 'Theme' }));
    await userEvent.click(screen.getByText('outside'));
    expect(screen.queryByText('Option')).not.toBeInTheDocument();
  });

  it('stays open on outside clicks when closeOnClickAway is false', async () => {
    renderDropdown(false);
    await userEvent.click(screen.getByRole('button', { name: 'Theme' }));
    await userEvent.click(screen.getByText('outside'));
    expect(screen.getByText('Option')).toBeInTheDocument();
  });

  it('defaults its label to "Dropdown"', () => {
    render(<Dropdown>{null}</Dropdown>);
    expect(
      screen.getByRole('button', { name: 'Dropdown' }),
    ).toBeInTheDocument();
  });
});
