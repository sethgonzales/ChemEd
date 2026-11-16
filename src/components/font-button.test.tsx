import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FontButton from './font-button';

const html = document.documentElement;

beforeEach(() => {
  localStorage.clear();
  delete html.dataset.font;
});

const fontButton = () => screen.getByRole('button', { name: 'Readable font' });

describe('FontButton', () => {
  it('starts with the pixel font', () => {
    render(<FontButton />);
    expect(fontButton()).toHaveAttribute('aria-pressed', 'false');
  });

  it('turns the readable font on and off for the whole page', async () => {
    render(<FontButton />);
    await userEvent.click(fontButton());
    expect(fontButton()).toHaveAttribute('aria-pressed', 'true');
    expect(html.dataset.font).toBe('readable');

    await userEvent.click(fontButton());
    expect(fontButton()).toHaveAttribute('aria-pressed', 'false');
    expect(html.dataset.font).toBeUndefined();
  });

  it('remembers the readable font on the next visit', async () => {
    const { unmount } = render(<FontButton />);
    await userEvent.click(fontButton());
    unmount();

    render(<FontButton />);
    expect(fontButton()).toHaveAttribute('aria-pressed', 'true');
  });
});
