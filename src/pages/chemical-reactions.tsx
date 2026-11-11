import { useState, type FormEvent } from 'react';
import Button from '~/components/button';
import Container from '~/components/container';
import Dropdown, { DropdownItem } from '~/components/dropdown';
import ReactionBalancer from '~/components/reaction-balancer';
import { REACTION_LEVELS, REACTIONS } from '~/constants/reactions';
import { cn } from '~/utils/cn';
import { parseEquation, solve, type Reaction } from '~/utils/reactions';

type Mode = 'practice' | 'own';

const MODES: { mode: Mode; label: string }[] = [
  { mode: 'practice', label: 'Practice' },
  { mode: 'own', label: 'Your own equation' },
];

/** Balance equations from the library, level by level */
function Practice() {
  const [chosen, setChosen] = useState(REACTIONS[0]);
  const levelReactions = REACTIONS.filter((r) => r.level === chosen.level);
  const levelName = `Level ${chosen.level}: ${REACTION_LEVELS[chosen.level]}`;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col sm:flex-row flex-wrap gap-3 sm:items-end">
        <div className="flex flex-col gap-1 text-sm">
          <span aria-hidden="true">Level</span>
          <Dropdown
            label={levelName}
            ariaLabel={`Choose a level (now ${levelName})`}
            className="w-full sm:w-80"
            menuClassName="w-80"
          >
            {Object.entries(REACTION_LEVELS).map(([level, name]) => (
              <DropdownItem
                key={level}
                selected={Number(level) === chosen.level}
                onSelect={() =>
                  setChosen(REACTIONS.find((r) => r.level === Number(level))!)
                }
              >
                Level {level}: {name}
              </DropdownItem>
            ))}
          </Dropdown>
        </div>
        <div className="flex flex-col gap-1 text-sm">
          <span aria-hidden="true">Reaction</span>
          <Dropdown
            label={chosen.name}
            ariaLabel={`Choose a reaction (now ${chosen.name})`}
            className="w-full sm:w-80"
            menuClassName="w-80"
          >
            {levelReactions.map((r) => (
              <DropdownItem
                key={r.id}
                selected={r.id === chosen.id}
                onSelect={() => setChosen(r)}
              >
                {r.name}
              </DropdownItem>
            ))}
          </Dropdown>
        </div>
      </div>

      {/* a new reaction starts with fresh coefficients */}
      <ReactionBalancer
        key={chosen.id}
        reaction={parseEquation(chosen.equation)}
        answer={chosen.answer}
      />
    </div>
  );
}

/** Type any equation and balance it */
function OwnEquation() {
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const [current, setCurrent] = useState<{
    key: string;
    reaction: Reaction;
    answer: number[];
  } | null>(null);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    try {
      const reaction = parseEquation(text);
      const answer = solve(reaction);
      if (!answer) {
        setCurrent(null);
        setError(
          "This equation can't be balanced, or can be balanced in more than one way. Check the formulas.",
        );
        return;
      }
      setError('');
      setCurrent({ key: text, reaction, answer });
    } catch (err) {
      setCurrent(null);
      setError((err as Error).message);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <form onSubmit={submit} className="flex flex-col sm:flex-row gap-2">
        <input
          type="text"
          aria-label="Equation"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="e.g. CH4 + O2 -> CO2 + H2O"
          className="flex-1 rounded-lg px-3 py-2 bg-white text-gray-900"
        />
        <Button type="submit" pressed>
          Balance this
        </Button>
      </form>
      <p className="text-sm -mt-2">
        Write formulas with plain numbers (H2O, Ca3(PO4)2) and an arrow (-&gt;)
        between the sides.
      </p>
      {error && (
        <p role="alert" className="font-semibold">
          {error}
        </p>
      )}
      {current && (
        <ReactionBalancer
          key={current.key}
          reaction={current.reaction}
          answer={current.answer}
        />
      )}
    </div>
  );
}

export default function ChemicalReactions() {
  const [mode, setMode] = useState<Mode>('practice');

  return (
    <Container header="Chemical Reactions" className="gap-4">
      <h3 className="text-lg font-semibold">Balancing equations</h3>
      <p className="text-sm -mt-2">
        Change the coefficients until every element has the same number of atoms
        on both sides. The seesaw holds the molecules on each side and tips
        toward the side with more atoms; when every element matches, it levels
        out.
      </p>

      <div
        role="tablist"
        aria-label="Activity"
        className="flex flex-wrap gap-2"
      >
        {MODES.map(({ mode: m, label }) => (
          <button
            key={m}
            id={`reactions-tab-${m}`}
            type="button"
            role="tab"
            aria-selected={mode === m}
            aria-controls={`reactions-panel-${m}`}
            onClick={() => setMode(m)}
            className={cn(
              'px-4 py-2 rounded-lg font-semibold cursor-pointer',
              mode === m
                ? 'bg-white text-gray-900'
                : 'bg-primary-700 text-white hover:bg-primary-800',
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* both stay mounted, so switching keeps each one's progress */}
      {MODES.map(({ mode: m }) => (
        <div
          key={m}
          id={`reactions-panel-${m}`}
          role="tabpanel"
          aria-labelledby={`reactions-tab-${m}`}
          hidden={mode !== m}
        >
          {m === 'practice' ? <Practice /> : <OwnEquation />}
        </div>
      ))}
    </Container>
  );
}
