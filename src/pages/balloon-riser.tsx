import { useEffect, useState } from 'react';
import BalloonInstruments from '~/components/balloon-instruments';
import BalloonScene from '~/components/balloon-scene';
import Container from '~/components/container';
import { ATMOSPHERE_SOURCE } from '~/constants/atmosphere';
import {
  BALLOON,
  PREVIEW_FLIGHT,
  PREVIEW_LEG,
} from '~/constants/balloon-world';

// Phase 2: the look, before any levels. The door stays sealed until they exist.
export default function BalloonRiser() {
  const leg = PREVIEW_LEG;
  // for reviewing the look: ?distance=2500&height=600 puts the balloon mid-leg
  const [spot, setSpot] = useState({ distance: leg.from.distance, height: 0 });
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    setSpot({
      distance: Number(q.get('distance') ?? leg.from.distance),
      height: Number(q.get('height') ?? 0),
    });
  }, [leg.from.distance]);
  const flight = {
    ...PREVIEW_FLIGHT,
    height: spot.height || PREVIEW_FLIGHT.height,
  };
  return (
    <Container
      game
      header="Balloon Riser"
      description="Fly from platform to platform. Read the instruments, work out the gas law, and the balloon flies on your answer."
      backHref="/"
      sources={[ATMOSPHERE_SOURCE, 'codata', 'siBrochure', 'ciaawWeights']}
    >
      <div className="flex flex-col gap-4">
        <BalloonScene
          balloon={BALLOON}
          flight={flight}
          distance={spot.distance}
          leg={leg}
        />
        <BalloonInstruments
          balloon={BALLOON}
          flight={flight}
          station={leg.to}
        />
      </div>
    </Container>
  );
}
