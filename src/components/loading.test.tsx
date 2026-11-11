import { render } from '@testing-library/react';
import Loading from './loading';

describe('Loading', () => {
  it('renders a spinning icon', () => {
    const { container } = render(<Loading />);
    expect(container.querySelector('svg.animate-spin')).toBeInTheDocument();
  });
});
