import { useReducer, useRef, useState } from 'react';
import Container from '~/components/container';
import LewisCanvas, { pointIn, targetOf } from '~/components/lewis-canvas';
import LewisToolbar, {
  DRAWING_TOOLS,
  MARK_TOOLS,
  type ToolItem,
} from '~/components/lewis-toolbar';
import { LEVELS, MOLECULES } from '~/constants/molecules';
import { cn } from '~/utils/cn';
import {
  assessStructure,
  electronsUsed,
  formatFormula,
  parseFormula,
  totalValenceElectrons,
  type LewisStructure,
  type Molecule,
} from '~/utils/lewis';
import {
  editorReducer,
  emptyEditor,
  skeletonEditor,
  type EditorAction,
} from '~/utils/lewis-editor';
import { nextAtomPosition } from '~/utils/lewis-layout';
import {
  dragAction,
  snapAction,
  toolAction,
  type Target,
  type Tool,
} from '~/utils/lewis-tools';
import { usePointerDrag, type DragPoint } from '~/utils/use-pointer-drag';

type Start = 'given' | 'empty';

// A drag either carries a tool from the toolbar or picks up part of the drawing
type DragPayload =
  | { from: 'toolbar'; tool: Tool; label: string }
  | { from: 'drawing'; source: Target; label: string };

const VERDICT_LABEL = {
  best: null, // the feedback message already says "Correct!"
  accepted: 'Accepted',
  valid: 'Almost',
  invalid: 'Not yet',
} as const;

const DEFAULT_MOLECULE = MOLECULES.find((m) => m.id === 'water')!;

const startingEditor = (molecule: Molecule, start: Start) =>
  start === 'given' ? skeletonEditor(molecule) : emptyEditor();

const startingTool = (molecule: Molecule, start: Start): Tool =>
  start === 'given'
    ? 'lonePair'
    : `element:${Object.keys(parseFormula(molecule.formula))[0]}`;

function Button({
  pressed,
  onClick,
  children,
  disabled,
}: {
  pressed?: boolean;
  onClick: () => void;
  children: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'px-3 py-2 rounded-lg text-sm font-semibold cursor-pointer',
        'disabled:opacity-40 disabled:cursor-not-allowed',
        pressed
          ? 'bg-secondary-500 text-text-secondary'
          : 'bg-primary-700 hover:bg-primary-800 text-white',
      )}
    >
      {children}
    </button>
  );
}

function Setting({
  checked,
  onChange,
  children,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  children: React.ReactNode;
}) {
  return (
    <label className="flex items-center gap-2 text-sm cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      {children}
    </label>
  );
}

