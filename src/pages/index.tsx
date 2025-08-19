import Card from '~/components/ui/card';
import { SIMULATIONS } from '~/constants';

export default function Home() {
  const simulations = SIMULATIONS;
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-6 h-screen p-10 bg-primary-400 text-secondary-500 space-y-4">
      {simulations.map((simulation, index) => (
        <Card key={index} item={simulation} />
      ))}
    </div>
  );
}
