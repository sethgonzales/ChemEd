import { fireEvent, render, screen } from '@testing-library/react';
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

  it('shows a one-line description under the header', () => {
    render(
      <Container header="States of Matter" description="Heat it up.">
        content
      </Container>,
    );
    const heading = screen.getByRole('heading', { name: 'States of Matter' });
    expect(heading.nextElementSibling).toHaveTextContent('Heat it up.');
  });

  describe('back arrow', () => {
    let click: jest.SpyInstance;
    beforeEach(() => {
      // jsdom can't navigate, so record the click on the back link instead
      click = jest
        .spyOn(HTMLAnchorElement.prototype, 'click')
        .mockImplementation(() => {});
    });
    afterEach(() => click.mockRestore());

    const back = () =>
      screen.queryByRole('link', { name: 'Back to simulations' });

    it('has a back arrow beside the header', () => {
      render(
        <Container header="Titrations" backHref="/">
          content
        </Container>,
      );
      expect(back()).toHaveAttribute('href', '/');
    });

    it('has no back arrow unless given somewhere to go', () => {
      render(<Container header="Titrations">content</Container>);
      expect(back()).toBeNull();
    });

    it('stays on the page when Escape is pressed', () => {
      render(
        <Container header="Titrations" backHref="/">
          content
        </Container>,
      );
      fireEvent.keyDown(window, { key: 'Escape' });
      expect(click).not.toHaveBeenCalled();
    });
  });
});
