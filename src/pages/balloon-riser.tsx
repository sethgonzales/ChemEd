import BalloonInstruments from '~/components/balloon-instruments';
import BalloonScene from '~/components/balloon-scene';
import Container from '~/components/container';
import { ATMOSPHERE_SOURCE } from '~/constants/atmosphere';
import {
  BALLOON,
  PREVIEW_FLIGHT,
  PREVIEW_PLATFORMS,
} from '~/constants/balloon-world';

// Phase 2: the look, before any levels. The door stays sealed until they exist.
export default function BalloonRiser() {
  const flight = PREVIEW_FLIGHT;
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
          distance={PREVIEW_PLATFORMS[0].distance}
          platforms={PREVIEW_PLATFORMS}
        />
        <BalloonInstruments balloon={BALLOON} flight={flight} />
      </div>
    </Container>
  );
}
