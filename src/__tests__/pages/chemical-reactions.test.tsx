import { render, screen } from '@testing-library/react';
import ChemicalReactions from '~/pages/chemical-reactions';

describe('Chemical Reactions page, while it is being built', () => {
  it('says reaction types are coming', () => {
    render(<ChemicalReactions />);
    expect(
      screen.getByRole('heading', { name: 'Chemical Reactions' }),
    ).toBeInTheDocument();
    expect(screen.getByText(/types of reactions/i)).toBeInTheDocument();
  });

  // old bookmarks to this page used to open balancing
  it('points the way to Reaction Balancing', () => {
    render(<ChemicalReactions />);
    expect(
      screen.getByRole('link', { name: /Reaction Balancing/ }),
    ).toHaveAttribute('href', '/reaction-balancing');
  });
});
