import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from '~/styles/theme-provider';
import Header from './header';

const playChime = jest.fn();
jest.mock('~/utils/sounds', () => ({ useChime: () => playChime }));

function renderHeader() {
  render(
    <ThemeProvider>
      <Header />
    </ThemeProvider>,
  );
}

describe('Header', () => {
  it('spells out ChemEd with element tiles', () => {
    renderHeader();
    for (const name of [
      'Carbon',
      'Helium',
      'Manganese',
      'Europium',
      'Dubnium',
    ]) {
      expect(screen.getByText(name)).toBeInTheDocument();
    }
  });

  it('links to the home page', () => {
    renderHeader();
    expect(screen.getAllByRole('link')[0]).toHaveAttribute('href', '/');
  });

  it('plays a chime when an element tile is hovered', async () => {
    renderHeader();
    await userEvent.hover(screen.getByText('Carbon'));
    expect(playChime).toHaveBeenCalled();
  });

  it('includes the theme selector', () => {
    renderHeader();
    expect(screen.getByRole('button', { name: 'Default' })).toBeInTheDocument();
  });
});
