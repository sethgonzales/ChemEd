import { useState } from 'react';
import Container from '~/components/container';
import Dropdown, { DropdownItem } from '~/components/dropdown';
import Setting from '~/components/setting';
import Tabs from '~/components/tabs';
import TitrationBench, {
  IndicatorDropdown,
} from '~/components/titration-bench';
import TitrationUnknown from '~/components/titration-unknown';
import {
  ANALYTES,
  INDICATORS,
  TITRANT_CONCENTRATION,
  titrantFor,
  type Analyte,
  type Indicator,
} from '~/constants/titrations';
import { curveMarkers } from '~/utils/titrations';

function Lab({
  indicator,
  onIndicator,
}: {
  indicator: Indicator;
  onIndicator: (i: Indicator) => void;
}) {
  const [analyte, setAnalyte] = useState<Analyte>(ANALYTES[0]);
  const [volume, setVolume] = useState(0);
  const [showCurve, setShowCurve] = useState(true);
  const [showMarkers, setShowMarkers] = useState(false);

  const chooseAnalyte = (a: Analyte) => {
    setAnalyte(a);
    setVolume(0); // a fresh flask and a full burette
  };
  const concentration = analyte.labConcentration;

  return (
    <div className="flex flex-col gap-4">
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
        <IndicatorDropdown indicator={indicator} onSelect={onIndicator} />
        <span className="text-sm">
          Titrant: {TITRANT_CONCENTRATION.toFixed(3)} M {titrantFor(analyte)}
        </span>
      </div>

      <TitrationBench
        analyte={analyte}
        concentration={concentration}
        indicator={indicator}
        volume={volume}
        setVolume={setVolume}
        showPH
        curve={
          showCurve
            ? {
                markers: showMarkers
                  ? curveMarkers(analyte, concentration)
                  : null,
              }
            : null
        }
      />

      <div className="flex flex-col sm:flex-row gap-x-6 gap-y-2">
        <Setting checked={showCurve} onChange={setShowCurve}>
          Show pH curve
        </Setting>
        <Setting checked={showMarkers} onChange={setShowMarkers}>
          Mark equivalence points
        </Setting>
      </div>
    </div>
  );
}

export default function Titrations() {
  // shared, so a student can carry the indicator they trust into the Unknown
  const [indicator, setIndicator] = useState(
    INDICATORS.find((i) => i.id === 'phenolphthalein')!,
  );

  return (
    <Container
      backHref="/"
      header="Titrations"
      description="Add titrant from the burette and watch the indicator and pH change."
      className="gap-4"
    >
      <Tabs
        label="Mode"
        panelClassName="flex flex-col gap-4"
        tabs={[
          {
            id: 'lab',
            label: 'Lab',
            content: <Lab indicator={indicator} onIndicator={setIndicator} />,
          },
          {
            id: 'unknown',
            label: 'Unknown',
            content: (
              <TitrationUnknown
                indicator={indicator}
                onIndicator={setIndicator}
              />
            ),
          },
        ]}
      />
    </Container>
  );
}
