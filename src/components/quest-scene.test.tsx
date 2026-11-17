import { render, screen } from '@testing-library/react';
import QuestScene from './quest-scene';

describe('QuestScene', () => {
  it('is a named region holding what happens in the dungeon', () => {
    render(
      <QuestScene label="The Golem’s chamber">
        <p>The Golem waits.</p>
      </QuestScene>,
    );
    const scene = screen.getByRole('region', { name: 'The Golem’s chamber' });
    expect(scene).toHaveTextContent('The Golem waits.');
  });

  it('keeps the torches, lamplight and fog out of the way of screen readers', () => {
    const { container } = render(
      <QuestScene label="Chamber">
        <p>Hi</p>
      </QuestScene>,
    );
    const decor = container.querySelectorAll('[data-decor]');
    expect(decor.length).toBeGreaterThanOrEqual(3);
    decor.forEach((d) => expect(d).toHaveAttribute('aria-hidden', 'true'));
  });
});
