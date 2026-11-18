import { render, screen } from '@testing-library/react';
import { SOURCES } from '~/constants/sources';
import BalloonRiser from '~/pages/balloon-riser';

describe('Balloon Riser page', () => {
  it('shows the sky with Mr. G in the basket, and the instruments', () => {
    render(<BalloonRiser />);
    expect(
      screen.getByRole('heading', { name: 'Balloon Riser' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('img', { name: /Mr\. G in the balloon’s basket/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Altimeter/ }),
    ).toBeInTheDocument();
  });

  it('cites the standard atmosphere and the gas constant', () => {
    render(<BalloonRiser />);
    expect(
      screen.getByText(SOURCES.standardAtmosphere.title),
    ).toBeInTheDocument();
    expect(screen.getByText(SOURCES.codata.title)).toBeInTheDocument();
  });
});
