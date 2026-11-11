import { render, screen } from '@testing-library/react';
import Container from './container';

describe('Container', () => {
  it('renders a header and its children', () => {
    render(<Container header="Titrations">content</Container>);
    expect(
      screen.getByRole('heading', { name: 'Titrations' }),
    ).toBeInTheDocument();
    expect(screen.getByText('content')).toBeInTheDocument();
  });

  it('omits the header when none is given', () => {
    render(<Container>content</Container>);
    expect(screen.queryByRole('heading')).not.toBeInTheDocument();
  });
});
