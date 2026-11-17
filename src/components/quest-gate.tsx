import { useEffect, useState } from 'react';
import Button from '~/components/button';
import QuestScene from '~/components/quest-scene';
import Setting from '~/components/setting';
import { CHAMBERS, CHAMBER_IDS } from '~/constants/quest-chambers';
import { QUEST_PAGE } from '~/constants/guide-tips';
import {
  COURSES,
  setupQuery,
  type Course,
  type QuestSetup,
} from '~/utils/quest';

interface Props {
  initial: QuestSetup;
  onEnter: (setup: QuestSetup) => void;
}

/**
 * The dungeon's gate: tick the topics the class has covered and pick the
 * course, so the quest only asks what the class has learned
 */
export default function QuestGate({ initial, onEnter }: Props) {
  const [topics, setTopics] = useState(initial.topics);
  const [course, setCourse] = useState<Course>(initial.course);
  const [origin, setOrigin] = useState('');
  useEffect(() => setOrigin(window.location.origin), []);

  const toggle = (id: string, on: boolean) =>
    setTopics((now) =>
      CHAMBER_IDS.filter((c) => (c === id ? on : now.includes(c))),
    );
  const setup = { topics, course };
  const link = `${origin}${QUEST_PAGE}${setupQuery(setup)}`;

  return (
    <QuestScene
      label="The dungeon’s gate"
      footer={
        <div className="flex flex-col items-center gap-2">
          {!topics.length && (
            <p className="text-sm font-semibold text-red-100">
              Tick at least one topic.
            </p>
          )}
          <Button
            pressed
            disabled={!topics.length}
            onClick={() => onEnter(setup)}
          >
            Enter the dungeon
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-5 px-6 pt-12 pb-2 text-stone-100 sm:px-12">
        <p>
          Before you go in: which topics has your class covered, and which
          course are you taking?
        </p>

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 font-semibold">Topics</legend>
          <div className="flex gap-2">
            <Button onClick={() => setTopics(CHAMBER_IDS)}>All</Button>
            <Button onClick={() => setTopics([])}>None</Button>
          </div>
          {CHAMBERS.map((c) => (
            <Setting
              key={c.id}
              checked={topics.includes(c.id)}
              onChange={(on) => toggle(c.id, on)}
            >
              {c.topic}
            </Setting>
          ))}
        </fieldset>

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 font-semibold">Course</legend>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(COURSES) as Course[]).map((id) => (
              <Button
                key={id}
                pressed={course === id}
                onClick={() => setCourse(id)}
              >
                {COURSES[id]}
              </Button>
            ))}
          </div>
        </fieldset>

        <label className="flex flex-col gap-1 text-sm">
          Link for your class
          <input
            type="text"
            readOnly
            value={link}
            onFocus={(e) => e.target.select()}
            className="pixel-control bg-white px-3 py-2 text-gray-900"
          />
        </label>
      </div>
    </QuestScene>
  );
}
