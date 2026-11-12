import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Dropdown, { DropdownItem } from './dropdown';

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

  it('closes with Escape', async () => {
    renderDropdown();
    await userEvent.click(screen.getByRole('button', { name: 'Theme' }));
    await userEvent.keyboard('{Escape}');
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

  it('closes once an item is chosen', async () => {
    const onSelect = jest.fn();
    render(
      <Dropdown label="Level 1">
        <DropdownItem selected onSelect={onSelect}>
          Level 1
        </DropdownItem>
        <DropdownItem onSelect={onSelect}>Level 2</DropdownItem>
      </Dropdown>,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Level 1' }));
    await userEvent.click(screen.getByRole('button', { name: 'Level 2' }));
    expect(onSelect).toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: 'Level 2' })).toBeNull();
  });

  it('marks the selected item', async () => {
    render(
      <Dropdown label="Pick">
        <DropdownItem selected onSelect={() => {}}>
          Chosen
        </DropdownItem>
        <DropdownItem onSelect={() => {}}>Other</DropdownItem>
      </Dropdown>,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Pick' }));
    expect(screen.getByRole('button', { name: 'Chosen' })).toHaveAttribute(
      'aria-current',
      'true',
    );
    expect(screen.getByRole('button', { name: 'Other' })).not.toHaveAttribute(
      'aria-current',
    );
  });

  it('can be named separately from what it shows, and says when it is open', async () => {
    render(
      <Dropdown label="Water" ariaLabel="Molecule: Water">
        <li>Option</li>
      </Dropdown>,
    );
    const button = screen.getByRole('button', { name: 'Molecule: Water' });
    expect(button).toHaveAttribute('aria-expanded', 'false');
    await userEvent.click(button);
    expect(button).toHaveAttribute('aria-expanded', 'true');
  });
});
