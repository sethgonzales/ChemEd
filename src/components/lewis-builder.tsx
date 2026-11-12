import { useEffect, useReducer, useRef, useState, type ReactNode } from 'react';
import Button from '~/components/button';
import { useGuide } from '~/components/guide';
import Setting from '~/components/setting';
import Stage from '~/components/stage';
import LewisCanvas, { pointIn, targetOf } from '~/components/lewis-canvas';
import LewisToolbar, {
  DRAWING_TOOLS,
  MARK_TOOLS,
  toolCursor,
  type ToolItem,
} from '~/components/lewis-toolbar';
import { cn } from '~/utils/cn';
import { checkMessage } from '~/utils/guide';
import type { Feedback, LewisStructure, Verdict } from '~/utils/lewis';
import {
  formsReducer,
  type EditorAction,
  type EditorState,
  type FormsState,
} from '~/utils/lewis-editor';
import { nextAtomPosition } from '~/utils/lewis-layout';
import {
  arrowBetween,
  dragAction,
  snapAction,
  toolAction,
  type Target,
  type Tool,
} from '~/utils/lewis-tools';
import { usePointerDrag, type DragPoint } from '~/utils/use-pointer-drag';

// A drag either carries a tool from the toolbar or picks up part of the drawing
type DragPayload =
  | { from: 'toolbar'; tool: Tool; label: string }
  | { from: 'drawing'; source: Target; label: string };

const VERDICT_LABEL = {
  best: null, // the feedback message already says so
  accepted: 'Accepted',
  valid: 'Almost',
  invalid: 'Not yet',
} as const;

export type Settings = { snap: boolean; bars: boolean; hints: boolean };

interface Props {
  initial: EditorState; // what Reset goes back to
  initialTool: Tool;
  active?: boolean; // the visible builder, which answers keyboard shortcuts
  elementTools: (structure: LewisStructure) => ToolItem[];
  assess: (forms: LewisStructure[]) => {
    verdict: Verdict;
    feedback: Feedback[];
  };
  counter: (structure: LewisStructure) => ReactNode; // electron count line
  chargesReady: (structure: LewisStructure) => boolean; // when formal-charge hints mean something
  // extra toolbar controls, given a way to switch tools (e.g. More elements)
  paletteExtra?: (selectTool: (tool: Tool) => void) => ReactNode;
  settings: Settings; // kept by the page, so they survive a new molecule
  onSettings: (change: Partial<Settings>) => void;
}

