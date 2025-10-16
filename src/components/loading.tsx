import { IconLoader } from '@tabler/icons-react';

export default function Loading() {
  return (
    <div className="flex items-center justify-center h-screen">
      <IconLoader size={40} className="animate-spin" />
    </div>
  );
}
