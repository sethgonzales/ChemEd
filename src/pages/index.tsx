import { useRouter } from 'next/router';
import Card from '~/components/card';
import { SIMULATIONS } from '~/constants';

export default function Home() {
  const simulations = SIMULATIONS;
  const router = useRouter();

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {simulations.map((simulation, index) => (
        <Card
          key={index}
          title={simulation.title}
          color={simulation.color}
          art={simulation.art}
          ready={simulation.ready}
          onClick={() => router.push(simulation.path)}
        />
      ))}
    </div>
  );
}
