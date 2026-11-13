import Link from 'next/link';
import Container from '~/components/container';

/** Sealed on the home page until its reaction-type activities are built */
export default function ChemicalReactions() {
  return (
    <Container
      backHref="/"
      header="Chemical Reactions"
      description="Coming soon: sort and predict the types of reactions."
      className="gap-4"
    >
      <p>
        Looking for balancing equations? It has its own room now:{' '}
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
