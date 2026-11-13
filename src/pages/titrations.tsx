import { useCallback, useEffect, useState } from 'react';
import Button from '~/components/button';
import Container from '~/components/container';
import Dropdown, { DropdownItem } from '~/components/dropdown';
import Stage from '~/components/stage';
import TitrationApparatus from '~/components/titration-apparatus';
import {
  ANALYTES,
  BURETTE_CAPACITY,
  DROP_VOLUME,
  INDICATORS,
  POUR_RATE,
  TITRANT_CONCENTRATION,
  titrantFor,
  type Analyte,
} from '~/constants/titrations';
import {
  addTitrant,
  indicatorColor,
  indicatorColorName,
  phAfter,
} from '~/utils/titrations';
import { useHold } from '~/utils/use-hold';

const MILLILITRE = 1; // mL added by "Add 1 mL"

export default function Titrations() {
  const [analyte, setAnalyte] = useState<Analyte>(ANALYTES[0]);
  const [indicator, setIndicator] = useState(
    INDICATORS.find((i) => i.id === 'phenolphthalein')!,
  );
  const [volume, setVolume] = useState(0);

  const add = (amount: number) => setVolume((v) => addTitrant(v, amount));
  const pour = useHold(
    useCallback((seconds: number) => add(POUR_RATE * seconds), []),
  );
  const empty = volume >= BURETTE_CAPACITY;
  const { stop } = pour;
  useEffect(() => {
    if (empty) stop();
  }, [empty, stop]);

  const chooseAnalyte = (a: Analyte) => {
    setAnalyte(a);
    setVolume(0); // a fresh flask and a full burette
  };

  const pH = phAfter(analyte, analyte.labConcentration, volume);
  const colorName = indicatorColorName(indicator, pH);

  return (
    <Container
      backHref="/"
      header="Titrations"
      description="Add titrant from the burette and watch the indicator and pH change."
      className="gap-4"
    >
      <div className="flex flex-col sm:flex-row flex-wrap gap-3 sm:items-center">
        <Dropdown
          label={`Analyte: ${analyte.name} (${analyte.formula})`}
          className="w-full sm:w-72"
          menuClassName="w-72"
        >
          {ANALYTES.map((a) => (
            <DropdownItem
              key={a.id}
              selected={a.id === analyte.id}
              onSelect={() => chooseAnalyte(a)}
            >
              {a.name} ({a.formula})
            </DropdownItem>
          ))}
        </Dropdown>
        <Dropdown
          label={`Indicator: ${indicator.name}`}
          className="w-full sm:w-64"
          menuClassName="w-64"
        >
          {INDICATORS.map((i) => (
            <DropdownItem
              key={i.id}
              selected={i.id === indicator.id}
              onSelect={() => setIndicator(i)}
            >
              {i.name} ({i.low}–{i.high})
            </DropdownItem>
          ))}
        </Dropdown>
        <span className="text-sm">
          Titrant: {TITRANT_CONCENTRATION.toFixed(3)} M {titrantFor(analyte)}
        </span>
      </div>

      <Stage
        label="Titration"
        header={
          <div className="flex items-start justify-between gap-4">
            <div data-testid="ph" className="leading-tight">
              <span className="block text-sm text-white/70">pH meter</span>
              <span className="block text-2xl sm:text-3xl font-bold whitespace-nowrap">
                pH {pH.toFixed(2)}
              </span>
            </div>
            <div data-testid="volume" className="text-right leading-tight">
              <span className="block text-sm text-white/70">Added</span>
              <span className="block text-2xl sm:text-3xl font-bold whitespace-nowrap">
                {volume.toFixed(2)} mL
              </span>
            </div>
          </div>
        }
        footer={
          <div className="flex flex-wrap items-center gap-2">
            <Button disabled={empty} onClick={() => add(DROP_VOLUME)}>
              Add drop
            </Button>
            <Button disabled={empty} onClick={() => add(MILLILITRE)}>
              Add 1 mL
            </Button>
            <Button pressed disabled={empty} {...pour.events}>
              Pour
            </Button>
            <Button onClick={() => setVolume(0)}>Reset</Button>
            {empty && (
              <span className="text-sm">
                The burette is empty. Reset to start again.
              </span>
            )}
          </div>
        }
      >
        <div className="flex justify-center pixel-control bg-primary-800 p-3">
          <TitrationApparatus
            volume={volume}
            color={indicatorColor(indicator, pH)}
            colorName={colorName}
          />
        </div>
        <p role="status" className="sr-only">
          pH {pH.toFixed(2)} after {volume.toFixed(2)} mL; the flask is{' '}
          {colorName}
        </p>
      </Stage>
    </Container>
  );
}
