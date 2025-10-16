interface Props {
  title: string;
  img?: string;
  onClick: () => void;
}

export default function Card(props: Props) {
  const { title, img, onClick } = props;
  return (
    <button
      className="flex flex-col overflow-hidden text-center px-6 py-4 h-78 bg-primary-500 text-secondary-500 rounded-xl hover:bg-primary-300 hover:text-text-primary cursor-pointer transform hover:scale-105 transition-transform duration-200"
      onClick={onClick}
    >
      <h1 className="text-lg sm:text-2xl font-bold">{title}</h1>
    </button>
  );
}
