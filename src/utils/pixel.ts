// The app's pixel, px: pixel art, 8-bit corners and edges all step in it, so
// every picture and control shares one grid. globals.css mirrors it as --pixel.
export const PIXEL = 4;

// Shared 8-bit styling for controls: stepped corners, a darker bottom edge like
// a raised game button, and a focus ring drawn inside (outlines get clipped).
export const PIXEL_CONTROL =
  'pixel-control font-pixel shadow-[inset_0_calc(-1*var(--pixel))_0_rgb(0_0_0/0.25)] focus-visible:outline-none focus-visible:shadow-[inset_0_0_0_var(--pixel)_white]';
