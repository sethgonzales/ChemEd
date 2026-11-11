import { useState } from 'react';
import Button from '~/components/button';
import Container from '~/components/container';
import ElementPicker from '~/components/element-picker';
import LewisBuilder from '~/components/lewis-builder';
import type { ToolItem } from '~/components/lewis-toolbar';
import { COMMON_ELEMENTS, DRAWABLE_ELEMENTS } from '~/constants/lewis-elements';
import { LEVELS, MOLECULES } from '~/constants/molecules';
import { cn } from '~/utils/cn';
import {
  electronsUsed,
  formatFormula,
  formulaOf,
  netCharge,
  octetStatus,
  parseFormula,
  totalValenceElectrons,
  type LewisStructure,
  type Molecule,
} from '~/utils/lewis';
import { assessDrawing, assessResonance } from '~/utils/lewis-arrows';
import { emptyEditor, skeletonEditor } from '~/utils/lewis-editor';
import type { Tool } from '~/utils/lewis-tools';

type Mode = 'draw' | 'quiz';
type Start = 'given' | 'empty';

const MODES: { mode: Mode; label: string }[] = [
  { mode: 'draw', label: 'Draw' },
  { mode: 'quiz', label: 'Quiz' },
];

const HELP =
  'Pick a tool and tap the drawing, or drag a tool straight onto an atom or bond. With Select, drag atoms to move them and lone pairs between atoms. Curved arrows go from a lone pair or bond to an atom or bond.';

const elementIcon = (symbol: string, count?: number) => (
  <span className="text-sm font-bold">
    {symbol}
    {count !== undefined && (
      <sub className="text-[9px] font-normal ml-px">{count}</sub>
    )}
  </span>
);

/** Draw anything, with any of the drawable elements */
function DrawMode() {
  const [palette, setPalette] = useState(COMMON_ELEMENTS);
  const [picking, setPicking] = useState(false);

  const elementTools = (): ToolItem[] =>
    palette.map((symbol) => ({
      tool: `element:${symbol}`,
      label: `Add ${symbol}`,
      icon: elementIcon(symbol),
      draggable: true,
    }));

  const counter = (s: LewisStructure) => {
    const used = electronsUsed(s);
    // net charge needs every atom's formal charge, which needs atoms
    const formula = s.atoms.length
      ? formatFormula(formulaOf(s), netCharge(s))
      : '';
    return (
      <>
        {used} valence electron{used === 1 ? '' : 's'}
        {formula && <> · {formula}</>}
      </>
    );
  };

  // formal charges only mean something once every atom has a full shell
  const chargesReady = (s: LewisStructure) =>
    s.atoms.length > 0 && s.atoms.every((a) => octetStatus(s, a.id).ok);

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm">Build any Lewis structure. {HELP}</p>
      <LewisBuilder
        initial={emptyEditor()}
        initialTool="element:C"
        elementTools={elementTools}
        assess={assessDrawing}
        counter={counter}
        chargesReady={chargesReady}
        paletteExtra={(selectTool: (tool: Tool) => void) => (
          <>
            <Button onClick={() => setPicking(true)}>More elements</Button>
            {picking && (
              <ElementPicker
                elements={DRAWABLE_ELEMENTS}
                onClose={() => setPicking(false)}
                onPick={(symbol) => {
                  if (!palette.includes(symbol)) {
                    setPalette([...palette, symbol]);
                  }
                  selectTool(`element:${symbol}`);
                  setPicking(false);
                }}
              />
            )}
          </>
        )}
      />
    </div>
  );
}

const DEFAULT_MOLECULE = MOLECULES.find((m) => m.id === 'water')!;

