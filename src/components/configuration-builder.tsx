import { useState } from 'react';
import { IconMinus, IconPlus } from '@tabler/icons-react';
import Button from '~/components/button';
import { useGuide } from '~/components/guide';
import OrbitalDiagram from '~/components/orbital-diagram';
import PeriodicGrid from '~/components/periodic-grid';
import Stage from '~/components/stage';
import { BESIDE_HEADER } from '~/constants/layout';
import { cn } from '~/utils/cn';
import type { IElementData } from '~/types';
import {
  checkDiagram,
  cycleBox,
  electronsLabel,
  emptyDiagram,
  formatConfiguration,
  groundState,
  ionConfiguration,
  ionSymbol,
  orbitalDiagram,
  parseConfiguration,
  visibleRows,
  type Problem,
} from '~/utils/electron-configurations';
import { CONFIGURATION_NUDGE, configurationMessage } from '~/utils/guide';
import { useGuideNudge } from '~/utils/use-guide-message';

const PICKER_MIN_WIDTH = 280; // px; fits a phone
const LAST_SUBSHELL = '7p'; // every row any element needs; only some are shown
const MAX_CHARGE = 3; // school ions run from 3− (N³⁻) to 3+ (Al³⁺, Fe³⁺)

// what Check found, or that no element is picked yet
type Feedback = { correct: boolean; problems: Problem[] } | 'pick';

// "0", "2+", "1−", as chemists say a charge
const chargeText = (charge: number) =>
  charge === 0 ? '0' : `${Math.abs(charge)}${charge > 0 ? '+' : '−'}`;

/**
 * Students pick an element on the periodic table (before or after drawing),
 * optionally make it an ion, draw its orbital diagram by tapping boxes, type
 * its notation, and check.
 */
export default function ConfigurationBuilder() {
  const [element, setElement] = useState<IElementData | null>(null);
  const [charge, setCharge] = useState(0);
  const [diagram, setDiagram] = useState(() => emptyDiagram(LAST_SUBSHELL));
  const [typed, setTyped] = useState('');
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  const z = element?.atomicNumber ?? 0;
  const target =
    element && (charge ? ionConfiguration(z, charge) : groundState(z));
  // a neutral atom goes by its name, an ion by its symbol and charge
  const label =
    element && (charge ? ionSymbol(element.symbol, charge) : element.name);
  // never take away every electron (H⁺ has none to draw)
  const maxCharge = Math.min(MAX_CHARGE, z - 1);
  const preview = parseConfiguration(typed);

  const { say, visible: guideShowing } = useGuide();
  // Mr. G offers a way forward once if a student draws for a while without checking
  const [started, setStarted] = useState(false);
  const [checked, setChecked] = useState(false);
  useGuideNudge(started && !checked, CONFIGURATION_NUDGE);

  // an answer that's been checked goes stale as soon as anything changes
  const edit = (change: () => void) => {
    change();
    setFeedback(null);
    setStarted(true);
  };
  // picking keeps the drawing, so students can draw first and pick after;
  // clicking the picked element again unpicks it. Either way it's neutral.
  const pick = (el: IElementData) =>
    edit(() => {
      setElement((now) => (now?.atomicNumber === el.atomicNumber ? null : el));
      setCharge(0);
    });
  const changeCharge = (by: number) => edit(() => setCharge((c) => c + by));
  const check = () => {
    const result =
      label && target ? checkDiagram(target, diagram, typed, label) : 'pick';
    setFeedback(result);
    setChecked(true);
    // a cheer also plays the treasure sound
    const { text, mood } = configurationMessage(result, label);
    say(text, mood);
  };
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

  // like Explore, the parts join the page card's grid on desktop: the table
  // and charge on the left, the diagram on the right from the top of the card
  return (
    <>
      <div className="w-full flex flex-col gap-4">
        <PeriodicGrid
          selected={element}
          onSelect={pick}
          compact
          minWidth={PICKER_MIN_WIDTH}
        />
        <div
          role="group"
          aria-label="Charge"
          className="flex items-center justify-center gap-2"
        >
          <Button
            onClick={() => changeCharge(-1)}
            disabled={!element || charge <= -MAX_CHARGE}
          >
            <IconMinus size={18} aria-hidden="true" />
            <span className="sr-only">Lower the charge</span>
          </Button>
          <span aria-live="polite" className="min-w-28 text-center text-sm">
            Charge: <span className="font-bold">{chargeText(charge)}</span>
          </span>
          <Button
            onClick={() => changeCharge(1)}
            disabled={!element || charge >= maxCharge}
          >
            <IconPlus size={18} aria-hidden="true" />
            <span className="sr-only">Raise the charge</span>
          </Button>
        </div>
      </div>

      <div className={cn(BESIDE_HEADER, 'flex flex-col gap-4')}>
        <Stage label="Your diagram">
          <h3 className="font-pixel text-xl">
            {label
              ? `Draw ${label}: ${electronsLabel(z - charge)}`
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
                `Correct! That’s ${label}’s configuration.`
              ) : (
                <ul className="space-y-1">
                  {/* with Mr. G on screen, row problems are his to explain;
                      the box keeps the rest and points at the red rows */}
                  {feedback.problems
                    .filter((p) => !guideShowing || !p.subshell)
                    .map((p, i) => (
                      <li key={i}>{p.message}</li>
                    ))}
                  {guideShowing && flagged.length > 0 && (
                    <li>
                      {flagged.length === 1
                        ? 'Look again at the red row.'
                        : 'Look again at the red rows.'}
                    </li>
                  )}
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
    </>
  );
}
