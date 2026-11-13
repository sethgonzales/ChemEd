import {
  useCallback,
  useEffect,
  type Dispatch,
  type SetStateAction,
} from 'react';
import Button from '~/components/button';
import Dropdown, { DropdownItem } from '~/components/dropdown';
import PhCurve, { type CurveMarkers } from '~/components/ph-curve';
import Stage from '~/components/stage';
import TitrationApparatus from '~/components/titration-apparatus';
import {
  BURETTE_CAPACITY,
  DROP_VOLUME,
  INDICATORS,
  POUR_RATE,
  type Analyte,
  type Indicator,
} from '~/constants/titrations';
import {
  addTitrant,
  curvePoints,
  indicatorColor,
  indicatorColorName,
  phAfter,
} from '~/utils/titrations';
import { useHold } from '~/utils/use-hold';

const MILLILITRE = 1; // mL added by "Add 1 mL"

/** The indicator picker both tabs use */
export function IndicatorDropdown({
  indicator,
  onSelect,
}: {
  indicator: Indicator;
  onSelect: (i: Indicator) => void;
}) {
  return (
    <Dropdown
      label={`Indicator: ${indicator.name}`}
      className="w-full sm:w-64"
      menuClassName="w-64"
    >
      {INDICATORS.map((i) => (
        <DropdownItem
          key={i.id}
          selected={i.id === indicator.id}
          onSelect={() => onSelect(i)}
        >
          {i.name} ({i.low}–{i.high})
        </DropdownItem>
      ))}
    </Dropdown>
  );
}

interface Props {
  analyte: Analyte;
  concentration: number;
  indicator: Indicator;
  volume: number; // mL added
  setVolume: Dispatch<SetStateAction<number>>;
  showPH: boolean; // the Unknown tab hides the meter until the answer is in
  curve: { markers: CurveMarkers | null; upTo?: number } | null; // null hides it
  locked?: boolean; // the round is over: no more titrant
  pourAccent?: boolean; // Pour is the main action, unless the page has another
}

/** The burette and flask with their controls, readouts and pH curve */
export default function TitrationBench({
  analyte,
  concentration,
  indicator,
  volume,
  setVolume,
  showPH,
  curve,
  locked = false,
  pourAccent = true,
}: Props) {
  const add = useCallback(
    (amount: number) => setVolume((v) => addTitrant(v, amount)),
    [setVolume],
  );
  const pour = useHold(
    useCallback((seconds: number) => add(POUR_RATE * seconds), [add]),
  );
  const empty = volume >= BURETTE_CAPACITY;
  const stopped = empty || locked;
  const { stop } = pour;
  useEffect(() => {
    if (stopped) stop();
  }, [stopped, stop]);

  const pH = phAfter(analyte, concentration, volume);
  const colorName = indicatorColorName(indicator, pH);
  const upTo = Math.max(volume, curve?.upTo ?? 0);

  return (
    <Stage
      label="Titration"
      header={
        <div className="flex items-start justify-between gap-4">
          {showPH && (
            <div data-testid="ph" className="leading-tight">
              <span className="block text-sm text-white/70">pH meter</span>
              <span className="block text-2xl sm:text-3xl font-bold whitespace-nowrap">
                pH {pH.toFixed(2)}
              </span>
            </div>
          )}
          <div
            data-testid="volume"
            className="ml-auto text-right leading-tight"
          >
            <span className="block text-sm text-white/70">Added</span>
            <span className="block text-2xl sm:text-3xl font-bold whitespace-nowrap">
              {volume.toFixed(2)} mL
            </span>
          </div>
        </div>
      }
      footer={
        <div className="flex flex-wrap items-center gap-2">
          <Button disabled={stopped} onClick={() => add(DROP_VOLUME)}>
            Add drop
          </Button>
          <Button disabled={stopped} onClick={() => add(MILLILITRE)}>
            Add 1 mL
          </Button>
          <Button pressed={pourAccent} disabled={stopped} {...pour.events}>
            Pour
          </Button>
          <Button disabled={locked} onClick={() => setVolume(0)}>
            Reset
          </Button>
          {empty && !locked && (
            <span className="text-sm">
              The burette is empty. Reset to start again.
            </span>
          )}
        </div>
      }
    >
      {/* apparatus and curve side by side, stacked on a phone */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="md:w-2/5 flex justify-center pixel-control bg-primary-800 p-3">
          <TitrationApparatus
            volume={volume}
            color={indicatorColor(indicator, pH)}
            colorName={colorName}
          />
        </div>
        {curve && (
          <div className="md:flex-1 md:min-w-0 flex items-center justify-center pixel-control bg-primary-800 p-3">
            <PhCurve
              points={curvePoints(analyte, concentration, upTo)}
              indicator={indicator}
              markers={curve.markers}
              current={{ volume, pH }}
            />
          </div>
        )}
      </div>
      <p role="status" className="sr-only">
        {showPH && `pH ${pH.toFixed(2)} after `}
        {volume.toFixed(2)} mL added; the flask is {colorName}
      </p>
    </Stage>
  );
}