/** Draw a given molecule and get it graded */
function QuizMode() {
  const [molecule, setMolecule] = useState(DEFAULT_MOLECULE);
  const [start, setStart] = useState<Start>('given');

  const total = totalValenceElectrons(molecule.formula, molecule.charge);
  const needed = parseFormula(molecule.formula);

  // only the formula's atoms are available, so element tools run out
  const elementTools = (s: LewisStructure): ToolItem[] =>
    Object.keys(needed).map((symbol) => {
      const left =
        needed[symbol] - s.atoms.filter((a) => a.symbol === symbol).length;
      return {
        tool: `element:${symbol}`,
        label: `Add ${symbol} (${left} left)`,
        icon: elementIcon(symbol, left),
        disabled: left <= 0,
        draggable: true,
      };
    });

  const counter = (s: LewisStructure) => {
    const used = electronsUsed(s);
    return (
      <>
        <div className="h-2 rounded-full bg-primary-700 overflow-hidden mb-1">
          <div
            className={cn(
              'h-full transition-all',
              used > total ? 'bg-red-500' : 'bg-secondary-500',
            )}
            style={{ width: `${Math.min(100, (used / total) * 100)}%` }}
          />
        </div>
        {used} of {total} valence electrons placed
      </>
    );
  };

  const levelMolecules = MOLECULES.filter((m) => m.level === molecule.level);
  const choose = (m: Molecule) => setMolecule(m);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col sm:flex-row flex-wrap gap-3 sm:items-end">
        <label className="flex flex-col gap-1 text-sm">
          Level
          <select
            value={molecule.level}
            onChange={(e) => {
              const level = Number(e.target.value);
              choose(MOLECULES.find((m) => m.level === level)!);
            }}
            className="rounded-lg bg-primary-700 text-white px-3 py-2"
          >
            {Object.entries(LEVELS).map(([level, name]) => (
              <option key={level} value={level}>
                Level {level}: {name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Molecule
          <select
            value={molecule.id}
            onChange={(e) =>
              choose(MOLECULES.find((m) => m.id === e.target.value)!)
            }
            className="rounded-lg bg-primary-700 text-white px-3 py-2"
          >
            {levelMolecules.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name} ({formatFormula(m.formula, m.charge)})
              </option>
            ))}
          </select>
        </label>
        <div className="flex gap-2">
          <Button pressed={start === 'given'} onClick={() => setStart('given')}>
            Given skeleton
          </Button>
          <Button pressed={start === 'empty'} onClick={() => setStart('empty')}>
            Empty canvas
          </Button>
        </div>
      </div>

      <h3 className="text-lg font-semibold">
        {molecule.name}, {formatFormula(molecule.formula, molecule.charge)}
      </h3>
      <p className="text-sm -mt-2">{HELP}</p>

      {/* a new molecule or starting point starts a fresh drawing */}
      <LewisBuilder
        key={`${molecule.id}-${start}`}
        initial={start === 'given' ? skeletonEditor(molecule) : emptyEditor()}
        initialTool={
          start === 'given' ? 'lonePair' : `element:${Object.keys(needed)[0]}`
        }
        elementTools={elementTools}
        assess={(forms) => assessResonance(forms, molecule)}
        counter={counter}
        chargesReady={(s) => electronsUsed(s) === total}
      />
    </div>
  );
}

export default function LewisStructures() {
  const [mode, setMode] = useState<Mode>('draw');

  return (
    <Container header="Lewis Structures" className="gap-4">
      <div role="tablist" aria-label="Mode" className="flex gap-2">
        {MODES.map(({ mode: m, label }) => (
          <button
            key={m}
            id={`lewis-tab-${m}`}
            type="button"
            role="tab"
            aria-selected={mode === m}
            aria-controls={`lewis-panel-${m}`}
            onClick={() => setMode(m)}
            className={cn(
              'px-4 py-2 rounded-lg font-semibold cursor-pointer',
              mode === m
                ? 'bg-white text-gray-900'
                : 'bg-primary-700 text-white hover:bg-primary-800',
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* both stay mounted, so switching modes keeps each drawing */}
      {MODES.map(({ mode: m }) => (
        <div
          key={m}
          id={`lewis-panel-${m}`}
          role="tabpanel"
          aria-labelledby={`lewis-tab-${m}`}
          hidden={mode !== m}
        >
          {m === 'draw' ? <DrawMode /> : <QuizMode />}
        </div>
      ))}
    </Container>
  );
}
