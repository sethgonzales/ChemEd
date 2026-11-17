import { IconStar, IconStarFilled } from '@tabler/icons-react';
import Button from '~/components/button';
import PixelArt from '~/components/pixel-art';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import QuestScene, { ScenePanel } from '~/components/quest-scene';
import type { VillainArt } from '~/components/villain';
import { CHAMBERS } from '~/constants/quest-chambers';
import { ALCHEMIST_ID, alchemistOpen } from '~/constants/quest-final';
import { ALCHEMIST } from '~/constants/villains/alchemist';
import { cn } from '~/utils/cn';
import { trailX } from '~/utils/quest-trail';
import { useEscape } from '~/utils/use-escape';
import {
  COURSES,
  MAX_HEARTS,
  type Progress,
  type QuestSetup,
} from '~/utils/quest';

interface Props {
  setup: QuestSetup;
  progress: Progress;
  onPick: (id: string) => void;
  onChange: () => void; // back to the gate
}

/** Asks before replaying a beaten chamber; it floats over the map, so nothing moves */
function ReplayPrompt({
  name,
  stars,
  onRestart,
  onCancel,
}: {
  name: string;
  stars: number;
  onRestart: () => void;
  onCancel: () => void;
}) {
  // focus moves to the question, so keyboard and screen reader users meet it
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => box.current?.focus(), []);
  useEscape(onCancel);
  return (
    <div
      ref={box}
      tabIndex={-1}
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="replay-title"
      aria-describedby="replay-text"
      className="absolute inset-x-4 top-12 z-10 flex justify-center focus:outline-none"
    >
      <ScenePanel className="flex max-w-sm flex-col items-center gap-3 text-center">
        <h3 id="replay-title" className="font-pixel text-2xl text-amber-200">
          Replay this chamber?
        </h3>
        <p id="replay-text">
          You’ve already beaten {name}, with {stars} of {MAX_HEARTS} stars.
          Restarting starts it over from the first door; you keep your best
          stars.
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          <Button pressed onClick={onRestart}>
            Restart the chamber
          </Button>
          <Button onClick={onCancel}>Not now</Button>
        </div>
      </ScenePanel>
    </div>
  );
}

interface DoorInfo {
  id: string;
  topic: string;
  villain: VillainArt;
}

const FINAL: DoorInfo = {
  id: ALCHEMIST_ID,
  topic: 'The Final Chamber',
  villain: ALCHEMIST,
};

/** A chamber's door: its boss, standing or crossed out, and its stars */
function Door({
  door,
  stars,
  onOpen,
}: {
  door: DoorInfo;
  stars: number;
  onOpen: () => void;
}) {
  const { topic, villain } = door;
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`${topic}: ${villain.name}, ${
        stars ? `beaten, ${stars} of ${MAX_HEARTS} stars` : 'not cleared yet'
      }`}
      className={cn(
        'stone-wall pixel-frame flex w-64 cursor-pointer flex-col items-center gap-2 p-3 focus-visible:outline-none',
        // beaten chambers fade, but can still be replayed
        stars > 0 && 'opacity-80 saturate-50 hover:opacity-100',
      )}
    >
      <span className="door-arch flex w-full justify-center p-2">
        {stars ? (
          <span
            role="img"
            aria-label={`${villain.name}, defeated`}
            className="relative inline-block"
          >
            <PixelArt rows={villain.draw(0, 0)} palette={villain.palette} />
            <svg
              data-cross
              aria-hidden="true"
              viewBox="0 0 10 10"
              className="absolute inset-0 h-full w-full"
            >
              <path
                d="M1.5 1.5 8.5 8.5M8.5 1.5 1.5 8.5"
                stroke="#dc2626"
                strokeWidth="1"
                strokeLinecap="square"
              />
            </svg>
          </span>
        ) : (
          <PixelArt rows={villain.draw(0, 0)} palette={villain.palette} />
        )}
      </span>
      <span className="pixel-control bg-stone-800 px-3 pt-1 pb-1.5 font-pixel text-lg text-stone-100">
        {topic}
      </span>
      <span className="flex gap-1 text-amber-300" aria-hidden="true">
        {Array.from({ length: MAX_HEARTS }, (_, i) =>
          i < stars ? (
            <IconStarFilled key={i} size={18} />
          ) : (
            <IconStar key={i} size={18} />
          ),
        )}
      </span>
    </button>
  );
}

