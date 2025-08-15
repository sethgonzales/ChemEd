import { ThemeSelect } from '~/components/ui/theme-select';

export default function Header() {
  return (
    <header className="flex justify-between py-4 px-6 bg-primary-500 text-secondary-500">
      <h1 className="text-3xl font-bold">ChemEd</h1>
      <ThemeSelect />
    </header>
  );
}
