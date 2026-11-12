import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { THEME } from '~/styles/theme';
import { ThemeProvider } from '~/styles/theme-provider';
import { ThemeSelect } from './theme-select';

beforeEach(() => localStorage.clear());

describe('ThemeSelect', () => {
  it('lists every theme and switches to the one chosen', async () => {
    render(
      <ThemeProvider>
        <ThemeSelect />
      </ThemeProvider>,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Dungeon' }));
    for (const { label } of Object.values(THEME)) {
      expect(
        screen.getAllByRole('button', { name: label }).length,
      ).toBeGreaterThan(0);
    }

    await userEvent.click(screen.getByRole('button', { name: 'Jaguars' }));
    expect(
      screen.getAllByRole('button', { name: 'Jaguars' })[0],
    ).toBeInTheDocument();
    expect(localStorage.getItem('chem.theme')).toBe('teal');
  });
});
