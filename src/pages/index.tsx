import { ThemeSelect } from '~/components/ui/theme-select';

export default function Home() {
  return (
    <div className="min-h-screen p-6 bg-primary-400 text-secondary-500 space-y-4">
      <div className="flex justify-between">
        <h1 className="text-3xl font-bold">Themed UI</h1>
        <ThemeSelect />
      </div>

      <div className="bg-primary-500 text-text-primary p-4 rounded">
        Primary section
      </div>

      <div className="bg-secondary-400 text-text-secondary p-4 rounded">
        Secondary section
      </div>
    </div>
  );
}
