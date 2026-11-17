import { COUPLES } from '~/constants/electrochemistry';
import type { Cell } from '~/utils/electrochemistry';

/** Standard reduction potentials, the cell's two metals marked */
export default function PotentialTable({ inUse }: { inUse: Cell }) {
  const used = new Set([inUse.left.electrode, inUse.right.electrode]);
  return (
    <table className="w-full max-w-sm text-sm">
      <caption className="text-left font-semibold">
        Standard reduction potentials (25 °C, 1 M)
      </caption>
      <thead>
        <tr className="text-left text-white/70">
          <th scope="col" className="font-normal">
            Half-reaction
          </th>
          <th scope="col" className="font-normal text-right">
            E° (V)
          </th>
        </tr>
      </thead>
      <tbody>
        {[...COUPLES].reverse().map((c) => (
          <tr key={c.id} className={used.has(c.id) ? 'text-secondary' : ''}>
            <td>
              {c.ion} + {c.charge === 1 ? '' : c.charge}e⁻ → {c.id}
            </td>
            <td className="text-right tabular-nums">
              {c.eStandard < 0 ? '−' : '+'}
              {Math.abs(c.eStandard).toFixed(2)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
