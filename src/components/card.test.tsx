import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Card from './card';

const playKnock = jest.fn();
jest.mock('~/utils/use-knock', () => ({ useKnock: () => playKnock }));

beforeEach(() => {
  global.fetch = jest.fn().mockResolvedValue({
    text: () => Promise.resolve('<svg data-testid="card-svg"></svg>'),
  });
});

describe('Card', () => {
  it('shows its title and calls onClick when clicked', async () => {
    const onClick = jest.fn();
    render(<Card title="Periodic Table" onClick={onClick} />);
    await userEvent.click(
      screen.getByRole('button', { name: 'Periodic Table' }),
    );
    expect(onClick).toHaveBeenCalled();
  });

  it('fetches and inlines its SVG image', async () => {
    render(
      <Card
        title="Titrations"
        img="/images/titrations.svg"
        onClick={jest.fn()}
      />,
    );
    expect(await screen.findByTestId('card-svg')).toBeInTheDocument();
    expect(global.fetch).toHaveBeenCalledWith('/images/titrations.svg');
  });

  it('does not fetch without an image', () => {
    render(<Card title="Titrations" onClick={jest.fn()} />);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('plays a knock on hover', async () => {
    render(<Card title="Titrations" onClick={jest.fn()} />);
    await userEvent.hover(screen.getByRole('button'));
    expect(playKnock).toHaveBeenCalled();
  });
});
