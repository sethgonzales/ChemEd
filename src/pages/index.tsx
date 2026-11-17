import { useRouter } from 'next/router';
import Card from '~/components/card';
import { GAMES, SIMULATIONS } from '~/constants';

export default function Home() {
  const router = useRouter();

  return (
    <div className="flex flex-col gap-6">
      {/* the games first, each a wide door taking half the row */}
      <section
        aria-label="Games"
        className="grid grid-cols-1 gap-6 md:grid-cols-2"
      >
        {GAMES.map((game) => (
          <Card
            key={game.path}
            wide
            title={game.title}
            color={game.color}
            art={game.art}
            ready={game.ready}
            onClick={() => router.push(game.path)}
          />
        ))}
      </section>
      <section
        aria-label="Simulations"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
      >
        {SIMULATIONS.map((simulation) => (
          <Card
            key={simulation.path}
            title={simulation.title}
            color={simulation.color}
            art={simulation.art}
            ready={simulation.ready}
            onClick={() => router.push(simulation.path)}
          />
        ))}
      </section>
    </div>
  );
}
