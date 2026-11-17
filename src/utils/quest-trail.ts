// The dungeon map's layout: the doors snake across the map in rows, left to
// right then back again, each row gently curved, with a trail joining them in
// order. x is in % across the map, y in rows down it.

const DOOR_ROOM = 175; // px of map width each door needs
const MIN_COLUMNS = 2;
const MAX_COLUMNS = 4;
const CURVE = 0.11; // rows: how far a row bows between its middle and ends
const SWING = 0.3; // columns: how far the trail swings out to turn a row
const BEND = 0.25; // how much a stretch along a row bends, 0 straight to 1 an S

export interface MapStop {
  row: number;
  col: number;
  x: number; // % across
  y: number; // rows down, to the door's middle
}

/** How many doors fit in a row on a map this wide (px) */
export const columnsFor = (width: number) =>
  Math.min(MAX_COLUMNS, Math.max(MIN_COLUMNS, Math.floor(width / DOOR_ROOM)));

const round = (n: number) => Math.round(n * 1000) / 1000;

/** Where each of n stops sits on a map cols doors wide */
export function mapLayout(n: number, cols: number) {
  const stops: MapStop[] = Array.from({ length: n }, (_, i) => {
    const row = Math.floor(i / cols);
    const along = i % cols;
    const col = row % 2 ? cols - 1 - along : along; // back the other way
    // each row bows, down in the middle on one, up on the next
    const bow = Math.sin((Math.PI * (col + 0.5)) / cols) - 0.5;
    return {
      row,
      col,
      x: round(((col + 0.5) / cols) * 100),
      y: round(row + 0.5 + CURVE * bow * (row % 2 ? -1 : 1)),
    };
  });
  return { stops, rows: Math.ceil(n / cols) };
}

/** An SVG path for the trail from one stop to the next */
export function trailPath(a: MapStop, b: MapStop, cols: number) {
  if (a.row === b.row) {
    // control points a third and two thirds along, eased level a little
    const at = (k: number, level: number) => ({
      x: round(a.x + (b.x - a.x) * k),
      y: round(a.y + (b.y - a.y) * (k + (level - k) * BEND)),
    });
    const c1 = at(1 / 3, 0);
    const c2 = at(2 / 3, 1);
    return `M ${a.x} ${a.y} C ${c1.x} ${c1.y} ${c2.x} ${c2.y} ${b.x} ${b.y}`;
  }
  // turning down into the next row: swing out past the edge door and back
  const out = round((a.col === cols - 1 ? 1 : -1) * (100 / cols) * SWING);
  return `M ${a.x} ${a.y} C ${round(a.x + out)} ${a.y} ${round(b.x + out)} ${b.y} ${b.x} ${b.y}`;
}
