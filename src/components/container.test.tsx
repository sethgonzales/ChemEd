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

  it('writes a game’s header lines in the stylized font, like its game', () => {
    render(
      <Container header="Dungeon Quest" description="Fight on." game>
        content
      </Container>,
    );
    expect(screen.getByText('Fight on.')).toHaveClass('font-pixel');
  });

  it('can turn its back arrow into an action of the page’s own', () => {
    const onBack = jest.fn();
    render(
      <Container
        header="Dungeon Quest"
        back={{ label: 'Leave the chamber', onClick: onBack }}
      >
        content
      </Container>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Leave the chamber' }));
    expect(onBack).toHaveBeenCalled();
    expect(
      screen.queryByRole('link', { name: 'Back to simulations' }),
    ).toBeNull();
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

describe('Container sources', () => {
  it('cites its sources at the bottom', () => {
    render(
      <Container header="Periodic Table" sources={['cordero']}>
        <p>content</p>
      </Container>,
    );
    const region = screen.getByRole('region', { name: 'Sources' });
    expect(region).toHaveTextContent('Cordero');
    expect(screen.getByText('content').compareDocumentPosition(region)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
  });

  it('shows no sources section when a page states no facts', () => {
    render(<Container header="Reaction Balancing">content</Container>);
    expect(
      screen.queryByRole('region', { name: 'Sources' }),
    ).not.toBeInTheDocument();
  });
});
