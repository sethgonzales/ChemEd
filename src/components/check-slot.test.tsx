import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import Button from '~/components/button';
import { CheckSlot, useCheckSlot, type SlotCheck } from './check-slot';

/** A puzzle with its own check button, unless it's in a slot */
function Puzzle({ onCheck }: { onCheck: (answer: string) => void }) {
  const [answer, setAnswer] = useState('');
  const run = () => onCheck(answer);
  const slotted = useCheckSlot({ label: 'Check', disabled: !answer, run });
  return (
    <div>
      <input
        aria-label="Answer"
        value={answer}
        onChange={(e) => setAnswer(e.target.value)}
      />
      {!slotted && (
        <Button disabled={!answer} onClick={run}>
          Check
        </Button>
      )}
    </div>
  );
}

describe('a check slot', () => {
  it('leaves a component’s own check button where it is, outside a slot', async () => {
    const onCheck = jest.fn();
    render(<Puzzle onCheck={onCheck} />);
    await userEvent.type(screen.getByRole('textbox'), 'Ne');
    await userEvent.click(screen.getByRole('button', { name: 'Check' }));
    expect(onCheck).toHaveBeenCalledWith('Ne');
  });

  it('takes the check from a component inside it, to put elsewhere', async () => {
    const onCheck = jest.fn();
    let slot: SlotCheck | null = null;
    render(
      <CheckSlot onChange={(c) => (slot = c)}>
        <Puzzle onCheck={onCheck} />
      </CheckSlot>,
    );
    expect(screen.queryByRole('button', { name: 'Check' })).toBeNull();
    expect(slot!.label).toBe('Check');
    expect(slot!.disabled).toBe(true);
    await userEvent.type(screen.getByRole('textbox'), 'Ar');
    expect(slot!.disabled).toBe(false);
    act(() => slot!.run());
    expect(onCheck).toHaveBeenCalledWith('Ar'); // the latest answer
  });
});
