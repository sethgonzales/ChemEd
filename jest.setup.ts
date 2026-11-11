import '@testing-library/jest-dom';

// jsdom has no PointerEvent; without it pointer events lose clientX/clientY
if (typeof window !== 'undefined' && !window.PointerEvent) {
  class PointerEvent extends MouseEvent {
    pointerId: number;
    constructor(type: string, init: PointerEventInit = {}) {
      super(type, init);
      this.pointerId = init.pointerId ?? 1;
    }
  }
  window.PointerEvent = PointerEvent as unknown as typeof window.PointerEvent;
}
