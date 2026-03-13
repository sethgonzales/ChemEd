import { useEffect, useState } from 'react';
import { useKnock } from '~/utils/use-knock';

interface Props {
  title: string;
  img?: string;
  onClick: () => void;
}

export default function Card(props: Props) {
  const { title, img, onClick } = props;
  const playKnock = useKnock();
  const [svgContent, setSvgContent] = useState<string>('');

  useEffect(() => {
    if (!img) return;
    fetch(img)
      .then((res) => res.text())
      .then((text) => setSvgContent(text));
  }, [img]);

  return (
    <button
      className="flex flex-col items-center overflow-hidden text-center px-6 py-4 h-78 bg-primary-500 text-secondary-500 rounded-xl hover:bg-primary-300 hover:text-text-primary cursor-pointer transform hover:scale-105 transition-transform duration-200"
      onClick={onClick}
      onMouseEnter={playKnock}
    >
      <h1 className="text-lg sm:text-2xl font-bold">{title}</h1>
      {svgContent && (
        <div
          className="mt-3 flex-1 min-h-0 w-full [&>svg]:w-full [&>svg]:h-full"
          dangerouslySetInnerHTML={{ __html: svgContent }}
        />
      )}
    </button>
  );
}
