interface Props {
  title: string;
  img?: string;
}

export default function Card({ item }: { item: Props }) {
  const { title, img } = item;
  return (
    <div className="flex flex-col overflow-hidden text-center px-6 py-4 bg-primary-500 text-secondary-500 rounded-xl hover:bg-primary-300 hover:text-text-primary cursor-pointer transform hover:scale-105 transition-transform duration-200">
      <h1 className="text-lg sm:text-2xl font-bold">{title}</h1>
    </div>
  );
}