/** The Lewis structure drawing area: toolbar, drawing, resonance forms and checking */
export default function LewisBuilder({
  initial,
  initialTool,
  elementTools,
  assess,
  counter,
  chargesReady,
  paletteExtra,
  settings,
  onSettings,
  active = true,
}: Props) {
  const { snap, bars, hints } = settings;
  const { say } = useGuide();
  const [tool, setTool] = useState<Tool>(initialTool);
  const [checked, setChecked] = useState<FormsState['forms'] | null>(null);
  // first tap of a two-tap curved arrow
  const [arrowSource, setArrowSource] = useState<Target | null>(null);
  const [state, dispatchForms] = useReducer(formsReducer, {
    forms: [initial],
    active: 0,
  });
  const svgRef = useRef<SVGSVGElement>(null);
  const editor = state.forms[state.active];
  const { structure } = editor;
  const dispatch = (action: EditorAction) =>
    dispatchForms({ type: 'edit', action });

  const selectTool = (t: Tool) => {
    setTool(t);
    setArrowSource(null);
  };

  // Undo: Ctrl/⌘+Z. Redo: Ctrl/⌘+Shift+Z or Ctrl+Y.
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      const typing = (e.target as HTMLElement | null)?.closest?.(
        'input, textarea, select, [contenteditable]',
      );
      if (typing) return;
      const key = e.key.toLowerCase();
      if (key === 'z' || key === 'y') {
        e.preventDefault();
        const redo = key === 'y' || e.shiftKey;
        dispatchForms({
          type: 'edit',
          action: { type: redo ? 'redo' : 'undo' },
        });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [active]);

  const reset = () => {
    selectTool(initialTool);
    setChecked(null);
    dispatchForms({ type: 'load', editor: initial });
  };

  // feedback belongs to the forms that were checked
  const result =
    checked === state.forms
      ? assess(state.forms.map((f) => f.structure))
      : null;
  // each flagged atom with what's wrong, for its ring and hover tooltip
  const problems = new Map<number, string[]>();
  for (const f of result?.feedback ?? []) {
    if (f.atom !== undefined) {
      problems.set(f.atom, [...(problems.get(f.atom) ?? []), f.message]);
    }
  }

  const elements = elementTools(structure);
  const labelOf = (t: Tool) =>
    [...DRAWING_TOOLS, ...MARK_TOOLS, ...elements].find(
      (item) => item.tool === t,
    )?.label ?? '';
  // element tools can run out (in a quiz, only the formula's atoms are given)
  const usable = (t: Tool) =>
    !elements.find((item) => item.tool === t)?.disabled;

  const apply = (action: EditorAction | null) => {
    if (action) dispatch(snap ? snapAction(action, structure) : action);
  };

  // Empty-canvas targets need a real point; fall back to a free spot when the
  // drawing hasn't been laid out (or the pointer position is unknown)
  const placed = (target: Target): Target =>
    target.kind === 'canvas' && !Number.isFinite(target.x)
      ? { kind: 'canvas', ...nextAtomPosition(structure) }
      : target;

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
      if (usable(payload.tool)) {
        apply(toolAction(payload.tool, target, structure));
      }
      return;
    }
    // moving an atom needs to know where it was dropped
    if (!point && payload.source.kind === 'atom' && tool === 'select') return;
    apply(
      dragAction(
        tool,
        payload.source,
        target,
        point ?? { x: 0, y: 0 },
        structure,
      ),
    );
  };
  const { drag, start: startDrag, consumeClick } = usePointerDrag(onDrop);

  const onTap = (target: Target) => {
    if (consumeClick() || !usable(tool)) return;
    if (tool === 'curvedArrow') {
      // tap where the electrons start, then where they go
      if (!arrowSource) {
        if (target.kind === 'lonePair' || target.kind === 'bond') {
          setArrowSource(target);
        }
        return;
      }
      const arrow = arrowBetween(arrowSource, target);
      if (arrow) apply({ type: 'addArrow', arrow });
      setArrowSource(null);
      return;
    }
    apply(toolAction(tool, placed(target), structure));
  };

  const onPressDrawing = (target: Target, e: React.PointerEvent) => {
    const canDrag =
      (tool === 'select' &&
        (target.kind === 'atom' || target.kind === 'lonePair')) ||
      (tool.startsWith('bond') && target.kind === 'atom') ||
      (tool === 'curvedArrow' &&
        (target.kind === 'lonePair' || target.kind === 'bond'));
    if (!canDrag) return;
    const label =
      target.kind === 'lonePair'
        ? '••'
        : target.kind === 'bond'
          ? '↷'
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

  const header = (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <div
          role="tablist"
          aria-label="Resonance forms"
          className="flex flex-wrap items-center gap-1"
        >
          {state.forms.map((_, i) => (
            <span key={i} className="flex items-center gap-1">
              {i > 0 && <span aria-hidden="true">↔</span>}
              <button
                type="button"
                role="tab"
                aria-selected={i === state.active}
                onClick={() => {
                  setArrowSource(null);
                  dispatchForms({ type: 'selectForm', index: i });
                }}
                className={cn(
                  'px-3 py-1 rounded-md text-sm font-semibold cursor-pointer',
                  i === state.active
                    ? 'bg-white text-gray-900'
                    : 'bg-primary-700 text-white hover:bg-primary-800',
                )}
              >
                Form {i + 1}
              </button>
            </span>
          ))}
        </div>
        <Button
          onClick={() => {
            setArrowSource(null);
            dispatchForms({ type: 'addForm' });
          }}
        >
          Add resonance form
        </Button>
        <Button
          onClick={() =>
            dispatchForms({ type: 'removeForm', index: state.active })
          }
          disabled={state.forms.length === 1}
        >
          Remove form
        </Button>
      </div>
      <div
        data-testid="electron-counter"
        aria-live="polite"
        className="text-sm min-w-48"
      >
        {counter(structure)}
      </div>
    </div>
  );

  const actions = (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        onClick={() => dispatch({ type: 'undo' })}
        disabled={!editor.history.length}
      >
        Undo
      </Button>
      <Button
        onClick={() => dispatch({ type: 'redo' })}
        disabled={!editor.future.length}
      >
        Redo
      </Button>
      <Button onClick={reset}>Reset</Button>
      <Button
        onClick={() => dispatch({ type: 'cleanUp' })}
        disabled={!structure.atoms.length}
      >
        Clean Up
      </Button>
      <span className="sm:ml-auto">
        <Button
          pressed
          onClick={() => {
            setChecked(state.forms);
            const { verdict, feedback } = assess(
              state.forms.map((f) => f.structure),
            );
            const { text, mood } = checkMessage(verdict, feedback);
            say(text, mood);
          }}
        >
          Check your work
        </Button>
      </span>
    </div>
  );

  return (
    <div className="flex flex-col gap-3">
      <Stage label="Drawing" header={header} footer={actions}>
        <div className="flex flex-col sm:flex-row gap-3">
          <LewisToolbar
            groups={[DRAWING_TOOLS, MARK_TOOLS, elements]}
            active={tool}
            onSelect={selectTool}
            onPress={(t, e) =>
              startDrag({ from: 'toolbar', tool: t, label: labelOf(t) }, e)
            }
            extra={paletteExtra?.(selectTool)}
          />
          <div className="relative sm:flex-1 min-w-0 bg-white rounded-md h-80 sm:h-auto sm:min-h-[28rem] overflow-hidden">
            <LewisCanvas
              ref={svgRef}
              structure={structure}
              onTap={onTap}
              onPress={onPressDrawing}
              problems={problems}
              bars={bars}
              hints={hints}
              showCharges={chargesReady(structure)}
              preview={preview}
              pending={arrowSource}
              cursor={toolCursor(tool)}
            />
            {arrowSource && (
              <p
                role="status"
                className="absolute top-2 left-2 px-2 py-1 rounded-md bg-gray-900/80 text-white text-sm pointer-events-none"
              >
                Now tap where the electrons go.
              </p>
            )}
          </div>
        </div>
      </Stage>

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

      <div className="flex flex-wrap gap-x-4 gap-y-1">
        <Setting checked={snap} onChange={(on) => onSettings({ snap: on })}>
          Snap to bond angles
        </Setting>
        <Setting checked={bars} onChange={(on) => onSettings({ bars: on })}>
          Lone pairs as bars
        </Setting>
        <Setting checked={hints} onChange={(on) => onSettings({ hints: on })}>
          Show hints
        </Setting>
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
    </div>
  );
}
