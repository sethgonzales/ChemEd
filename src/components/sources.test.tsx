import { render, screen, within } from '@testing-library/react';
import Sources from './sources';
import { SOURCES } from '~/constants/sources';

describe('Sources', () => {
  it('lists each source under a Sources heading, with what it backs and a link', () => {
    render(<Sources ids={['cordero', 'ciaawWeights']} />);
    const region = screen.getByRole('region', { name: 'Sources' });
    const items = within(region).getAllByRole('listitem');
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent(SOURCES.cordero.topic);
    expect(items[0]).toHaveTextContent('Cordero');
    expect(items[0]).toHaveTextContent('(2008)');
    expect(within(items[0]).getByRole('link')).toHaveAttribute(
      'href',
      SOURCES.cordero.url,
    );
  });

  it('says when a web page was read', () => {
    render(<Sources ids={['ciaawWeights']} />);
    expect(screen.getByRole('listitem')).toHaveTextContent(/accessed \d/i);
  });

  it('lists a source once, however many facts it backs', () => {
    render(<Sources ids={['cordero', 'cordero']} />);
    expect(screen.getAllByRole('listitem')).toHaveLength(1);
  });

  it('renders nothing without sources', () => {
    const { container } = render(<Sources ids={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});
