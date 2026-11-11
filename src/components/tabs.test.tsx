import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import Tabs from './tabs';

function Counter() {
  const [n, setN] = useState(0);
  return <button onClick={() => setN(n + 1)}>Clicked {n}</button>;
}

function renderTabs() {
  render(
    <Tabs
      label="Mode"
      tabs={[
        { id: 'draw', label: 'Draw', content: <Counter /> },
        { id: 'quiz', label: 'Quiz', content: <p>Quiz content</p> },
        { id: 'help', label: 'Help', content: <p>Help content</p> },
      ]}
    />,
  );
}

describe('Tabs', () => {
  it('shows the first tab’s panel to begin with', () => {
    renderTabs();
    expect(screen.getByRole('tablist', { name: 'Mode' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Draw' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(screen.getByRole('tabpanel')).toHaveAccessibleName('Draw');
    expect(screen.queryByText('Quiz content')).not.toBeVisible();
  });

  it('switches panels when a tab is clicked', async () => {
    renderTabs();
    await userEvent.click(screen.getByRole('tab', { name: 'Quiz' }));
    expect(screen.getByRole('tabpanel')).toHaveAccessibleName('Quiz');
    expect(screen.getByText('Quiz content')).toBeVisible();
  });

  it('keeps each panel’s state when switching away and back', async () => {
    renderTabs();
    await userEvent.click(screen.getByRole('button', { name: 'Clicked 0' }));
    await userEvent.click(screen.getByRole('tab', { name: 'Quiz' }));
    await userEvent.click(screen.getByRole('tab', { name: 'Draw' }));
    expect(screen.getByRole('button', { name: 'Clicked 1' })).toBeVisible();
  });

  it('moves between tabs with the arrow keys, wrapping round', async () => {
    renderTabs();
    screen.getByRole('tab', { name: 'Draw' }).focus();
    await userEvent.keyboard('{ArrowRight}');
    expect(screen.getByRole('tab', { name: 'Quiz' })).toHaveFocus();
    expect(screen.getByRole('tab', { name: 'Quiz' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    await userEvent.keyboard('{ArrowLeft}{ArrowLeft}');
    expect(screen.getByRole('tab', { name: 'Help' })).toHaveFocus();
  });

  it('only lets the selected tab be tabbed to', () => {
    renderTabs();
    expect(screen.getByRole('tab', { name: 'Draw' })).toHaveAttribute(
      'tabindex',
      '0',
    );
    expect(screen.getByRole('tab', { name: 'Quiz' })).toHaveAttribute(
      'tabindex',
      '-1',
    );
  });

  it('can be controlled by its parent', async () => {
    const onSelect = jest.fn();
    render(
      <Tabs
        label="Mode"
        selected="quiz"
        onSelect={onSelect}
        tabs={[
          { id: 'draw', label: 'Draw', content: <p>Draw content</p> },
          { id: 'quiz', label: 'Quiz', content: <p>Quiz content</p> },
        ]}
      />,
    );
    expect(screen.getByRole('tab', { name: 'Quiz' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    await userEvent.click(screen.getByRole('tab', { name: 'Draw' }));
    expect(onSelect).toHaveBeenCalledWith('draw');
  });
});
