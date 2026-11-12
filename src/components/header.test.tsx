import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from '~/styles/theme-provider';
import Header from './header';

const playBloop = jest.fn();
jest.mock('~/utils/sounds', () => ({
  ...jest.requireActual('~/utils/sounds'),
  useBloop: () => playBloop,
}));

beforeEach(() => playBloop.mockClear());

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
    expect(screen.getByRole('link', { name: 'ChemEd home' })).toHaveAttribute(
      'href',
      '/',
    );
  });

  it('bloops when an element tile is clicked, but not on hover', async () => {
    renderHeader();
    await userEvent.hover(screen.getByText('Carbon'));
    expect(playBloop).not.toHaveBeenCalled();
    await userEvent.click(screen.getByText('Carbon'));
    expect(playBloop).toHaveBeenCalled();
  });

  it('has a mute switch for the sounds', () => {
    renderHeader();
    expect(
      screen.getByRole('button', { name: 'Mute sounds' }),
    ).toBeInTheDocument();
  });

  it('includes the theme selector', () => {
    renderHeader();
    expect(screen.getByRole('button', { name: 'Dungeon' })).toBeInTheDocument();
  });

  it('shows a synthetic element’s mass number in brackets', () => {
    renderHeader();
    expect(screen.getByText('[268]')).toBeInTheDocument(); // dubnium
  });
});
