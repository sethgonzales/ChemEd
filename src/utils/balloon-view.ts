import { ZERO_CELSIUS } from '~/constants/physical';
import { airAt } from '~/utils/atmosphere';
import { gasInside, type Balloon, type Flight } from '~/utils/balloon';

export const ENVELOPE_RADIUS = 8; // art px, stretched full: small in a big world

/** What the balloon's instruments read, in the units each reads in */
export interface Readings {
  altitude: number; // m
  airTemperature: number; // °C
  airPressure: number; // kPa
  gasTemperature: number; // °C
  gasPressure: number; // kPa
  volume: number; // m³
  moles: number; // mol
}

export function readings(balloon: Balloon, flight: Flight): Readings {
  const air = airAt(flight.height);
  const gas = gasInside(balloon, flight);
  return {
    altitude: flight.height,
    airTemperature: air.temperature - ZERO_CELSIUS,
    airPressure: air.pressure / 1000,
    gasTemperature: flight.gasTemperature - ZERO_CELSIUS,
    gasPressure: gas.pressure / 1000,
    volume: gas.volume,
    moles: flight.moles,
  };
}

/** The envelope's drawn radius: a sphere's, growing as the cube root of its volume */
export const envelopeRadius = (volume: number, fullVolume: number) =>
  ENVELOPE_RADIUS * Math.cbrt(Math.min(volume, fullVolume) / fullVolume);

// The view is a window on the leg's world, in art pixels. It's sized from the
// screen so pixels stay about the same size everywhere; on a phone you see
// less of the world, not a smaller one.
const CSS_PER_ART = 3.4; // screen px per art px, roughly
const MIN_VIEW = 170; // art px wide; a phone sees less, so its gauges have room
const MAX_VIEW = 520;
const ASPECT = 0.36; // height over width: room for the land and a balloon above it
// a taller view on phones: room for the column of five gauges at the right
const MIN_VIEW_HEIGHT = 190;
const SCREEN_SHARE = 0.62; // of the window's height, leaving room for the controls
const MIN_SCREEN_HEIGHT = 380; // CSS px: the gauge column's height, on wide screens

/** The view in art px, and CSS px per art px, for a frame this wide in a window this tall */
export function viewSize(frameWidth: number, windowHeight: number) {
  const width = Math.round(
    Math.min(MAX_VIEW, Math.max(MIN_VIEW, frameWidth / CSS_PER_ART)),
  );
  const scale = frameWidth / width;
  const fits = Math.max(MIN_SCREEN_HEIGHT, windowHeight * SCREEN_SHARE) / scale;
  const height = Math.round(
    Math.min(Math.max(MIN_VIEW_HEIGHT, width * ASPECT), fits),
  );
  return { width, height, scale };
}

/** The frame width the scene guesses before it's measured, CSS px */
export const GUESSED_WIDTH = 400 * CSS_PER_ART;
