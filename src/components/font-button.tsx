import { IconTypography } from '@tabler/icons-react';
import Button from '~/components/button';
import { useReadableFont } from '~/utils/font';

/** Swaps the pixel font for a plain one everywhere, remembered in this browser */
export default function FontButton() {
  const [readable, toggle] = useReadableFont();

  return (
    <Button pressed={readable} onClick={toggle}>
      <IconTypography size={20} aria-hidden="true" />
      <span className="sr-only">Readable font</span>
    </Button>
  );
}
