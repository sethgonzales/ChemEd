import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { isMuted } from '~/utils/sounds';
import MuteButton from './mute-button';

beforeEach(() => localStorage.clear());

const muteButton = () => screen.getByRole('button', { name: 'Mute sounds' });

describe('MuteButton', () => {
  it('starts with sounds on', () => {
    render(<MuteButton />);
    expect(muteButton()).toHaveAttribute('aria-pressed', 'false');
  });

  it('mutes and unmutes the sounds when pressed', async () => {
    render(<MuteButton />);
    await userEvent.click(muteButton());
    expect(muteButton()).toHaveAttribute('aria-pressed', 'true');
    expect(isMuted()).toBe(true);

    await userEvent.click(muteButton());
    expect(muteButton()).toHaveAttribute('aria-pressed', 'false');
    expect(isMuted()).toBe(false);
  });

  it('remembers being muted on the next visit', async () => {
    const { unmount } = render(<MuteButton />);
    await userEvent.click(muteButton());
    unmount();

    render(<MuteButton />);
    expect(muteButton()).toHaveAttribute('aria-pressed', 'true');
  });
});
