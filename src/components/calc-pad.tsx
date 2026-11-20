import { useId, useState, type FormEvent } from 'react';
import Button from '~/components/button';
import { useCheckSlot } from '~/components/check-slot';
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
  working?: boolean; // its own scratch space; false when it sits elsewhere
  stacked?: boolean; // label, answer, button and hint one under another, for a narrow corner
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
  working = true,
  stacked = false,
}: Props) {
  const [text, setText] = useState('');
  const [unit, setUnit] = useState<GasUnit>(units[0]);
  const [problem, setProblem] = useState('');
  const [hinted, setHinted] = useState(false);
  const id = useId();

  const check = () => {
    const value = parse(text);
    if (!Number.isFinite(value)) {
      setProblem('Type a number, like 540.');
      return;
    }
    setProblem('');
    onSubmit(toSI(value, unit));
  };
  const submit = (e: FormEvent) => {
    e.preventDefault();
    check();
  };
  // in a Dungeon Quest room, the main button goes on the door
  const slotted = useCheckSlot({
    label: action,
    disabled: disabled || !text.trim(),
    run: check,
  });

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <div
        className={cn(
          'flex gap-2',
          stacked ? 'flex-col items-stretch' : 'flex-wrap items-end',
        )}
      >
        <label htmlFor={`${id}-answer`} className="w-full text-sm">
          {label}
        </label>
        <div className="flex items-end gap-2">
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
              'bg-white px-3 py-2 font-mono text-gray-900 tabular-nums',
              stacked ? 'min-w-0 flex-1' : 'w-28',
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
        </div>
        {!slotted && (
          <Button type="submit" pressed disabled={disabled}>
            {action}
          </Button>
        )}
        <Button expanded={hinted} onClick={() => setHinted((h) => !h)}>
          Hint
        </Button>
      </div>
      {problem && (
        <p role="alert" className="text-sm text-red-100">
          {problem}
        </p>
      )}
      {/* in its surroundings' colour, so it reads on the sky too */}
      {hinted && <p className="font-sans text-sm">{hint}</p>}
      {working && <Working />}
    </form>
  );
}

/** Scratch space for the student's working */
export function Working() {
  return (
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
  );
}
