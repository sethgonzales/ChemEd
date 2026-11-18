import { render, screen, within } from '@testing-library/react';
import type { Platform } from '~/constants/balloon-world';
import type { Rider } from '~/constants/riders';
import { airAt } from '~/utils/atmosphere';
import BalloonScene from './balloon-scene';

const balloon = { fullVolume: 1000, burstOverpressure: 15000, payload: 600 };
const flight = { moles: 20000, gasTemperature: 288.15, height: 300, speed: 0 };
const platforms: Platform[] = [
  { name: 'Launch pad', kind: 'pad', distance: 200, height: 300 },
  { name: 'The ridge', kind: 'ridge', distance: 2400, height: 1500 },
];

function renderScene(rider?: Rider) {
  render(
    <BalloonScene
      balloon={balloon}
      flight={flight}
      distance={200}
      platforms={platforms}
      rider={rider}
    />,
  );
}

const kPa = (h: number) => `${(airAt(h).pressure / 1000).toFixed(1)} kPa`;
const celsius = (h: number) =>
  `${(airAt(h).temperature - 273.15).toFixed(1)} °C`;

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

  it('marks each platform with its height and a weather station’s readings', () => {
    renderScene();
    const ridge = screen.getByRole('group', { name: 'The ridge' });
    expect(within(ridge).getByText('1,500 m')).toBeInTheDocument();
    expect(within(ridge).getByText(kPa(1500))).toBeInTheDocument();
    expect(within(ridge).getByText(celsius(1500))).toBeInTheDocument();

    const pad = screen.getByRole('group', { name: 'Launch pad' });
    expect(within(pad).getByText('300 m')).toBeInTheDocument();
  });

  it('has a height ruler up the side', () => {
    renderScene();
    const ruler = screen.getByRole('list', { name: 'Height' });
    for (const mark of ['0 m', '500 m', '1,000 m', '1,500 m']) {
      expect(within(ruler).getByText(mark)).toBeInTheDocument();
    }
  });
});
