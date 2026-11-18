import { render, screen, within } from '@testing-library/react';
import type { Leg } from '~/constants/balloon-world';
import type { Rider } from '~/constants/riders';
import { airAt } from '~/utils/atmosphere';
import BalloonScene from './balloon-scene';

const balloon = { fullVolume: 1000, burstOverpressure: 15000, payload: 600 };
const flight = { moles: 21000, gasTemperature: 285, height: 200, speed: 0 };
const leg: Leg = {
  from: { name: 'Launch field', kind: 'field', distance: 0, height: 200 },
  to: { name: 'Red Mesa', kind: 'mesa', distance: 5000, height: 800 },
  valley: 150,
};

function renderScene(rider?: Rider, at = { distance: 0, flight }) {
  render(
    <BalloonScene
      balloon={balloon}
      flight={at.flight}
      distance={at.distance}
      leg={leg}
      rider={rider}
    />,
  );
}

// on the ground at sea level, helium at the air's 15 °C
const seaLevel = { moles: 20000, gasTemperature: 288.15, height: 0, speed: 0 };
const gauge = (group: HTMLElement, name: string) =>
  within(group).getByRole('button', { name: new RegExp(`^${name}`) });

describe('BalloonScene', () => {
  it('has Mr. G riding in the basket', () => {
    renderScene();
    expect(
      screen.getByRole('img', { name: /Mr\. G in the balloon’s basket/ }),
    ).toBeInTheDocument();
  });

  it('takes any rider, so a student’s avatar can fly instead', () => {
    renderScene({
      name: 'Sam',
      rows: () => Array(30).fill('....................'),
      palette: {},
    });
    expect(
      screen.getByRole('img', { name: /Sam in the balloon’s basket/ }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('img', { name: /Mr\. G/ }),
    ).not.toBeInTheDocument();
  });

  it('shows the leg: where you are and where you’re headed, with their heights', () => {
    renderScene();
    const from = screen.getByRole('group', { name: 'Launch field' });
    expect(within(from).getByText('200 m')).toBeInTheDocument();
    const to = screen.getByRole('group', { name: 'Red Mesa' });
    expect(within(to).getByText('800 m')).toBeInTheDocument();
  });

  it('rings the balloon with its own gauges, reading live', () => {
    renderScene(undefined, { distance: 0, flight: seaLevel });
    const own = screen.getByRole('group', { name: 'The balloon' });
    expect(gauge(own, 'Helium thermometer')).toHaveAccessibleName(
      'Helium thermometer: 15.0 °C',
    );
    expect(gauge(own, 'Balloon gauge')).toHaveAccessibleName(
      'Balloon gauge: 101.3 kPa',
    );
    expect(gauge(own, 'Volume meter')).toHaveAccessibleName(
      'Volume meter: 473 m³',
    );
    expect(gauge(own, 'Helium counter')).toHaveAccessibleName(
      'Helium counter: 20,000 mol',
    );
    expect(within(own).getAllByRole('button')).toHaveLength(4);
  });

  it('keeps the air’s instruments apart from the balloon’s', () => {
    renderScene(undefined, { distance: 0, flight: seaLevel });
    const air = screen.getByRole('group', { name: 'The air here' });
    expect(gauge(air, 'Altimeter')).toHaveAccessibleName('Altimeter: 0 m');
    expect(gauge(air, 'Outside thermometer')).toHaveAccessibleName(
      'Outside thermometer: 15.0 °C',
    );
    expect(gauge(air, 'Barometer')).toHaveAccessibleName(
      'Barometer: 101.3 kPa',
    );
    expect(within(air).getAllByRole('button')).toHaveLength(3);
  });

  it('radios the next stop’s weather station readings while it’s out of sight', () => {
    renderScene();
    const station = screen.getByRole('group', {
      name: 'Red Mesa weather station, by radio',
    });
    expect(gauge(station, 'Barometer')).toHaveAccessibleName(
      `Barometer: ${(airAt(800).pressure / 1000).toFixed(1)} kPa`,
    );
  });

  it('shows the station’s readings as you arrive', () => {
    renderScene(undefined, {
      distance: 4900,
      flight: { ...flight, height: 900 },
    });
    const station = screen.getByRole('group', {
      name: 'Red Mesa weather station',
    });
    const air = airAt(800);
    expect(gauge(station, 'Barometer')).toHaveAccessibleName(
      `Barometer: ${(air.pressure / 1000).toFixed(1)} kPa`,
    );
    // just the pressure a Boyle's law leg needs: the air gauges have the rest
    expect(within(station).getAllByRole('button')).toHaveLength(1);
  });

  it('leaves the station out on a level leg, where it’d repeat the air’s gauges', () => {
    render(
      <BalloonScene
        balloon={balloon}
        flight={flight}
        distance={0}
        leg={{ ...leg, to: { ...leg.to, height: leg.from.height } }}
      />,
    );
    expect(
      screen.queryByRole('group', { name: /weather station/ }),
    ).not.toBeInTheDocument();
  });

  it('hangs free flight’s coins along the way, and drops each one as it’s collected', () => {
    const { container } = render(
      <BalloonScene
        balloon={balloon}
        flight={flight}
        distance={0}
        leg={leg}
        coins={[
          { distance: 1200, height: 500, taken: false },
          { distance: 2500, height: 700, taken: true },
          { distance: 3700, height: 800, taken: false },
        ]}
      />,
    );
    expect(
      screen.getByRole('img', {
        name: 'Coins on the way: 2 of 3 still to collect',
      }),
    ).toBeInTheDocument();
    expect(container.querySelectorAll('[data-coin]')).toHaveLength(2);
  });

  it('has no coins outside free flight', () => {
    renderScene();
    expect(
      screen.queryByRole('img', { name: /^Coins/ }),
    ).not.toBeInTheDocument();
  });

  it('has a height ruler for what’s in view', () => {
    renderScene();
    const ruler = screen.getByRole('list', { name: 'Height' });
    expect(within(ruler).getByText('200 m')).toBeInTheDocument();
  });

  it('shows the envelope torn open once the helium bursts it', () => {
    // stretched full and far too hot: way past the 15 kPa it holds
    const burst = { ...flight, moles: 40000, gasTemperature: 360 };
    renderScene(undefined, { distance: 0, flight: burst });
    expect(
      screen.getByRole('img', { name: /envelope’s burst/ }),
    ).toBeInTheDocument();
  });

  it('says nothing of bursting while it holds', () => {
    renderScene();
    expect(screen.queryByRole('img', { name: /burst/ })).toBeNull();
  });

  it('holds Mr. G and the controls in the scene', () => {
    render(
      <BalloonScene balloon={balloon} flight={flight} distance={0} leg={leg}>
        <p>Morning!</p>
      </BalloonScene>,
    );
    expect(screen.getByText('Morning!')).toBeInTheDocument();
  });

  it('can leave the instruments out, before there’s a leg to fly', () => {
    render(
      <BalloonScene
        balloon={balloon}
        flight={flight}
        distance={0}
        leg={leg}
        instruments={false}
      />,
    );
    expect(screen.queryByRole('group', { name: 'The balloon' })).toBeNull();
    expect(screen.queryByRole('group', { name: 'The air here' })).toBeNull();
    expect(
      screen.getByRole('img', { name: /Mr\. G in the balloon’s basket/ }),
    ).toBeInTheDocument();
  });
});

describe('BalloonScene, on a wide screen', () => {
  const narrow = window.matchMedia;
  beforeEach(() => {
    window.matchMedia = (query: string) =>
      ({
        ...narrow(query),
        matches: query.includes('min-width'),
      }) as MediaQueryList;
  });
  afterEach(() => {
    window.matchMedia = narrow;
  });

  it('writes Mr. G’s words across the sky from just past the height ruler, in black for contrast', () => {
    render(
      <BalloonScene balloon={balloon} flight={flight} distance={0} leg={leg}>
        <p>Next stop: Red Mesa.</p>
      </BalloonScene>,
    );
    const panel = screen.getByText('Next stop: Red Mesa.').parentElement!;
    const ruler = screen.getByRole('list', { name: 'Height' });
    const left = parseFloat(panel.style.left);
    expect(left).toBeGreaterThan(parseFloat(ruler.style.width));
    expect(left).toBeLessThanOrEqual(parseFloat(ruler.style.width) + 16);
    expect(panel).toHaveClass('text-black');
  });

  it('puts the answer controls apart from Mr. G’s words, down at the bottom right under the gauges, in black', () => {
    render(
      <BalloonScene
        balloon={balloon}
        flight={flight}
        distance={0}
        leg={leg}
        controls={<button type="button">Tie off and fly</button>}
      >
        <p>Next stop: Red Mesa.</p>
      </BalloonScene>,
    );
    const answer = screen.getByRole('group', { name: 'Your answer' });
    expect(answer).toContainElement(
      screen.getByRole('button', { name: 'Tie off and fly' }),
    );
    expect(answer).not.toContainElement(
      screen.getByText('Next stop: Red Mesa.'),
    );
    // after the air's gauges, so it stacks under them
    const air = screen.getByRole('group', { name: 'The air here' });
    expect(
      air.compareDocumentPosition(answer) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(answer).toHaveClass('text-black');
  });
});

describe('BalloonScene, on a phone', () => {
  it('puts the answer controls under the scene, after Mr. G’s words', () => {
    render(
      <BalloonScene
        balloon={balloon}
        flight={flight}
        distance={0}
        leg={leg}
        controls={<button type="button">Tie off and fly</button>}
      >
        <p>Next stop: Red Mesa.</p>
      </BalloonScene>,
    );
    const words = screen.getByText('Next stop: Red Mesa.');
    const answer = screen.getByRole('group', { name: 'Your answer' });
    expect(
      words.compareDocumentPosition(answer) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(answer).not.toHaveClass('text-black');
  });
});
