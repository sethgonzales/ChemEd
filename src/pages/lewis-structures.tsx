import { useState } from 'react';
import Button from '~/components/button';
import Container from '~/components/container';
import Dropdown, { DropdownItem } from '~/components/dropdown';
import ElementPicker from '~/components/element-picker';
import LewisBuilder, { type Settings } from '~/components/lewis-builder';
import Tabs from '~/components/tabs';
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

const HOW_TO_DRAW = [
  'Pick a tool and your cursor becomes it. Click the drawing to place atoms or apply the tool, as many times as you like.',
  'Bonds are connectors: click empty space or an atom to add one, then drop an element onto each open end.',
  'You can also drag a tool from the toolbar onto an atom or bond.',
  'With Select, drag atoms to move them, and lone pairs from one atom to another.',
  'Curved arrows go from a lone pair or bond to an atom or bond. Add resonance forms to show where the electrons move.',
  'Undo and redo with Ctrl/⌘+Z and Ctrl/⌘+Shift+Z.',
];

/** The full instructions, folded away until wanted */
function HowToDraw() {
  return (
    <details className="text-sm">
      <summary className="cursor-pointer font-semibold w-fit">
        How to draw
      </summary>
      <ul className="list-disc pl-5 mt-2 space-y-1">
        {HOW_TO_DRAW.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
    </details>
  );
}

const elementIcon = (symbol: string) => (
  <span className="text-sm font-bold">{symbol}</span>
);

type ModeProps = {
  active: boolean;
  settings: Settings;
  onSettings: (change: Partial<Settings>) => void;
};

/** Draw anything, with any of the drawable elements */
function DrawMode({ active, settings, onSettings }: ModeProps) {
  const [palette, setPalette] = useState(COMMON_ELEMENTS);
  const [picking, setPicking] = useState(false);

  const elementTools = (): ToolItem[] =>
    palette.map((symbol) => ({
      tool: `element:${symbol}`,
      label: `Add ${symbol}`,
      icon: elementIcon(symbol),
      draggable: true,
    }));

  // formal charges only mean something once every atom has a full shell
  const chargesReady = (s: LewisStructure) =>
    s.atoms.length > 0 && s.atoms.every((a) => octetStatus(s, a.id).ok);

  // the net charge only means something once the structure is complete
  const counter = (s: LewisStructure) => {
    const used = electronsUsed(s);
    const formula = s.atoms.length
      ? formatFormula(formulaOf(s), chargesReady(s) ? netCharge(s) : 0)
      : '';
    return (
      <>
        {used} valence electron{used === 1 ? '' : 's'} placed
        {formula && <> · {formula}</>}
      </>
    );
  };

  return (
    <div className="flex flex-col gap-4">
      <HowToDraw />
      <LewisBuilder
        initial={emptyEditor()}
        initialTool="element:C"
        active={active}
        elementTools={elementTools}
        assess={assessDrawing}
        counter={counter}
        chargesReady={chargesReady}
        settings={settings}
        onSettings={onSettings}
        paletteExtra={(selectTool: (tool: Tool) => void) => (
          <>
            <button
              type="button"
              aria-label="More elements"
              title="More elements"
              onClick={() => setPicking(true)}
              className="w-full h-9 sm:h-10 rounded-md text-sm font-semibold text-white hover:bg-primary-800 cursor-pointer"
            >
              More…
            </button>
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
function QuizMode({ active, settings, onSettings }: ModeProps) {
  const [molecule, setMolecule] = useState(DEFAULT_MOLECULE);
  const [start, setStart] = useState<Start>('given');

  const total = totalValenceElectrons(molecule.formula, molecule.charge);
  const needed = parseFormula(molecule.formula);

  // the formula's atoms, with how many it has as a guide (not a limit;
  // checking points out extras)
  const shown = formatFormula(molecule.formula, molecule.charge);
  const elementTools = (): ToolItem[] =>
    Object.keys(needed).map((symbol) => ({
      tool: `element:${symbol}`,
      label: `Add ${symbol} (${needed[symbol]} in ${shown})`,
      icon: elementIcon(symbol),
      draggable: true,
    }));

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
        <div className="flex flex-col gap-1 text-sm">
          <span aria-hidden="true">Level</span>
          <Dropdown
            label={`Level ${molecule.level}: ${LEVELS[molecule.level]}`}
            ariaLabel={`Choose a level (now Level ${molecule.level}: ${LEVELS[molecule.level]})`}
            className="w-full sm:w-60"
            menuClassName="w-60"
          >
            {Object.entries(LEVELS).map(([level, name]) => (
              <DropdownItem
                key={level}
                selected={Number(level) === molecule.level}
                onSelect={() =>
                  choose(MOLECULES.find((m) => m.level === Number(level))!)
                }
              >
                Level {level}: {name}
              </DropdownItem>
            ))}
          </Dropdown>
        </div>
        <div className="flex flex-col gap-1 text-sm">
          <span aria-hidden="true">Molecule</span>
          <Dropdown
            label={`${molecule.name} (${shown})`}
            ariaLabel={`Choose a molecule (now ${molecule.name}, ${shown})`}
            className="w-full sm:w-64"
            menuClassName="w-64"
          >
            {levelMolecules.map((m) => (
              <DropdownItem
                key={m.id}
                selected={m.id === molecule.id}
                onSelect={() => choose(m)}
              >
                {m.name} ({formatFormula(m.formula, m.charge)})
              </DropdownItem>
            ))}
          </Dropdown>
        </div>
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
      <HowToDraw />

      {/* a new molecule or starting point starts a fresh drawing */}
      <LewisBuilder
        key={`${molecule.id}-${start}`}
        initial={start === 'given' ? skeletonEditor(molecule) : emptyEditor()}
        initialTool={
          start === 'given' ? 'lonePair' : `element:${Object.keys(needed)[0]}`
        }
        active={active}
        elementTools={elementTools}
        assess={(forms) => assessResonance(forms, molecule)}
        counter={counter}
        chargesReady={(s) => electronsUsed(s) === total}
        settings={settings}
        onSettings={onSettings}
      />
    </div>
  );
}

export default function LewisStructures() {
  const [mode, setMode] = useState<Mode>('draw');
  const [settings, setSettings] = useState<Settings>({
    snap: true,
    bars: false,
    hints: false,
  });
  const onSettings = (change: Partial<Settings>) =>
    setSettings((current) => ({ ...current, ...change }));

  return (
    <Container
      header="Lewis Structures"
      description="Draw Lewis structures with atoms, bonds and electrons, then check your work."
      className="gap-4"
    >
      <Tabs
        label="Mode"
        selected={mode}
        onSelect={(id) => setMode(id as Mode)}
        tabs={[
          {
            id: 'draw',
            label: 'Draw',
            content: (
              <DrawMode
                active={mode === 'draw'}
                settings={settings}
                onSettings={onSettings}
              />
            ),
          },
          {
            id: 'quiz',
            label: 'Quiz',
            content: (
              <QuizMode
                active={mode === 'quiz'}
                settings={settings}
                onSettings={onSettings}
              />
            ),
          },
        ]}
      />
    </Container>
  );
}
