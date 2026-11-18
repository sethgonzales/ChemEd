// Developer shortcuts (fly the right answer, solve a room…): always on while
// developing, and in a deployed build made with NEXT_PUBLIC_DEV_TOOLS=true.
// The static export bakes the value in at build time.

/** Whether the shortcuts are on */
export function devToolsOn({
  production,
  flag,
}: {
  production: boolean;
  flag: string | undefined; // NEXT_PUBLIC_DEV_TOOLS
}) {
  return !production || flag === 'true';
}

// written out in full: Next.js only inlines process.env.NEXT_PUBLIC_* literally
export const DEV_TOOLS = devToolsOn({
  production: process.env.NODE_ENV === 'production',
  flag: process.env.NEXT_PUBLIC_DEV_TOOLS,
});
