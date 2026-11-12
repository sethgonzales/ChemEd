import { useState } from 'react';
import Button from '~/components/button';
import Dropdown, { DropdownItem } from '~/components/dropdown';
import OrbitalDiagram from '~/components/orbital-diagram';
import Stage from '~/components/stage';
import { BUILD_LEVELS } from '~/constants/electron-levels';
import { ELEMENTS } from '~/constants/elements';
import {
  cycleBox,
  checkDiagram,
  electronsLabel,
  emptyDiagram,
  formatConfiguration,
  groundState,
  orbitalDiagram,
  parseConfiguration,
  type Problem,
} from '~/utils/electron-configurations';

const bySymbol = (symbol: string) => ELEMENTS.find((e) => e.symbol === symbol)!;

type Result = { correct: boolean; problems: Problem[] };

/** Students draw an element's orbital diagram, type its notation, and check */
export default function ConfigurationBuilder() {
  const [level, setLevel] = useState(0);
  const [symbol, setSymbol] = useState(BUILD_LEVELS[0].symbols[0]);
  const { upTo, symbols } = BUILD_LEVELS[level];
  const [diagram, setDiagram] = useState(() => emptyDiagram(upTo));
  const [typed, setTyped] = useState('');
  const [result, setResult] = useState<Result | null>(null);

  const element = bySymbol(symbol);
  const target = groundState(element.atomicNumber);
  const preview = parseConfiguration(typed);
  const levelLabel = (i: number) => `Level ${i + 1}: ${BUILD_LEVELS[i].name}`;

  const start = (nextLevel: number, nextSymbol: string) => {
    setLevel(nextLevel);
    setSymbol(nextSymbol);
    setDiagram(emptyDiagram(BUILD_LEVELS[nextLevel].upTo));
    setTyped('');
    setResult(null);
  };
  // an answer that's been checked goes stale as soon as it changes
  const edit = (change: () => void) => {
    change();
    setResult(null);
  };
  const showAnswer = () => {
    const filled = orbitalDiagram(target);
    edit(() => {
      setDiagram(
        emptyDiagram(upTo).map(
          (row) => filled.find((f) => f.subshell === row.subshell) ?? row,
        ),
      );
      setTyped(formatConfiguration(target, { superscripts: false }));
    });
  };

  const flagged = (result?.problems ?? [])
    .map((p) => p.subshell)
    .filter((s): s is string => !!s);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col sm:flex-row flex-wrap gap-3 sm:items-end">
        <div className="flex flex-col gap-1 text-sm">
          <span aria-hidden="true">Level</span>
          <Dropdown
            label={levelLabel(level)}
            ariaLabel={`Choose a level (now ${levelLabel(level)})`}
            className="w-full sm:w-64"
            menuClassName="w-64"
          >
            {BUILD_LEVELS.map((l, i) => (
              <DropdownItem
                key={l.name}
                selected={i === level}
                onSelect={() => start(i, l.symbols[0])}
              >
                {levelLabel(i)}
              </DropdownItem>
            ))}
          </Dropdown>
        </div>
        <div className="flex flex-col gap-1 text-sm">
          <span aria-hidden="true">Element</span>
          <Dropdown
            label={element.name}
            ariaLabel={`Choose an element (now ${element.name})`}
            className="w-full sm:w-48"
            menuClassName="w-48"
          >
            {symbols.map((s) => (
              <DropdownItem
                key={s}
                selected={s === symbol}
                onSelect={() => start(level, s)}
              >
                {bySymbol(s).name}
              </DropdownItem>
            ))}
          </Dropdown>
        </div>
      </div>

      <Stage label="Your diagram">
        <h3 className="font-pixel text-xl">
          Draw {element.name}: {electronsLabel(element.atomicNumber)}
        </h3>
        <p className="text-sm text-white/60">
          Tap a box once for ↑, twice for ↑↓, three times to empty it. Lowest
          energy is at the bottom.
        </p>
        <OrbitalDiagram
          diagram={diagram}
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
        {result && (
          <div
            role="status"
            className={
              result.correct
                ? 'font-bold text-green-300'
                : 'pixel-control bg-red-500/25 p-3 text-sm text-red-100'
            }
          >
            {result.correct ? (
              `Correct! That’s ${element.name}’s configuration.`
            ) : (
              <ul className="space-y-1">
                {result.problems.map((p, i) => (
                  <li key={i}>{p.message}</li>
                ))}
              </ul>
            )}
          </div>
        )}
      </Stage>

      <div className="flex flex-wrap gap-2">
        <Button
          pressed
          onClick={() =>
            setResult(checkDiagram(target, diagram, typed, element.name))
          }
        >
          Check
        </Button>
        <Button onClick={showAnswer}>Show answer</Button>
        <Button onClick={() => start(level, symbol)}>Clear</Button>
      </div>
    </div>
  );
}
