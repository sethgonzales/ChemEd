import { render, screen, within } from '@testing-library/react';
import BalloonRadio from './balloon-radio';

describe('BalloonRadio', () => {
  it('shows Mr. G in his flying outfit, saying his piece', () => {
    render(<BalloonRadio>Next stop: Red Mesa.</BalloonRadio>);
    const radio = screen.getByRole('region', { name: 'Mr. G' });
    expect(
      within(radio).getByRole('img', {
        name: 'Mr. G, in flying goggles and a scarf',
      }),
    ).toBeInTheDocument();
    expect(within(radio).getByText('Next stop: Red Mesa.')).toBeInTheDocument();
  });

  it('takes any rider, for a student’s avatar later', () => {
    render(
      <BalloonRadio
        rider={{
          name: 'Sam',
          rows: () => Array(30).fill('.'.repeat(20)),
          palette: {},
        }}
      >
        Hi
      </BalloonRadio>,
    );
    expect(screen.getByRole('region', { name: 'Sam' })).toBeInTheDocument();
  });
});
