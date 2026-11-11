import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent,
} from 'react';

// Pointer travel (px) before a press counts as a drag rather than a tap
const DRAG_THRESHOLD = 6;

export type DragPoint = { clientX: number; clientY: number };

/**
 * Tracks a drag with pointer events, so mouse, pen and touch all work.
 * `start` begins one from a pointerdown; `onDrop` gets where it ended. After a
 * drag, `consumeClick` swallows the click the browser fires on release, so a
 * drop isn't also treated as a tap.
 */
export function usePointerDrag<T>(onDrop: (payload: T, at: DragPoint) => void) {
  const [drag, setDrag] = useState<{ payload: T; at: DragPoint } | null>(null);
  const dragged = useRef(false);
  // always call the latest onDrop, without restarting a drag in progress
  const onDropRef = useRef(onDrop);
  useEffect(() => {
    onDropRef.current = onDrop;
  });

  const start = useCallback((payload: T, e: PointerEvent) => {
    if (e.button !== 0) return;
    const origin = { x: e.clientX, y: e.clientY };
    let moving = false;
    dragged.current = false;

    const move = (ev: globalThis.PointerEvent) => {
      const at = { clientX: ev.clientX, clientY: ev.clientY };
      if (
        !moving &&
        Math.hypot(at.clientX - origin.x, at.clientY - origin.y) <
          DRAG_THRESHOLD
      ) {
        return;
      }
      moving = true;
      setDrag({ payload, at });
    };

    const end = (ev: globalThis.PointerEvent) => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', end);
      window.removeEventListener('pointercancel', cancel);
      setDrag(null);
      if (moving) {
        // swallow only the click fired by this release; if the drop landed
        // elsewhere no click comes, and the next tap must still work
        dragged.current = true;
        setTimeout(() => {
          dragged.current = false;
        });
        onDropRef.current(payload, {
          clientX: ev.clientX,
          clientY: ev.clientY,
        });
      }
    };

    const cancel = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', end);
      window.removeEventListener('pointercancel', cancel);
      setDrag(null);
    };

    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', end);
    window.addEventListener('pointercancel', cancel);
  }, []);

  const consumeClick = useCallback(() => {
    const was = dragged.current;
    dragged.current = false;
    return was;
  }, []);

  return { drag, start, consumeClick };
}