export default function LewisStructures() {
  const [molecule, setMolecule] = useState(DEFAULT_MOLECULE);
  const [start, setStart] = useState<Start>('given');
  const [tool, setTool] = useState<Tool>('lonePair');
  const [bars, setBars] = useState(false);
  const [hints, setHints] = useState(true);
  const [snap, setSnap] = useState(true);
  const [checked, setChecked] = useState<LewisStructure | null>(null);
  const [editor, dispatch] = useReducer(
    editorReducer,
    startingEditor(DEFAULT_MOLECULE, 'given'),
  );
  const svgRef = useRef<SVGSVGElement>(null);
  const { structure } = editor;

  const restart = (next: Molecule, nextStart: Start) => {
    setMolecule(next);
    setStart(nextStart);
    setTool(startingTool(next, nextStart));
    setChecked(null);
    dispatch({ type: 'load', editor: startingEditor(next, nextStart) });
  };

  const total = totalValenceElectrons(molecule.formula, molecule.charge);
  const used = electronsUsed(structure);

  // feedback belongs to the structure that was checked
  const result =
    checked === structure ? assessStructure(structure, molecule) : null;
  const problems = new Set(
    result?.feedback.flatMap((f) => (f.atom === undefined ? [] : [f.atom])),
  );

  const needed = parseFormula(molecule.formula);
  const left = (symbol: string) =>
    needed[symbol] - structure.atoms.filter((a) => a.symbol === symbol).length;
  const elementTools: ToolItem[] = Object.keys(needed).map((symbol) => ({
    tool: `element:${symbol}`,
    label: `Add ${symbol} (${left(symbol)} left)`,
    icon: (
      <span className="text-sm font-bold">
        {symbol}
        <sub className="text-[9px] font-normal ml-px">{left(symbol)}</sub>
      </span>
    ),
    disabled: left(symbol) <= 0,
    draggable: true,
  }));
  const labelOf = (t: Tool) =>
    [...DRAWING_TOOLS, ...MARK_TOOLS, ...elementTools].find(
      (item) => item.tool === t,
    )?.label ?? '';

  const apply = (action: EditorAction | null) => {
    if (action) dispatch(snap ? snapAction(action, structure) : action);
  };

  // Empty-canvas targets need a real point; fall back to a free spot when the
  // drawing hasn't been laid out (or the pointer position is unknown)
  const placed = (target: Target): Target =>
    target.kind === 'canvas' && !Number.isFinite(target.x)
      ? { kind: 'canvas', ...nextAtomPosition(structure) }
      : target;

  const elementLeft = (t: Tool) =>
    !t.startsWith('element:') || left(t.slice('element:'.length)) > 0;

  const onDrop = (payload: DragPayload, at: DragPoint) => {
    const el = document.elementFromPoint(at.clientX, at.clientY);
    const svg = svgRef.current;
    // only drops onto this drawing count
    if (!svg || !el || !svg.contains(el)) return;
    const point = pointIn(svg, at.clientX, at.clientY);
    const hit = targetOf(el);
    if (!hit) return;
    const target = placed(
      hit.kind === 'canvas'
        ? { kind: 'canvas', x: point?.x ?? NaN, y: point?.y ?? NaN }
        : hit,
    );

    if (payload.from === 'toolbar') {
      if (elementLeft(payload.tool)) {
        apply(toolAction(payload.tool, target, structure));
      }
      return;
    }
    // moving an atom needs to know where it was dropped
    if (!point && payload.source.kind === 'atom' && tool === 'select') return;
    apply(dragAction(tool, payload.source, target, point ?? { x: 0, y: 0 }));
  };
  const { drag, start: startDrag, consumeClick } = usePointerDrag(onDrop);

  const onTap = (target: Target) => {
    if (consumeClick() || !elementLeft(tool)) return;
    apply(toolAction(tool, placed(target), structure));
  };

  const onPressDrawing = (target: Target, e: React.PointerEvent) => {
    const canDrag =
      (tool === 'select' &&
        (target.kind === 'atom' || target.kind === 'lonePair')) ||
      (tool.startsWith('bond') && target.kind === 'atom');
    if (!canDrag) return;
    const label =
      target.kind === 'lonePair'
        ? '••'
        : target.kind === 'atom'
          ? (structure.atoms.find((a) => a.id === target.id)?.symbol ?? '')
          : '';
    startDrag({ from: 'drawing', source: target, label }, e);
  };

  // a bond being drawn shows as a dashed line to the pointer
  const dragPoint =
    drag && svgRef.current
      ? pointIn(svgRef.current, drag.at.clientX, drag.at.clientY)
      : null;
  const preview =
    drag?.payload.from === 'drawing' &&
    drag.payload.source.kind === 'atom' &&
    tool.startsWith('bond') &&
    dragPoint
      ? { from: drag.payload.source.id, to: dragPoint }
      : null;

  const levelMolecules = MOLECULES.filter((m) => m.level === molecule.level);

  return (
    <Container header="Lewis Structures" className="gap-4">
      {/* Molecule and starting point */}
      <div className="flex flex-col sm:flex-row flex-wrap gap-3 sm:items-end">
        <label className="flex flex-col gap-1 text-sm">
          Level
          <select
            value={molecule.level}
            onChange={(e) => {
              const level = Number(e.target.value);
              restart(MOLECULES.find((m) => m.level === level)!, start);
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
              restart(MOLECULES.find((m) => m.id === e.target.value)!, start)
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
          <Button
            pressed={start === 'given'}
            onClick={() => restart(molecule, 'given')}
          >
            Given skeleton
          </Button>
          <Button
            pressed={start === 'empty'}
            onClick={() => restart(molecule, 'empty')}
          >
            Empty canvas
          </Button>
        </div>
      </div>

      <h3 className="text-lg font-semibold">
        {molecule.name}, {formatFormula(molecule.formula, molecule.charge)}
      </h3>
      <p className="text-sm -mt-2">
        Pick a tool and tap the drawing, or drag a tool straight onto an atom or
        bond. With Select, drag atoms to move them and lone pairs between atoms.
      </p>

      <div className="flex flex-col sm:flex-row gap-3">
        <LewisToolbar
          groups={[DRAWING_TOOLS, MARK_TOOLS, elementTools]}
          active={tool}
          onSelect={setTool}
          onPress={(t, e) =>
            startDrag({ from: 'toolbar', tool: t, label: labelOf(t) }, e)
          }
        />

        <div className="flex-1 min-w-0 flex flex-col gap-2">
          <div className="bg-white rounded-lg min-h-64 flex items-center justify-center p-2">
            <LewisCanvas
              ref={svgRef}
              structure={structure}
              onTap={onTap}
              onPress={onPressDrawing}
              problems={problems}
              bars={bars}
              hints={hints}
              showCharges={used === total}
              preview={preview}
            />
          </div>

          <div
            data-testid="electron-counter"
            aria-live="polite"
            className="text-sm"
          >
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
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              onClick={() => dispatch({ type: 'undo' })}
              disabled={!editor.history.length}
            >
              Undo
            </Button>
            <Button onClick={() => restart(molecule, start)}>Reset</Button>
            <Button
              onClick={() => dispatch({ type: 'cleanUp' })}
              disabled={!structure.atoms.length}
            >
              Clean Up
            </Button>
            <Button pressed onClick={() => setChecked(structure)}>
              Check your work
            </Button>
          </div>

          <div className="flex flex-wrap gap-x-4 gap-y-1">
            <Setting checked={hints} onChange={setHints}>
              Show hints
            </Setting>
            <Setting checked={snap} onChange={setSnap}>
              Snap to bond angles
            </Setting>
            <Setting checked={bars} onChange={setBars}>
              Lone pairs as bars
            </Setting>
          </div>

          {result && (
            <div
              data-testid="feedback"
              role="status"
              className="bg-primary-600 rounded-lg p-3 text-sm space-y-1"
            >
              {VERDICT_LABEL[result.verdict] && (
                <p className="font-bold">{VERDICT_LABEL[result.verdict]}</p>
              )}
              <ul className="space-y-1">
                {result.feedback.map((f, i) => (
                  <li key={i}>{f.message}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* what's being dragged follows the pointer */}
      {drag && !preview && (
        <div
          aria-hidden="true"
          className="fixed z-50 pointer-events-none px-2 py-1 rounded-md bg-secondary-500 text-text-secondary text-xs font-semibold shadow-lg"
          style={{ left: drag.at.clientX + 12, top: drag.at.clientY + 12 }}
        >
          {drag.payload.label}
        </div>
      )}
    </Container>
  );
}
