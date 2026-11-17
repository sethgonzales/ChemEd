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
import {
  columnsFor,
  mapLayout,
  trailPath,
  type MapStop,
} from '~/utils/quest-trail';
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
      // above the doors and their glow
      className="absolute inset-x-4 top-12 z-30 flex justify-center focus:outline-none"
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

// the map is zoomed out: 2 px per art pixel, not the usual 4
const MAP_ART = 0.5;

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
        'stone-wall pixel-frame flex w-28 cursor-pointer flex-col items-center gap-1.5 p-1.5 sm:w-36 sm:p-2 focus-visible:outline-none',
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
            <PixelArt
              rows={villain.draw(0, 0)}
              palette={villain.palette}
              scale={MAP_ART}
            />
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
          <PixelArt
            rows={villain.draw(0, 0)}
            palette={villain.palette}
            scale={MAP_ART}
          />
        )}
      </span>
      <span className="pixel-control bg-stone-800 px-1.5 pt-0.5 pb-1 text-center font-pixel text-[10px] text-stone-100 sm:px-2 sm:text-xs">
        {topic}
      </span>
      <span className="flex gap-1 text-amber-300" aria-hidden="true">
        {Array.from({ length: MAX_HEARTS }, (_, i) =>
          i < stars ? (
            <IconStarFilled key={i} size={14} />
          ) : (
            <IconStar key={i} size={14} />
          ),
        )}
      </span>
    </button>
  );
}

/** The final gate while it's sealed: the Alchemist in shadow, and how far off it is */
function SealedGate({ cleared, total }: { cleared: number; total: number }) {
  return (
    <div className="stone-wall pixel-frame flex w-28 flex-col items-center gap-1.5 p-1.5 opacity-70 sm:w-36 sm:p-2">
      <span className="door-arch flex w-full justify-center p-2 brightness-0">
        <PixelArt
          rows={ALCHEMIST.draw(0, 0)}
          palette={ALCHEMIST.palette}
          scale={MAP_ART}
        />
      </span>
      <p className="text-center text-[10px] text-stone-100 sm:text-xs">
        The Alchemist’s gate is sealed. Clear every chamber to open it:{' '}
        {cleared} of {total} cleared.
      </p>
    </div>
  );
}

const ROW_HEIGHT = 200; // px for each row of doors
const START_COLUMNS = 3; // before the map's width is known

/** A door's place on the map, centred on its stop */
function Stop({
  at,
  glow = true,
  children,
}: {
  at: MapStop;
  glow?: boolean; // an open door glows; the sealed gate doesn't
  children: ReactNode;
}) {
  return (
    <li
      data-x={at.x}
      className="absolute -translate-1/2"
      style={{ left: `${at.x}%`, top: at.y * ROW_HEIGHT }}
    >
      <div
        data-glow={glow || undefined}
        className={cn('relative z-10', glow && 'quest-glow')}
      >
        {children}
      </div>
    </li>
  );
}

/** As many doors to a row as the map's width has room for */
function useColumns() {
  const ref = useRef<HTMLDivElement>(null);
  const [cols, setCols] = useState(START_COLUMNS);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const watch = new ResizeObserver(([e]) =>
      setCols(columnsFor(e.contentRect.width)),
    );
    watch.observe(el);
    return () => watch.disconnect();
  }, []);
  return [ref, cols] as const;
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
  // every chosen door, then the Alchemist's gate, snaking across the map
  const [mapRef, cols] = useColumns();
  const { stops, rows } = mapLayout(n + 1, cols);
  const door = (d: DoorInfo, i: number) => {
    const stars = best[d.id] ?? 0;
    return (
      <Stop key={d.id} at={stops[i]}>
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
      space
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
      <div
        ref={mapRef}
        className="relative mx-4 my-2"
        style={{ height: rows * ROW_HEIGHT }}
      >
        {/* the trail, door to door, behind them */}
        <svg
          aria-hidden="true"
          viewBox={`0 0 100 ${rows}`}
          preserveAspectRatio="none"
          className="pointer-events-none absolute inset-0 h-full w-full"
        >
          {stops.slice(1).map((b, i) => (
            <path
              key={i}
              data-trail
              d={trailPath(stops[i], b, cols)}
              fill="none"
              stroke="#d6c7b0"
              strokeOpacity={0.6}
              strokeWidth={6}
              strokeLinecap="round"
              strokeDasharray="0.1 14"
              vectorEffect="non-scaling-stroke"
            />
          ))}
        </svg>
        <ol>
          {chosen.map(door)}
          {open ? (
            door(FINAL, n)
          ) : (
            <Stop key={FINAL.id} at={stops[n]} glow={false}>
              <SealedGate cleared={cleared} total={n} />
            </Stop>
          )}
        </ol>
      </div>
    </QuestScene>
  );
}
