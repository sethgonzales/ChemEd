import { render, screen } from '@testing-library/react';
import Titrations from '~/pages/titrations';

describe('Titrations page (placeholder)', () => {
  it('shows only its title', () => {
    render(<Titrations />);
    expect(
      screen.getByRole('heading', { name: 'Titrations' }),
    ).toBeInTheDocument();
  });
});
