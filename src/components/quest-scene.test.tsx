import { render, screen } from '@testing-library/react';
import QuestScene, { ScenePanel } from './quest-scene';

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

  it('writes everything in the app’s pixel font, so the stylized-text setting reaches it', () => {
    render(
      <QuestScene label="The gate" footer={<p>Enter</p>}>
        <p>Before you go in</p>
      </QuestScene>,
    );
    // font-pixel turns plain when the student picks the readable font
    expect(screen.getByRole('region', { name: 'The gate' })).toHaveClass(
      'font-pixel',
    );
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

  it('is built of mossy stone, lit by a pair of torches, no more', () => {
    const { container } = render(
      <QuestScene label="Chamber">
        <p>Hi</p>
      </QuestScene>,
    );
    const wall = container.querySelector('[data-decor="wall"]')!;
    expect(wall.querySelectorAll('[data-stone]').length).toBeGreaterThan(40);
    expect(wall.querySelectorAll('[data-moss]').length).toBeGreaterThan(0);
    expect(container.querySelectorAll('[data-decor="torch"]')).toHaveLength(2);
  });

  // the wall is positioned, so anything unpositioned would be painted under it
  it('keeps its content and its footer in front of the wall', () => {
    render(
      <QuestScene label="Chamber" footer={<p>Which is it?</p>}>
        <p>The Golem waits.</p>
      </QuestScene>,
    );
    for (const text of ['Which is it?', 'The Golem waits.'])
      expect(
        screen.getByText(text).closest('[data-layer="front"]'),
      ).not.toBeNull();
  });

  it('holds its words on a panel in front of the wall', () => {
    render(<ScenePanel>The Golem waits.</ScenePanel>);
    expect(screen.getByText('The Golem waits.')).toBeInTheDocument();
  });

  it('dresses the wall for the chamber’s boss', () => {
    const { container } = render(
      <QuestScene label="The Wyrm’s chamber" backdrop="states">
        <p>Cold</p>
      </QuestScene>,
    );
    expect(container.querySelector('[data-decor="icicles"]')).not.toBeNull();
  });

  it('is the plain dungeon wall without one', () => {
    const { container } = render(
      <QuestScene label="The map">
        <p>Doors</p>
      </QuestScene>,
    );
    expect(container.querySelector('[data-decor="icicles"]')).toBeNull();
  });

  it('can float in space instead: stars, no wall and no torches', () => {
    const { container } = render(
      <QuestScene label="The map" space>
        <p>Doors</p>
      </QuestScene>,
    );
    expect(container.querySelector('[data-decor="stars"]')).not.toBeNull();
    expect(container.querySelector('[data-decor="wall"]')).toBeNull();
    expect(container.querySelector('[data-decor="torch"]')).toBeNull();
  });

  it('can be a room: the wall behind, and a flagstone floor to stand on, no fake side walls', () => {
    const { container } = render(
      <QuestScene label="The fight" room>
        <p>Boss</p>
      </QuestScene>,
    );
    const floor = container.querySelector('[data-room="floor"]')!;
    const stones = floor.querySelectorAll('[data-flagstone]');
    expect(stones.length).toBeGreaterThan(30);
    // shaded stone by stone, not one flat colour
    const shades = new Set([...stones].map((s) => s.getAttribute('fill')));
    expect(shades.size).toBeGreaterThan(2);
    for (const part of ['left-wall', 'right-wall', 'ceiling'])
      expect(container.querySelector(`[data-room="${part}"]`)).toBeNull();
  });

  it('lays its flagstones in staggered courses, joints not lined up', () => {
    const { container } = render(
      <QuestScene label="The fight" room>
        <p>Boss</p>
      </QuestScene>,
    );
    const courses = new Map<string, number[]>();
    for (const s of container.querySelectorAll<SVGElement>(
      '[data-flagstone]',
    )) {
      const row = s.dataset.course!;
      courses.set(row, [...(courses.get(row) ?? []), Number(s.dataset.u)]);
    }
    const rows = [...courses.values()];
    for (let i = 1; i < rows.length; i++) {
      const joints = rows[i].filter((u) => u > 0);
      const below = new Set(rows[i - 1].map((u) => u.toFixed(2)));
      expect(joints.some((u) => !below.has(u.toFixed(2)))).toBe(true);
    }
  });

  it('draws its torches as 8-bit sprites, their flames flickering frame by frame', () => {
    const { container } = render(
      <QuestScene label="Chamber">
        <p>Hi</p>
      </QuestScene>,
    );
    for (const torch of container.querySelectorAll('[data-decor="torch"]')) {
      const sprite = torch.querySelector('svg')!;
      expect(sprite).toHaveAttribute('shape-rendering', 'crispEdges');
      expect(
        sprite.querySelectorAll('[data-frame]').length,
      ).toBeGreaterThanOrEqual(3);
      expect(sprite.querySelectorAll('rect').length).toBeGreaterThan(20);
    }
  });
});
