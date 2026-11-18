import { useEffect, useRef, useState } from 'react';
import Container from '~/components/container';
import Dropdown, { DropdownItem } from '~/components/dropdown';
import { useGuide } from '~/components/guide';
import HeatingCurve from '~/components/heating-curve';
import ParticleBox from '~/components/particle-box';
import Setting from '~/components/setting';
import Slider from '~/components/slider';
import Stage from '~/components/stage';
import { SUBSTANCES, type Substance } from '~/constants/substances';
import {
  clamp,
  phaseHint,
  PARTICLE_MOTION,
  phaseOf,
  temperatureRange,
  toModelTemp,
} from '~/utils/states-of-matter';
import { PHASE_SETTLE_MS, phaseMessage } from '~/utils/guide';
import { useMedia } from '~/utils/use-media';

const RANGE_STEPS = 7; // number of discrete labels on slider

const KELVIN_OFFSET = 273.15;

// the picture in words, for screen readers
const describeParticles = (s: Substance, tempC: number) =>
  `${s.name}: ${phaseOf(s, tempC)} at ${tempC} °C: particles ${PARTICLE_MOTION[phaseOf(s, tempC)]}`;

export default function StatesOfMatter() {
  const [substance, setSubstance] = useState(SUBSTANCES[0]);
  const [temperature, setTemperature] = useState(0);
  const [showCurve, setShowCurve] = useState(true);
  const { say } = useGuide();
  const range = temperatureRange(substance);

  // the thermometer keeps its reading, pulled into the new substance's range
  const chooseSubstance = (s: Substance) => {
    const { min, max } = temperatureRange(s);
    setSubstance(s);
    setTemperature((t) => clamp(t, min, max));
  };

  // Mr. G names a phase change once the slider settles in the new phase
  const phase = phaseOf(substance, temperature);
  const hint = phaseHint(substance, temperature);
  const announced = useRef(phase);
  useEffect(() => {
    if (phase === announced.current) return;
    const timer = setTimeout(() => {
      say(phaseMessage(announced.current, phase), 'tip', { unprompted: true });
      announced.current = phase;
    }, PHASE_SETTLE_MS);
    return () => clearTimeout(timer);
  }, [phase, say]);

  // the physics runs on the water scale it was tuned on
  const modelTemp = toModelTemp(substance, temperature);
  // reduced motion: the box holds still, and the page says so
  const reducedMotion = useMedia('(prefers-reduced-motion: reduce)');

  return (
    <Container
      backHref="/"
      header="States of Matter"
      sources={[...SUBSTANCES.flatMap((s) => s.sources), 'stateOfMatter']}
      description="Heat or cool the substance and watch how its particles move."
      className="gap-4"
    >
      <div className="w-full max-w-4xl mx-auto">
        <Dropdown
          label={`Substance: ${substance.name} (${substance.formula})`}
          className="w-full sm:w-64"
          menuClassName="w-64"
        >
          {SUBSTANCES.map((s) => (
            <DropdownItem
              key={s.id}
              selected={s.id === substance.id}
              onSelect={() => chooseSubstance(s)}
            >
              {s.name} ({s.formula})
            </DropdownItem>
          ))}
        </Dropdown>
      </div>
      <Stage
        label="Particle model"
        className="w-full max-w-4xl mx-auto"
        header={
          <div className="flex items-start justify-between gap-4">
            <div
              data-testid="phase"
              className="flex flex-col items-start gap-1"
            >
              <span className="px-3 py-1 pixel-control bg-secondary-500 text-text-secondary font-pixel">
                {phase}
              </span>
              {hint && <span className="text-xs">{hint}</span>}
            </div>
            {/* the reading stays on one line; the hint beside it wraps instead */}
            <div
              data-testid="temperature"
              className="shrink-0 whitespace-nowrap text-right leading-tight"
            >
              <span className="block text-3xl font-bold">{temperature} °C</span>
              <span className="block text-sm text-white/70">
                {Math.round(temperature + KELVIN_OFFSET)} K
              </span>
            </div>
          </div>
        }
        footer={
          <Slider
            label="Temperature"
            value={temperature}
            onChange={setTemperature}
            min={range.min}
            max={range.max}
            rangeSteps={RANGE_STEPS}
            // cold to hot
            sliderThumb="bg-linear-to-r from-sky-400 via-amber-300 to-rose-500"
          />
        }
      >
        {/* particles and heating curve side by side, stacked on a phone */}
        <div className="flex flex-col md:flex-row gap-3">
          <ParticleBox
            modelTemp={modelTemp}
            label={describeParticles(substance, temperature)}
            className="h-64 sm:h-80 w-full md:flex-1 md:min-w-0"
          />
          {showCurve && (
            <div className="md:flex-1 md:min-w-0 flex items-center justify-center pixel-control bg-primary-800">
              <HeatingCurve substance={substance} temperature={temperature} />
            </div>
          )}
        </div>
        {reducedMotion && (
          <p className="text-xs text-white/80">
            Reduced motion is on, so the particles hold still. The picture
            updates when you change the temperature.
          </p>
        )}
      </Stage>
      <div className="w-full max-w-4xl mx-auto">
        <Setting checked={showCurve} onChange={setShowCurve}>
          Show heating curve
        </Setting>
      </div>
    </Container>
  );
}
