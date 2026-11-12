import {
  Fragment,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { IconX } from '@tabler/icons-react';
import MrG from '~/components/mr-g';
import { PALETTE, type Frame } from '~/constants/mr-g-sprite';
import {
  UNPROMPTED_GAP_MS,
  WELCOME_DELAY_MS,
  bubbleDuration,
  nextWanderX,
  tipsFor,
  withGreeting,
} from '~/utils/guide';
import { useEscape } from '~/utils/use-escape';
import { useMedia } from '~/utils/use-media';
import { useTreasureSound } from '~/utils/sounds';

export type Mood = 'tip' | 'hint' | 'cheer' | 'nudge';

type Message = { text: string; mood: Mood; id: number };

// unprompted: he speaks up without the student asking or acting, so it's rationed
type SayOptions = { unprompted?: boolean };

type Guide = {
  say: (text: string, mood?: Mood, options?: SayOptions) => void;
  visible: boolean; // on screen (desktop, not hidden), so pages can lean on him
};

// Without a provider (tests), asking Mr. G to speak does nothing
const GuideContext = createContext<Guide>({ say: () => {}, visible: false });

/** Lets any page ask Mr. G to say something */
export const useGuide = () => useContext(GuideContext);

const HIDDEN_KEY = 'chem.guide.hidden';
// per browser tab: he introduces himself once and welcomes you to each page once
const GREETED_KEY = 'chem.guide.greeted';
const WELCOMED_KEY = 'chem.guide.welcomed';

const TICK_MS = 250; // animation step
const BLINK_EVERY_TICKS = 16; // a blink every 4 s
const WANDER_MIN_MS = 20000;
const WANDER_MAX_MS = 40000;
const WALK_MS = 2000; // how long a stroll takes

function readHidden() {
  try {
    return localStorage.getItem(HIDDEN_KEY) === 'true';
  } catch {
    return false;
  }
}

function readSession(key: string) {
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeSession(key: string, value: string) {
  try {
    sessionStorage.setItem(key, value);
  } catch {
    // storage can be blocked; he may just repeat himself
  }
}

function readWelcomed(): string[] {
  try {
    return JSON.parse(readSession(WELCOMED_KEY) ?? '[]');
  } catch {
    return [];
  }
}

const OUTLINE = PALETTE.K;
const PIXEL = 4; // px per bubble pixel

// The bubble's frame as pixel art: rounded corners, and edges the border
// stretches to fit (a nine-slice). K is outline, W is the white inside.
const FRAME = [
  '...KKK...',
  '.KKWWWKK.',
  '.KWWWWWK.',
  'KWWWWWWWK',
  'KWWWWWWWK',
  'KWWWWWWWK',
  '.KWWWWWK.',
  '.KKWWWKK.',
  '...KKK...',
];
const CORNER = 4; // frame pixels in each corner slice
const frameSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="9" height="9" shape-rendering="crispEdges">${FRAME.flatMap(
  (row, y) =>
    [...row].map((p, x) =>
      p === '.'
        ? ''
        : `<rect x="${x}" y="${y}" width="1" height="1" fill="${p === 'K' ? OUTLINE : 'white'}"/>`,
    ),
).join('')}</svg>`;
const FRAME_STYLE = {
  borderStyle: 'solid',
  borderWidth: CORNER * PIXEL,
  borderImage: `url("data:image/svg+xml,${encodeURIComponent(frameSvg)}") ${CORNER} fill / ${CORNER * PIXEL}px stretch`,
};

function SpeechBubble({
  text,
  onClose,
}: {
  text: string;
  onClose: () => void;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      // floats above him, so opening it never moves him
      // the frame's border doubles as padding
      className="absolute bottom-full right-0 mb-4 w-64 text-sm leading-snug text-gray-900"
      style={FRAME_STYLE}
    >
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-semibold text-gray-400">Mr. G:</span>
        <button
          type="button"
          aria-label="Close message"
          onClick={onClose}
          className="rounded p-0.5 text-gray-500 hover:bg-gray-100 cursor-pointer"
        >
          <IconX size={14} aria-hidden="true" />
        </button>
      </div>
      <p>{text}</p>
      {/* pixel tail pointing down at Mr. G; its top row covers the bottom outline */}
      <svg
        aria-hidden="true"
        width={28}
        height={16}
        viewBox="0 0 7 4"
        shapeRendering="crispEdges"
        className="absolute right-4"
        style={{ top: `calc(100% + ${CORNER * PIXEL - PIXEL}px)` }}
      >
        {/* each row: an outline pixel either side of a narrowing white run */}
        {[0, 1, 2, 3].map((y) => (
          <Fragment key={y}>
            <rect x={y} y={y} width={7 - 2 * y} height={1} fill={OUTLINE} />
            {y < 3 && (
              <rect x={y + 1} y={y} width={5 - 2 * y} height={1} fill="white" />
            )}
          </Fragment>
        ))}
      </svg>
    </div>
  );
}

/** Mr. G in the bottom-right corner: desktop only, wandering, talking */
function Corner({
  page,
  message,
  say,
  close,
  desktop,
  hidden,
  hide,
}: {
  page?: string;
  message: Message | null;
  say: Guide['say'];
  close: () => void;
  desktop: boolean;
  hidden: boolean;
  hide: (hidden: boolean) => void;
}) {
  const reducedMotion = useMedia('(prefers-reduced-motion: reduce)');
  const [frame, setFrame] = useState<Frame>('idle');
  const [x, setX] = useState(0);
  const [facingLeft, setFacingLeft] = useState(false);
  const xNow = useRef(0);
  const walking = useRef(false);
  const talking = useRef(false);
  useEffect(() => {
    talking.current = !!message;
  }, [message]);

  const active = desktop && !hidden;

  const nextTip = useRef<Record<string, number>>({});
  const speak = useCallback(
    (text: string) => {
      say(withGreeting(text, readSession(GREETED_KEY) === 'true'));
      writeSession(GREETED_KEY, 'true');
    },
    [say],
  );
  // clicking him cycles through the page's tips
  const tip = () => {
    const key = page ?? '';
    const tips = tipsFor(key);
    const n = nextTip.current[key] ?? 0;
    nextTip.current[key] = n + 1;
    speak(tips[n % tips.length]);
  };

  // the first visit to each page gets its first tip
  useEffect(() => {
    if (!active || !page) return;
    const welcomed = readWelcomed();
    if (welcomed.includes(page)) return;
    const timer = setTimeout(() => {
      writeSession(WELCOMED_KEY, JSON.stringify([...welcomed, page]));
      nextTip.current[page] = 1;
      speak(tipsFor(page)[0]);
    }, WELCOME_DELAY_MS);
    return () => clearTimeout(timer);
  }, [active, page, speak]);

  // close the bubble on its own after a while, or with Escape
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(close, bubbleDuration(message.text));
    return () => clearTimeout(timer);
  }, [message, close]);
  useEscape(close, !!message);

  // animation: walk while strolling, talk while speaking, otherwise blink now and then
  useEffect(() => {
    if (!active) return;
    let tick = 0;
    const timer = setInterval(() => {
      tick += 1;
      if (walking.current) setFrame(tick % 2 ? 'walk1' : 'walk2');
      else if (talking.current) setFrame(tick % 2 ? 'talk' : 'idle');
      else setFrame(tick % BLINK_EVERY_TICKS === 0 ? 'blink' : 'idle');
    }, TICK_MS);
    return () => clearInterval(timer);
  }, [active]);

  // a short stroll every so often, unless motion is reduced or he's talking
  useEffect(() => {
    if (!active || reducedMotion) return;
    let timer: ReturnType<typeof setTimeout>;
    const schedule = () => {
      const wait =
        WANDER_MIN_MS + Math.random() * (WANDER_MAX_MS - WANDER_MIN_MS);
      timer = setTimeout(() => {
        if (!talking.current) {
          const next = nextWanderX(xNow.current);
          // he walks leftward out of the corner as x grows
          setFacingLeft(next > xNow.current);
          xNow.current = next;
          setX(next);
          walking.current = true;
          timer = setTimeout(() => {
            walking.current = false;
            schedule();
          }, WALK_MS);
        } else {
          schedule();
        }
      }, wait);
    };
    schedule();
    return () => clearTimeout(timer);
  }, [active, reducedMotion]);

  if (!desktop) return null;

  if (hidden) {
    return (
      <button
        type="button"
        onClick={() => hide(false)}
        className="fixed bottom-4 right-4 z-40 rounded-full bg-primary-700 px-3 py-1 text-xs font-semibold text-white shadow-lg hover:bg-primary-800 cursor-pointer"
      >
        Show Mr. G
      </button>
    );
  }

  return (
    <div className="fixed bottom-2 right-4 z-40 flex flex-col items-end pointer-events-none">
      <div
        data-testid="mr-g-walker"
        className="relative pointer-events-auto motion-safe:transition-transform motion-safe:duration-[2000ms] motion-safe:ease-linear"
        style={{ transform: `translateX(${-x}px)` }}
      >
        {message && <SpeechBubble text={message.text} onClose={close} />}
        <div className="group relative w-fit">
          <button
            type="button"
            aria-label="Mr. G: click for a tip"
            onClick={tip}
            className="block cursor-pointer rounded-md focus-visible:outline-2 focus-visible:outline-white"
          >
            <MrG
              frame={frame}
              className={facingLeft ? '-scale-x-100' : undefined}
            />
          </button>
          <button
            type="button"
            aria-label="Hide Mr. G"
            onClick={() => hide(true)}
            className="absolute -top-1 -left-3 rounded-full bg-primary-700 p-0.5 text-white opacity-0 shadow group-hover:opacity-100 focus-visible:opacity-100 cursor-pointer"
          >
            <IconX size={12} aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
}

/** Puts Mr. G on every page and lets pages ask him to speak */
export function GuideProvider({
  page,
  children,
}: {
  page?: string;
  children: ReactNode;
}) {
  const [message, setMessage] = useState<Message | null>(null);
  const desktop = useMedia('(min-width: 768px)');
  const [hidden, setHidden] = useState(false);
  useEffect(() => setHidden(readHidden()), []);
  const hide = (value: boolean) => {
    setHidden(value);
    try {
      localStorage.setItem(HIDDEN_KEY, String(value));
    } catch {
      // storage can be blocked; he just won't stay hidden next visit
    }
  };

  const playTreasure = useTreasureSound();
  const lastUnprompted = useRef<number | null>(null);
  const say = useCallback(
    (text: string, mood: Mood = 'tip', { unprompted }: SayOptions = {}) => {
      if (unprompted) {
        const now = Date.now();
        const last = lastUnprompted.current;
        if (last !== null && now - last < UNPROMPTED_GAP_MS) return;
        lastUnprompted.current = now;
      }
      // successes ring out even on phones, where he isn't on screen
      if (mood === 'cheer') playTreasure();
      setMessage({ text, mood, id: Date.now() });
    },
    [playTreasure],
  );
  const close = useCallback(() => setMessage(null), []);

  return (
    <GuideContext.Provider value={{ say, visible: desktop && !hidden }}>
      {children}
      <Corner
        page={page}
        message={message}
        say={say}
        close={close}
        desktop={desktop}
        hidden={hidden}
        hide={hide}
      />
    </GuideContext.Provider>
  );
}
