import { useState } from 'react';
import Button from '~/components/button';
import Container from '~/components/container';
import { ELECTRONEGATIVITY_SOURCE } from '~/constants/electronegativity';
import Dropdown, { DropdownItem } from '~/components/dropdown';
import ElementPicker from '~/components/element-picker';
import LewisBuilder, { type Settings } from '~/components/lewis-builder';
import LewisChallenge, {
  HowToDraw,
  elementIcon,
} from '~/components/lewis-challenge';
import Tabs from '~/components/tabs';
import type { ToolItem } from '~/components/lewis-toolbar';
import { COMMON_ELEMENTS, DRAWABLE_ELEMENTS } from '~/constants/lewis-elements';
import { LEVELS, MOLECULES } from '~/constants/molecules';
import {
  electronsUsed,
  formatFormula,
  formulaOf,
  netCharge,
  octetStatus,
  type LewisStructure,
  type Molecule,
} from '~/utils/lewis';
import { assessDrawing } from '~/utils/lewis-arrows';
import { emptyEditor } from '~/utils/lewis-editor';
import type { Tool } from '~/utils/lewis-tools';

type Mode = 'draw' | 'quiz';
type Start = 'given' | 'empty';

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
              className="w-full h-9 sm:h-10 pixel-control text-sm font-semibold text-white hover:bg-primary-800 cursor-pointer focus-visible:outline-none focus-visible:shadow-[inset_0_0_0_var(--pixel)_white]"
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

  const shown = formatFormula(molecule.formula, molecule.charge);

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

      {/* a new molecule or starting point starts a fresh drawing */}
      <LewisChallenge
        key={`${molecule.id}-${start}`}
        molecule={molecule}
        start={start}
        active={active}
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
      backHref="/"
      header="Lewis Structures"
      sources={[ELECTRONEGATIVITY_SOURCE]}
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
