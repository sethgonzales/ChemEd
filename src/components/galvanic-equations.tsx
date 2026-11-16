import {
  FARADAY,
  GAS_CONSTANT,
  ROOM_TEMPERATURE,
} from '~/constants/electrochemistry';
import type { CellReaction, CellReading } from '~/utils/electrochemistry';

const SUPERSCRIPT: Record<string, string> = {
  '-': '⁻',
  ...Object.fromEntries([...'0123456789'].map((d, i) => [d, '⁰¹²³⁴⁵⁶⁷⁸⁹'[i]])),
};

// 0.01, 1, 250; or 1.23 × 10⁻⁷ when that would be unreadable
export function formatNumber(x: number) {
  if (x >= 1e-3 && x < 1e4) return String(Number(x.toPrecision(3)));
  const [mantissa, exponent] = x.toExponential(2).split('e');
  const power = [...String(Number(exponent))]
    .map((c) => SUPERSCRIPT[c])
    .join('');
  return `${mantissa} × 10${power}`;
}

// negatives in brackets, so "0.337 − (−0.762)" reads right
const signed = (v: number) =>
  v < 0 ? `(−${Math.abs(v).toFixed(3)})` : v.toFixed(3);

interface Props {
  reaction: CellReaction;
  reading: CellReading;
  eCathode: number; // E° of each electrode, V
  eAnode: number;
}

/** The half-equations, the overall equation and the Nernst equation, worked */
export default function GalvanicEquations({
  reaction,
  reading,
  eCathode,
  eAnode,
}: Props) {
  const rtf = (GAS_CONSTANT * ROOM_TEMPERATURE) / FARADAY; // V
  const e0 = reading.standardVoltage!;

  return (
    <div className="grid gap-3 text-sm sm:grid-cols-2">
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
        <dt className="text-white/70">Anode (oxidation)</dt>
        <dd>{reaction.oxidation}</dd>
        <dt className="text-white/70">Cathode (reduction)</dt>
        <dd>{reaction.reduction}</dd>
        <dt className="text-white/70">Overall</dt>
        <dd>{reaction.overall}</dd>
      </dl>
      <div data-testid="nernst" className="flex flex-col gap-1">
        <p>
          E°cell = {signed(eCathode)} − {signed(eAnode)} = {e0.toFixed(3)} V{' '}
          <span className="text-white/70">(cathode − anode)</span>
        </p>
        <p>
          Q = {reaction.quotient} = {formatNumber(reaction.q)}
        </p>
        <p>
          E = E°cell − (RT / nF) ln Q = {e0.toFixed(3)} − ({rtf.toFixed(5)} /{' '}
          {reaction.n}) ln {formatNumber(reaction.q)} ={' '}
          {reading.voltage.toFixed(3)} V
        </p>
      </div>
    </div>
  );
}
