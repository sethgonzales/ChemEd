// Paints pixel art in palette letters, for sprites drawn from shapes rather
// than typed out row by row (the villains, which move every frame). Anything
// painted gets a dark outline round it unless it asks not to.

const OUTLINE = 'K';

type Cell = { key: string; outline: boolean };

export class Painter {
  private cells: (Cell | undefined)[];

  constructor(
    readonly width: number,
    readonly height: number,
  ) {
    this.cells = Array(width * height);
  }

  set(x: number, y: number, key: string, outline = true) {
    x = Math.round(x);
    y = Math.round(y);
    if (x < 0 || y < 0 || x >= this.width || y >= this.height) return;
    this.cells[y * this.width + x] = { key, outline };
  }

  rect(
    x: number,
    y: number,
    w: number,
    h: number,
    key: string,
    outline = true,
  ) {
    for (let j = 0; j < h; j++)
      for (let i = 0; i < w; i++) this.set(x + i, y + j, key, outline);
  }

  /** Every pixel whose centre is inside the ellipse */
  ellipse(
    cx: number,
    cy: number,
    rx: number,
    ry: number,
    key: string,
    outline = true,
  ) {
    for (let y = Math.floor(cy - ry - 1); y <= cy + ry + 1; y++)
      for (let x = Math.floor(cx - rx - 1); x <= cx + rx + 1; x++) {
        const dx = (x + 0.5 - cx) / rx;
        const dy = (y + 0.5 - cy) / ry;
        if (dx * dx + dy * dy <= 1) this.set(x, y, key, outline);
      }
  }

  line(
    x0: number,
    y0: number,
    x1: number,
    y1: number,
    key: string,
    outline = true,
  ) {
    const steps = Math.max(
      1,
      Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0))),
    );
    for (let i = 0; i <= steps; i++)
      this.set(
        x0 + ((x1 - x0) * i) / steps,
        y0 + ((y1 - y0) * i) / steps,
        key,
        outline,
      );
  }

  /** The picture as rows of palette letters; '.' is see-through */
  rows(): string[] {
    const { width, height, cells } = this;
    const outlined = (x: number, y: number) =>
      x >= 0 && y >= 0 && x < width && y < height
        ? !!cells[y * width + x]?.outline
        : false;
    return Array.from({ length: height }, (_, y) =>
      Array.from({ length: width }, (_, x) => {
        const cell = cells[y * width + x];
        if (cell) return cell.key;
        const edge =
          outlined(x - 1, y) ||
          outlined(x + 1, y) ||
          outlined(x, y - 1) ||
          outlined(x, y + 1);
        return edge ? OUTLINE : '.';
      }).join(''),
    );
  }
}
