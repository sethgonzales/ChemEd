import { render, screen, within } from '@testing-library/react';
import type { Leg } from '~/constants/balloon-world';
import type { Rider } from '~/constants/riders';
import BalloonScene from './balloon-scene';

const balloon = { fullVolume: 1000, burstOverpressure: 15000, payload: 600 };
const flight = { moles: 21000, gasTemperature: 285, height: 200, speed: 0 };
const leg: Leg = {
  from: { name: 'Launch field', kind: 'field', distance: 0, height: 200 },
  to: { name: 'Red Mesa', kind: 'mesa', distance: 5000, height: 800 },
  valley: 150,
};

function renderScene(rider?: Rider) {
  render(
    <BalloonScene
      balloon={balloon}
      flight={flight}
      distance={0}
      leg={leg}
      rider={rider}
    />,
  );
}

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

  it('has a height ruler for what’s in view', () => {
    renderScene();
    const ruler = screen.getByRole('list', { name: 'Height' });
    expect(within(ruler).getByText('200 m')).toBeInTheDocument();
  });
});
