import { render, screen } from '@testing-library/react';
import ChemicalReactions from '~/pages/chemical-reactions';
import ElectronConfigurations from '~/pages/electron-configurations';
import LewisStructures from '~/pages/lewis-structures';
import Titrations from '~/pages/titrations';

describe.each([
  ['Chemical Reactions', ChemicalReactions],
  ['Electron Configurations', ElectronConfigurations],
  ['Lewis Structures', LewisStructures],
  ['Titrations', Titrations],
])('%s page (placeholder)', (title, Page) => {
  it('shows only its title', () => {
    render(<Page />);
    expect(screen.getByRole('heading', { name: title })).toBeInTheDocument();
  });
});
