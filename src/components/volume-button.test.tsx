import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { getVolume, isMuted } from '~/utils/sounds';
import VolumeButton from './volume-button';

beforeEach(() => localStorage.clear());

const soundButton = () => screen.getByRole('button', { name: 'Sound' });
const muteButton = () => screen.getByRole('button', { name: 'Mute sounds' });
const slider = () => screen.getByRole('slider', { name: 'Volume' });

async function open() {
  render(<VolumeButton />);
  await userEvent.click(soundButton());
}

describe('VolumeButton', () => {
  it('opens a panel with the volume and a mute switch', async () => {
    render(<VolumeButton />);
    expect(soundButton()).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('slider')).not.toBeInTheDocument();

    await userEvent.click(soundButton());
    expect(soundButton()).toHaveAttribute('aria-expanded', 'true');
    expect(slider()).toHaveValue('100');
    expect(screen.getByText('100%')).toBeInTheDocument();
    expect(muteButton()).toHaveAttribute('aria-pressed', 'false');
  });

  it('turns the volume down with the slider, remembered in this browser', async () => {
    await open();
    fireEvent.change(slider(), { target: { value: '40' } });
    expect(screen.getByText('40%')).toBeInTheDocument();
    expect(getVolume()).toBe(0.4);
  });

  it('mutes and unmutes the sounds', async () => {
    await open();
    await userEvent.click(muteButton());
    expect(muteButton()).toHaveAttribute('aria-pressed', 'true');
    expect(isMuted()).toBe(true);

    await userEvent.click(muteButton());
    expect(isMuted()).toBe(false);
  });

  it('unmutes when the volume is moved, so the change is heard', async () => {
    await open();
    await userEvent.click(muteButton());
    fireEvent.change(slider(), { target: { value: '60' } });
    expect(isMuted()).toBe(false);
  });

  it('remembers being muted on the next visit', async () => {
    const { unmount } = render(<VolumeButton />);
    await userEvent.click(soundButton());
    await userEvent.click(muteButton());
    unmount();

    await open();
    expect(muteButton()).toHaveAttribute('aria-pressed', 'true');
  });

  it('closes on Escape, back to its button', async () => {
    await open();
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('slider')).not.toBeInTheDocument();
    expect(soundButton()).toHaveFocus();
  });

  it('closes when you click elsewhere', async () => {
    await open();
    await userEvent.click(document.body);
    expect(screen.queryByRole('slider')).not.toBeInTheDocument();
  });
});
