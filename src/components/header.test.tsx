import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from '~/styles/theme-provider';
import Header from './header';

const playBloop = jest.fn();
jest.mock('~/utils/sounds', () => ({
  ...jest.requireActual('~/utils/sounds'),
  useBloop: () => playBloop,
}));

beforeEach(() => playBloop.mockClear());

function renderHeader(page = '/') {
  render(
    <ThemeProvider>
      <Header page={page} />
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

  it('has a sound button for the volume', () => {
    renderHeader();
    expect(screen.getByRole('button', { name: 'Sound' })).toBeInTheDocument();
  });

  describe('scrolling down the page', () => {
    const scrollTo = (y: number) =>
      act(() => {
        Object.assign(window, { scrollY: y });
        window.dispatchEvent(new Event('scroll'));
      });

    beforeEach(() =>
      Object.defineProperty(document.documentElement, 'scrollHeight', {
        configurable: true,
        value: 5000,
      }),
    );
    afterEach(() => scrollTo(0));

    it('shrinks to symbols beside its buttons, and grows back at the top', () => {
      renderHeader();
      scrollTo(400);
      expect(screen.queryByText('Carbon')).not.toBeInTheDocument();
      expect(screen.getByText('He')).toBeInTheDocument();
      expect(
        screen.getByRole('link', { name: 'ChemEd home' }),
      ).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Sound' })).toBeInTheDocument();

      scrollTo(0);
      expect(screen.getByText('Carbon')).toBeInTheDocument();
    });
  });

  it('stays slim inside a simulation, even at the top of the page', () => {
    renderHeader('/periodic-table');
    expect(screen.queryByText('Carbon')).not.toBeInTheDocument();
    expect(screen.getByText('He')).toBeInTheDocument();
  });

  it('has a switch for the readable font', () => {
    renderHeader();
    expect(
      screen.getByRole('button', { name: 'Readable font' }),
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
