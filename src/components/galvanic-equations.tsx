import {
  FARADAY,
  GAS_CONSTANT,
  ROOM_TEMPERATURE,
} from '~/constants/electrochemistry';
import {
  bracketed,
  formatPotential,
  tableValue,
  type CellReaction,
} from '~/utils/electrochemistry';

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

interface Props {
  reaction: CellReaction;
  eCathode: number; // E° of each electrode, V
  eAnode: number;
}

/** The half-equations, the overall equation and the Nernst equation, worked */
export default function GalvanicEquations({
  reaction,
  eCathode,
  eAnode,
}: Props) {
  const rtf = (GAS_CONSTANT * ROOM_TEMPERATURE) / FARADAY; // V
  const [eC, eA] = [tableValue(eCathode), tableValue(eAnode)];
  const e0 = eC - eA;
  const e = e0 - (rtf / reaction.n) * Math.log(reaction.q);

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
          E°cell = {formatPotential(eC)} − {bracketed(eA)} = {e0.toFixed(2)} V{' '}
          <span className="text-white/70">(cathode − anode)</span>
        </p>
        <p>
          Q = {reaction.quotient} = {formatNumber(reaction.q)}
        </p>
        <p>
          E = E°cell − (RT / nF) ln Q = {e0.toFixed(2)} − ({rtf.toFixed(4)} /{' '}
          {reaction.n}) ln {formatNumber(reaction.q)} = {e.toFixed(2)} V
        </p>
      </div>
    </div>
  );
}
