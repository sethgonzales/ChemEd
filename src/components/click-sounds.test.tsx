import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { flushSync } from 'react-dom';
import { ELEMENTS } from '~/constants/elements';
import { ThemeProvider } from '~/styles/theme-provider';
import { cycleBox, emptyDiagram } from '~/utils/electron-configurations';
import Card from './card';
import ClickSounds from './click-sounds';
import Dropdown, { DropdownItem } from './dropdown';
import ElementPicker from './element-picker';
import Header from './header';
import OrbitalDiagram from './orbital-diagram';
import PeriodicGrid from './periodic-grid';
import Tabs from './tabs';

// every sound a click can make, so a test hears exactly what played
const mockPlayClick = jest.fn();
jest.mock('~/utils/sounds', () => ({
  ...jest.requireActual('~/utils/sounds'),
  playClick: (kind: string) => mockPlayClick(kind),
  useTick: () => () => mockPlayClick('tick'),
  useTap: () => () => mockPlayClick('tap'),
  useBloop: () => () => mockPlayClick('bloop'),
  useDoorSound: () => () => mockPlayClick('door'),
}));

beforeEach(() => mockPlayClick.mockClear());

const renderWith = (ui: React.ReactNode) =>
  render(
    <>
      <ClickSounds />
      {ui}
    </>,
  );

describe('ClickSounds', () => {
  it('ticks when any button is clicked', async () => {
    renderWith(<button type="button">Check</button>);
    await userEvent.click(screen.getByRole('button', { name: 'Check' }));
    expect(mockPlayClick).toHaveBeenCalledWith('tick');
  });

  it('ticks when a button is pressed from the keyboard', async () => {
    renderWith(<button type="button">Check</button>);
    screen.getByRole('button').focus();
    await userEvent.keyboard('{Enter}');
    expect(mockPlayClick).toHaveBeenCalledWith('tick');
  });

  it('ticks when a checkbox is toggled', async () => {
    renderWith(
      <label>
        <input type="checkbox" /> Show charges
      </label>,
    );
    await userEvent.click(screen.getByRole('checkbox'));
    expect(mockPlayClick).toHaveBeenCalledWith('tick');
  });

  it('taps for buttons that pick something, even clicked on their text', async () => {
    renderWith(
      <button type="button" data-sound="tap">
        <span>Fe</span>
      </button>,
    );
    await userEvent.click(screen.getByText('Fe'));
    expect(mockPlayClick).toHaveBeenCalledWith('tap');
  });

  it('ticks even when the click swaps what was clicked (a mute icon)', async () => {
    function Toggle() {
      const [on, setOn] = useState(false);
      return (
        // browsers repaint before the page hears the click; flushSync does the same here
        <button type="button" onClick={() => flushSync(() => setOn(!on))}>
          {on ? (
            <svg key="on" data-testid="icon" />
          ) : (
            <svg key="off" data-testid="icon" />
          )}
        </button>
      );
    }
    renderWith(<Toggle />);
    await userEvent.click(screen.getByTestId('icon'));
    expect(mockPlayClick).toHaveBeenCalledWith('tick');
  });

  it('stays quiet for buttons with their own sound', async () => {
    renderWith(
      <button type="button" data-sound="none">
        Open door
      </button>,
    );
    await userEvent.click(screen.getByRole('button'));
    expect(mockPlayClick).not.toHaveBeenCalled();
  });

  it('stays quiet for disabled buttons and plain text', async () => {
    renderWith(
      <>
        <button type="button" disabled>
          Next
        </button>
        <button type="button" aria-disabled="true">
          Sealed
        </button>
        <p>Just words</p>
      </>,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Sealed' }));
    await userEvent.click(screen.getByText('Just words'));
    expect(mockPlayClick).not.toHaveBeenCalled();
  });

  it('stops listening once it’s gone', async () => {
    const { unmount } = renderWith(<p>placeholder</p>);
    unmount();
    render(<button type="button">Check</button>);
    await userEvent.click(screen.getByRole('button'));
    expect(mockPlayClick).not.toHaveBeenCalled();
  });
});

describe('the sounds each control makes', () => {
  const heard = () => mockPlayClick.mock.calls.map(([kind]) => kind);

  it('header tiles bloop, without a tick on top', async () => {
    renderWith(
      <ThemeProvider>
        <Header page="/" />
      </ThemeProvider>,
    );
    await userEvent.click(screen.getByText('C'));
    expect(heard()).toEqual(['bloop']);
  });

  it('doors thud, without a tick on top', async () => {
    renderWith(
      <Card
        title="Lewis Structures"
        color="#3b82f6"
        art="lewis"
        ready
        onClick={jest.fn()}
      />,
    );
    await userEvent.click(
      screen.getByRole('button', { name: 'Lewis Structures' }),
    );
    expect(heard()).toEqual(['door']);
  });

  it('dropdowns open quietly and tick when an option is chosen', async () => {
    renderWith(
      <Dropdown label="Water">
        <DropdownItem onSelect={jest.fn()}>Benzene</DropdownItem>
      </Dropdown>,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Water' }));
    expect(heard()).toEqual([]);
    await userEvent.click(screen.getByRole('button', { name: 'Benzene' }));
    expect(heard()).toEqual(['tick']);
  });

  it('tabs tick when chosen, by click or arrow key', async () => {
    renderWith(
      <Tabs
        label="Mode"
        tabs={[
          { id: 'a', label: 'Explore', content: <p>a</p> },
          { id: 'b', label: 'Sort', content: <p>b</p> },
        ]}
      />,
    );
    await userEvent.click(screen.getByRole('tab', { name: 'Sort' }));
    expect(heard()).toEqual(['tick']);
    await userEvent.keyboard('{ArrowLeft}');
    expect(heard()).toEqual(['tick', 'tick']);
  });

  it('periodic table elements tap when picked, by click or arrow key', async () => {
    renderWith(
      <PeriodicGrid selected={ELEMENTS[0]} onSelect={jest.fn()} minWidth={0} />,
    );
    await userEvent.click(screen.getByText('He'));
    expect(heard()).toEqual(['tap']);
    screen.getByText('He').closest('button')!.focus();
    await userEvent.keyboard('{ArrowDown}');
    expect(heard()).toEqual(['tap', 'tap']);
  });

  it('the element picker taps when an element is chosen', async () => {
    renderWith(
      <ElementPicker
        elements={ELEMENTS.slice(0, 10)}
        onPick={jest.fn()}
        onClose={jest.fn()}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Neon (Ne)' }));
    expect(heard()).toEqual(['tap']);
  });

  it('orbital boxes tap when filled', async () => {
    renderWith(
      <OrbitalDiagram
        diagram={cycleBox(emptyDiagram('2p'), '2p', 0)}
        onBox={jest.fn()}
      />,
    );
    await userEvent.click(
      screen.getByRole('button', { name: '2p box 2: empty' }),
    );
    expect(heard()).toEqual(['tap']);
  });
});
