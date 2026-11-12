import { IconVolume, IconVolumeOff } from '@tabler/icons-react';
import Button from '~/components/button';
import { useMuted } from '~/utils/sounds';

/** Turns every sound off or on, remembered in this browser */
export default function MuteButton() {
  const [muted, toggle] = useMuted();
  const Icon = muted ? IconVolumeOff : IconVolume;

  return (
    <Button pressed={muted} onClick={toggle}>
      <Icon size={20} aria-hidden="true" />
      <span className="sr-only">Mute sounds</span>
    </Button>
  );
}
