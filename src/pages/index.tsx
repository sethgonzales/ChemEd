import { useRouter } from 'next/router';
import Card from '~/components/ui/card';
import { SIMULATIONS } from '~/constants';

export default function Home() {
  const simulations = SIMULATIONS;
  const router = useRouter();

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-6 space-y-4">
      {simulations.map((simulation, index) => (
        <Card
          key={index}
          title={simulation.title}
          img={simulation.img}
          onClick={() => router.push(`/${simulation.path}`)}
        />
      ))}
    </div>
  );
}
