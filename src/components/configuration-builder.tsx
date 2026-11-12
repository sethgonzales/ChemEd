import { useState } from 'react';
import Button from '~/components/button';
import OrbitalDiagram from '~/components/orbital-diagram';
import PeriodicGrid from '~/components/periodic-grid';
import Stage from '~/components/stage';
import type { IElementData } from '~/types';
import {
  checkDiagram,
  cycleBox,
  electronsLabel,
  emptyDiagram,
  formatConfiguration,
  groundState,
  orbitalDiagram,
  parseConfiguration,
  visibleRows,
  type Problem,
} from '~/utils/electron-configurations';

const PICKER_MIN_WIDTH = 280; // px; fits a phone
const LAST_SUBSHELL = '7p'; // every row any element needs; only some are shown

// what Check found, or that no element is picked yet
type Feedback = { correct: boolean; problems: Problem[] } | 'pick';

/**
 * Students pick an element on the periodic table (before or after drawing),
 * draw its orbital diagram by tapping boxes, type its notation, and check.
 */
export default function ConfigurationBuilder() {
  const [element, setElement] = useState<IElementData | null>(null);
  const [diagram, setDiagram] = useState(() => emptyDiagram(LAST_SUBSHELL));
  const [typed, setTyped] = useState('');
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  const target = element && groundState(element.atomicNumber);
  const preview = parseConfiguration(typed);

  // an answer that's been checked goes stale as soon as anything changes
  const edit = (change: () => void) => {
    change();
    setFeedback(null);
  };
  // picking keeps the drawing, so students can draw first and pick after
  const pick = (el: IElementData) => edit(() => setElement(el));
  const check = () =>
    setFeedback(
      element && target
        ? checkDiagram(target, diagram, typed, element.name)
        : 'pick',
    );
  const showAnswer = () => {
    if (!target) return;
    const filled = orbitalDiagram(target);
    edit(() => {
      setDiagram(
        emptyDiagram(LAST_SUBSHELL).map(
          (row) => filled.find((f) => f.subshell === row.subshell) ?? row,
        ),
      );
      setTyped(formatConfiguration(target, { superscripts: false }));
    });
  };
  const clear = () =>
    edit(() => {
      setDiagram(emptyDiagram(LAST_SUBSHELL));
      setTyped('');
    });

  const flagged =
    feedback && feedback !== 'pick'
      ? feedback.problems.map((p) => p.subshell).filter((s): s is string => !!s)
      : [];

  // side by side on desktop, like Explore: the table on the left
  return (
    <div className="flex flex-col lg:flex-row lg:items-start gap-4">
      <div className="w-full max-w-2xl lg:flex-1">
        <PeriodicGrid
          selected={element}
          onSelect={pick}
          compact
          minWidth={PICKER_MIN_WIDTH}
        />
      </div>

      <div className="lg:flex-1 min-w-0 flex flex-col gap-4">
        <Stage label="Your diagram">
          <h3 className="font-pixel text-xl">
            {element
              ? `Draw ${element.name}: ${electronsLabel(element.atomicNumber)}`
              : 'Pick an element, or start drawing'}
          </h3>
          <p className="text-sm text-white/60">
            Tap a box once for ↑, twice for ↑↓, three times to empty it. Lowest
            energy is at the bottom.
          </p>
          <OrbitalDiagram
            diagram={visibleRows(diagram)}
            flagged={flagged}
            onBox={(subshell, box) =>
              edit(() => setDiagram((d) => cycleBox(d, subshell, box)))
            }
          />
          <label className="flex flex-col gap-1 text-sm">
            <span>Notation</span>
            <input
              type="text"
              value={typed}
              onChange={(e) => edit(() => setTyped(e.target.value))}
              placeholder="e.g. 1s2 2s2 2p4"
              autoComplete="off"
              spellCheck={false}
              className="pixel-control px-3 py-2 bg-white text-gray-900 sm:max-w-sm focus-visible:outline-none focus-visible:shadow-[inset_0_0_0_3px_var(--color-secondary-500)]"
            />
          </label>
          {preview && (
            <p className="text-lg">
              {formatConfiguration(preview, {
                shorthand: typed.trim().startsWith('['),
              })}
            </p>
          )}
          {feedback && (
            <div
              role="status"
              className={
                feedback !== 'pick' && feedback.correct
                  ? 'font-bold text-green-300'
                  : 'pixel-control bg-red-500/25 p-3 text-sm text-red-100'
              }
            >
              {feedback === 'pick' ? (
                'Pick the element you drew on the periodic table first.'
              ) : feedback.correct ? (
                `Correct! That’s ${element?.name}’s configuration.`
              ) : (
                <ul className="space-y-1">
                  {feedback.problems.map((p, i) => (
                    <li key={i}>{p.message}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </Stage>

        <div className="flex flex-wrap gap-2">
          <Button pressed onClick={check}>
            Check
          </Button>
          <Button onClick={showAnswer} disabled={!element}>
            Show answer
          </Button>
          <Button onClick={clear}>Clear</Button>
        </div>
      </div>
    </div>
  );
}
