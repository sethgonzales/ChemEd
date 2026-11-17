import { useEffect, useMemo, useState } from 'react';
import Button from '~/components/button';
import Container from '~/components/container';
import QuestChamber from '~/components/quest-chamber';
import QuestGate from '~/components/quest-gate';
import QuestMap from '~/components/quest-map';
import Setting from '~/components/setting';
import { CHAMBERS, CHAMBER_IDS, findChamber } from '~/constants/quest-chambers';
import { ALCHEMIST_ID, alchemistChamber } from '~/constants/quest-final';
import {
  COURSES,
  parseSetup,
  recordClear,
  type Course,
  type Progress,
  type QuestSetup,
} from '~/utils/quest';
import {
  loadProgress,
  loadSetup,
  saveProgress,
  saveSetup,
} from '~/utils/quest-storage';
import { QUESTION_SOURCES } from '~/utils/quest-sources';
import { useMusic, useMusicSetting } from '~/utils/music-player';

type View =
  | { at: 'gate' }
  | { at: 'map' }
  | { at: 'chamber'; id: string; course: Course; seed: number };

// a fresh seed for each play: new rooms and new questions
const newSeed = () => Math.floor(Math.random() * 2 ** 32);

const ALL: QuestSetup = { topics: CHAMBER_IDS, course: 'general' };

/**
 * Where a visit starts: a chamber link opens its story, a setup link fills in
 * the gate, and otherwise the saved setup goes straight to the map
 */
function arrive(query: string): { setup: QuestSetup; view: View } {
  const params = new URLSearchParams(query);
  const saved = loadSetup(CHAMBER_IDS);
  const chamber = params.get('chamber');
  if (chamber && (chamber === ALCHEMIST_ID || findChamber(chamber))) {
    const { course } = parseSetup(query, CHAMBER_IDS);
    return {
      setup: saved ?? { ...ALL, course },
      view: { at: 'chamber', id: chamber, course, seed: newSeed() },
    };
  }
  if (params.has('topics') || params.has('course'))
    return { setup: parseSetup(query, CHAMBER_IDS), view: { at: 'gate' } };
  return saved
    ? { setup: saved, view: { at: 'map' } }
    : { setup: ALL, view: { at: 'gate' } };
}

export default function DungeonQuest() {
  const [setup, setSetup] = useState<QuestSetup>(ALL);
  const [progress, setProgress] = useState<Progress>({});
  const [view, setView] = useState<View | null>(null); // read on mount
  const [stage, setStage] = useState<string>('story'); // the chamber's, for the music
  const [musicOn, toggleMusic] = useMusicSetting();
  const fighting = view?.at === 'chamber' && stage === 'boss';
  useMusic(musicOn && view ? (fighting ? 'boss' : 'dungeon') : null);

  useEffect(() => {
    const start = arrive(window.location.search);
    setSetup(start.setup);
    setView(start.view);
    setProgress(loadProgress());
  }, []);

  const enter = (s: QuestSetup) => {
    saveSetup(s);
    setSetup(s);
    setView({ at: 'map' });
  };

  const clear = (id: string, course: Course, stars: number) =>
    setProgress((p) => {
      const next = recordClear(p, course, id, stars);
      saveProgress(next);
      return next;
    });

  // the Alchemist's chamber is built from the setup, fresh for each play
  const chamber = useMemo(() => {
    if (view?.at !== 'chamber') return undefined;
    return view.id === ALCHEMIST_ID
      ? alchemistChamber(setup.topics, view.course, view.seed)
      : findChamber(view.id);
  }, [view, setup.topics]);
  // cite the facts behind the chambers in play: this one, or every chosen
  // one (the Alchemist asks from them all)
  const chosen = CHAMBERS.filter((c) => setup.topics.includes(c.id));
  const cited = (
    chamber && chamber.id !== ALCHEMIST_ID ? [chamber] : chosen
  ).flatMap((c) => QUESTION_SOURCES[c.page].sources);

  return (
    <Container
      header="Dungeon Quest"
      description="Fight through the chambers: solve each room, then answer the boss’s questions to beat it."
      backHref="/"
      sources={cited}
      className="gap-4"
    >
      {view?.at === 'gate' && <QuestGate initial={setup} onEnter={enter} />}
      {view?.at === 'map' && (
        <QuestMap
          setup={setup}
          progress={progress}
          onPick={(id) =>
            setView({
              at: 'chamber',
              id,
              course: setup.course,
              seed: newSeed(),
            })
          }
          onChange={() => setView({ at: 'gate' })}
        />
      )}
      {view?.at === 'chamber' && chamber && (
        <>
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <Button onClick={() => setView({ at: 'map' })}>
              Leave the chamber
            </Button>
            <span>
              {chamber.topic} · {COURSES[view.course]}
            </span>
          </div>
          <QuestChamber
            key={view.seed}
            chamber={chamber}
            course={view.course}
            seed={view.seed}
            onClear={(stars) => clear(chamber.id, view.course, stars)}
            onExit={() => setView({ at: 'map' })}
            onReplay={() => setView({ ...view, seed: newSeed() })}
            onStage={setStage}
          />
        </>
      )}
      <Setting checked={musicOn} onChange={toggleMusic}>
        Music
      </Setting>
    </Container>
  );
}
