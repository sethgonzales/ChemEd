import { render, screen } from '@testing-library/react';
import Stage from './stage';

describe('Stage', () => {
  it('is a labelled region holding its content', () => {
    render(<Stage label="Particles">content</Stage>);
    expect(screen.getByRole('region', { name: 'Particles' })).toHaveTextContent(
      'content',
    );
  });

  it('puts the header above and the footer below the content', () => {
    render(
      <Stage label="Drawing" header={<p>top</p>} footer={<p>bottom</p>}>
        <p>middle</p>
      </Stage>,
    );
    const text = screen.getByRole('region').textContent;
    expect(text).toBe('topmiddlebottom');
  });
});
