import { useEffect, useState } from 'react';
import Button from '~/components/button';
import Container from '~/components/container';
import QuestScene from '~/components/quest-scene';
import Villain, { type VillainMode } from '~/components/villain';
import { GOLEM } from '~/constants/villains/golem';

const REFORM_MS = 1000; // a beaten villain stays gone this long in the preview

/** A first look at the dungeon: the Golem in its chamber, and its frames */
export default function DungeonQuest() {
  const [mode, setMode] = useState<VillainMode>('idle');
  const [gone, setGone] = useState(false);

  useEffect(() => {
    if (!gone) return;
    const id = setTimeout(() => {
      setGone(false);
      setMode('idle');
    }, REFORM_MS);
    return () => clearTimeout(id);
  }, [gone]);

  const done = () => (mode === 'defeat' ? setGone(true) : setMode('idle'));

  return (
    <Container
      header="Dungeon Quest"
      description="A first look at the dungeon. A right answer hits the boss; a wrong one and it attacks."
      backHref="/"
    >
      <QuestScene
        label={`${GOLEM.name}’s chamber`}
        className="min-h-80"
        footer={
          <div className="flex flex-wrap justify-center gap-2">
            <Button onClick={() => setMode('hit')}>Right answer</Button>
            <Button onClick={() => setMode('attack')}>Wrong answer</Button>
            <Button onClick={() => setMode('defeat')}>Defeat</Button>
          </div>
        }
      >
        <div className="flex justify-center pt-8 pb-4">
          <Villain
            villain={GOLEM}
            mode={mode}
            onDone={done}
            scale={1.5}
            className="max-w-full h-auto"
          />
        </div>
      </QuestScene>
    </Container>
  );
}
