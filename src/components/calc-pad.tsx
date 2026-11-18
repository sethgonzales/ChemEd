import { useId, useState, type FormEvent } from 'react';
import Button from '~/components/button';
import Dropdown, { DropdownItem } from '~/components/dropdown';
import { toSI, type GasUnit } from '~/utils/gas-laws';
import { PIXEL_CONTROL } from '~/utils/pixel';
import { cn } from '~/utils/cn';

interface Props {
  label: string; // what the answer is, e.g. "Volume to tie off at"
  units: GasUnit[]; // the first is the default
  hint: string;
  action: string; // the main button, e.g. "Tie off and fly"
  onSubmit: (value: number) => void; // in SI units
  disabled?: boolean;
}

// "540,000" or "5.4e5": commas and spaces are only for reading
const parse = (text: string) => {
  const clean = text.replace(/[,\s]/g, '');
  return clean === '' ? NaN : Number(clean);
};

/** A typed answer with its unit, room to work, and a hint on request */
export default function CalcPad({
  label,
  units,
  hint,
  action,
  onSubmit,
  disabled,
}: Props) {
  const [text, setText] = useState('');
  const [unit, setUnit] = useState<GasUnit>(units[0]);
  const [problem, setProblem] = useState('');
  const [hinted, setHinted] = useState(false);
  const id = useId();

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const value = parse(text);
    if (!Number.isFinite(value)) {
      setProblem('Type a number, like 540.');
      return;
    }
    setProblem('');
    onSubmit(toSI(value, unit));
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end gap-2">
        <label htmlFor={`${id}-answer`} className="w-full text-sm">
          {label}
        </label>
        <input
          id={`${id}-answer`}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={disabled}
          className={cn(
            PIXEL_CONTROL,
            'w-32 bg-white px-3 py-2 font-mono text-gray-900 tabular-nums',
          )}
        />
        <Dropdown label={unit} ariaLabel={`Unit: ${unit}`} inline readable>
          {units.map((u) => (
            <DropdownItem
              key={u}
              selected={u === unit}
              onSelect={() => setUnit(u)}
            >
              {u}
            </DropdownItem>
          ))}
        </Dropdown>
        <Button type="submit" pressed disabled={disabled}>
          {action}
        </Button>
        <Button expanded={hinted} onClick={() => setHinted((h) => !h)}>
          Hint
        </Button>
      </div>
      {problem && (
        <p role="alert" className="text-sm text-red-100">
          {problem}
        </p>
      )}
      {hinted && <p className="font-sans text-sm text-white/90">{hint}</p>}
      <label className="flex flex-col gap-1 text-sm">
        Working
        <textarea
          rows={2}
          className={cn(
            PIXEL_CONTROL,
            'bg-white px-3 py-2 font-mono text-sm text-gray-900',
          )}
        />
      </label>
    </form>
  );
}
