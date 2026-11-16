import Link from 'next/link';
import { useMemo, useState } from 'react';
import Button from '~/components/button';
import Container from '~/components/container';
import Dropdown, { DropdownItem } from '~/components/dropdown';
import ReactionParticles from '~/components/reaction-particles';
import ReactionSort from '~/components/reaction-sort';
import Stage from '~/components/stage';
import Tabs from '~/components/tabs';
import { balancedEquation, examplesOf } from '~/utils/reaction-particles';
import { apTags, TYPES } from '~/utils/reaction-types';
import { parseEquation, solve } from '~/utils/reactions';

type Type = keyof typeof TYPES;
const capital = (s: string) => s[0].toUpperCase() + s.slice(1);

/** Pick a type and an example, then watch the atoms regroup */
function Explore() {
  const [type, setType] = useState<Type>('synthesis');
  const examples = examplesOf(type);
  const [exampleId, setExampleId] = useState(examples[0].id);
  const example = examples.find((r) => r.id === exampleId) ?? examples[0];
  const [reacted, setReacted] = useState(false);
  const [done, setDone] = useState(false);

  const { reaction, coefficients } = useMemo(() => {
    const reaction = parseEquation(example.equation);
    return { reaction, coefficients: solve(reaction)! };
  }, [example]);
  const tags = apTags(reaction);

  const reset = () => {
    setReacted(false);
    setDone(false);
  };
  const pickType = (next: Type) => {
    setType(next);
    setExampleId(examplesOf(next)[0].id);
    reset();
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col sm:flex-row flex-wrap gap-3 sm:items-end">
        <div className="flex flex-col gap-1 text-sm">
          <span aria-hidden="true">Type</span>
          <Dropdown
            label={capital(type)}
            ariaLabel={`Choose a type (now ${type})`}
            className="w-full sm:w-64"
            menuClassName="w-64"
          >
            {(Object.keys(TYPES) as Type[]).map((t) => (
              <DropdownItem
                key={t}
                selected={t === type}
                onSelect={() => pickType(t)}
              >
                {capital(t)}
              </DropdownItem>
            ))}
          </Dropdown>
        </div>
        <div className="flex flex-col gap-1 text-sm">
          <span aria-hidden="true">Reaction</span>
          <Dropdown
            label={example.name}
            ariaLabel={`Choose a reaction (now ${example.name})`}
            className="w-full sm:w-80"
            menuClassName="w-80"
          >
            {examples.map((r) => (
              <DropdownItem
                key={r.id}
                selected={r.id === example.id}
                onSelect={() => {
                  setExampleId(r.id);
                  reset();
                }}
              >
                {r.name}
              </DropdownItem>
            ))}
          </Dropdown>
        </div>
      </div>

      <Stage
        label="Reaction"
        header={
          <div>
            <p className="text-lg font-semibold">{TYPES[type].pattern}</p>
            <p className="text-sm">{TYPES[type].meaning}</p>
          </div>
        }
        footer={
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-lg">
                {balancedEquation(reaction, coefficients)}
              </span>
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-primary-400 px-2 text-sm"
                >
                  {capital(tag)}
                </span>
              ))}
            </div>
            <p role="status" className="text-sm min-h-5">
              {done &&
                'The same atoms, regrouped: bonds broke and new ones formed, but no atom was made or lost.'}
            </p>
          </div>
        }
      >
        <ReactionParticles
          reaction={reaction}
          coefficients={coefficients}
          reacted={reacted}
          onDone={() => setDone(true)}
        />
      </Stage>

      <div className="flex flex-wrap gap-2">
        <Button pressed={reacted} onClick={() => setReacted(true)}>
          React
        </Button>
        <Button onClick={reset}>Reset</Button>
      </div>
    </div>
  );
}

export default function ChemicalReactions() {
  return (
    <Container
      backHref="/"
      header="Chemical Reactions"
      description="See how atoms regroup in each type of reaction, then learn to tell the types apart."
      className="gap-4"
    >
      <Tabs
        label="Activity"
        tabs={[
          { id: 'explore', label: 'Explore', content: <Explore /> },
          { id: 'sort', label: 'Sort', content: <ReactionSort /> },
        ]}
      />
      <p className="text-sm">
        Balancing equations has its own room:{' '}
        <Link
          href="/reaction-balancing"
          className="font-semibold text-secondary underline focus-visible:outline-2 focus-visible:outline-white"
        >
          Reaction Balancing
        </Link>
        .
      </p>
    </Container>
  );
}