/** The final gate while it's sealed: the Alchemist in shadow, and how far off it is */
function SealedGate({ cleared, total }: { cleared: number; total: number }) {
  return (
    <div className="stone-wall pixel-frame flex w-64 flex-col items-center gap-2 p-3 opacity-70">
      <span className="door-arch flex w-full justify-center p-2 brightness-0">
        <PixelArt rows={ALCHEMIST.draw(0, 0)} palette={ALCHEMIST.palette} />
      </span>
      <p className="text-center text-sm text-stone-100">
        The Alchemist’s gate is sealed. Clear every chamber to open it:{' '}
        {cleared} of {total} cleared.
      </p>
    </div>
  );
}

const STEPS = 6; // stepping stones between two doors

// a point along the trail's curve from one door to the next, at t (0 to 1):
// x in % across, y in % down the stretch
function along(from: number, to: number, t: number) {
  const s = 1 - t;
  const bezier = (a: number, b: number, c: number, d: number) =>
    s * s * s * a + 3 * s * s * t * b + 3 * s * t * t * c + t * t * t * d;
  return { x: bezier(from, from, to, to), y: bezier(0, 60, 40, 100) };
}

/**
 * A stop on the trail: its door set across the map at x (% of the width), and
 * the trail on to the next stop, if there is one. On a phone, where a door
 * fills the width, the trail runs straight down.
 */
function Stop({
  x: x0,
  next,
  children,
}: {
  x: number;
  next?: number;
  children: ReactNode;
}) {
  return (
    <li data-x={x0} className="flex w-full flex-col items-center">
      <div
        className="relative"
        style={{ left: `calc((${x0}% - 50%) * var(--sway))` }}
      >
        {children}
      </div>
      {next !== undefined && (
        <div data-trail aria-hidden="true" className="relative h-16 w-full">
          {Array.from({ length: STEPS }, (_, k) => {
            const { x, y } = along(x0, next, (k + 0.5) / STEPS);
            return (
              <span
                key={k}
                className="absolute h-2.5 w-5 -translate-1/2 rounded-full bg-[#d6c7b0]/50"
                // straight down on a phone, winding where there's room
                style={{
                  left: `calc(50% + (${x}% - 50%) * var(--sway))`,
                  top: `${y}%`,
                }}
              />
            );
          })}
        </div>
      )}
    </li>
  );
}

/**
 * The chosen chambers' doors, in topic order (any one can be played), then
 * the Alchemist's gate, which opens once they're all cleared
 */
export default function QuestMap({ setup, progress, onPick, onChange }: Props) {
  const chosen = CHAMBERS.filter((c) => setup.topics.includes(c.id));
  const best = progress[setup.course] ?? {};
  const n = chosen.length;
  const cleared = chosen.filter((c) => (best[c.id] ?? 0) > 0).length;
  const open = alchemistOpen(setup.topics, progress, setup.course);
  // a beaten chamber the student tapped, waiting for them to confirm a replay
  const [replaying, setReplaying] = useState<DoorInfo | null>(null);
  // every chosen door, then the Alchemist's gate, along a winding trail
  const stops = n + 1;
  const at = (i: number) => ({
    x: trailX(i, stops),
    next: i + 1 < stops ? trailX(i + 1, stops) : undefined,
  });
  const door = (d: DoorInfo, i: number) => {
    const stars = best[d.id] ?? 0;
    return (
      <Stop key={d.id} {...at(i)}>
        <Door
          door={d}
          stars={stars}
          onOpen={() => (stars ? setReplaying(d) : onPick(d.id))}
        />
      </Stop>
    );
  };

  return (
    <QuestScene
      label="The dungeon map"
      footer={
        <div className="flex flex-wrap items-center justify-center gap-3 text-sm text-stone-200">
          <span>
            {n} {n === 1 ? 'topic' : 'topics'} · {COURSES[setup.course]}
          </span>
          <Button onClick={onChange}>Change</Button>
        </div>
      }
    >
      {replaying && (
        <ReplayPrompt
          name={replaying.villain.name}
          stars={best[replaying.id] ?? 0}
          onRestart={() => onPick(replaying.id)}
          onCancel={() => setReplaying(null)}
        />
      )}
      <ol className="flex flex-col items-center px-6 pt-12 pb-4 [--sway:0] sm:[--sway:1]">
        {chosen.map(door)}
        {open ? (
          door(FINAL, n)
        ) : (
          <Stop key={FINAL.id} {...at(n)}>
            <SealedGate cleared={cleared} total={n} />
          </Stop>
        )}
      </ol>
    </QuestScene>
  );
}
