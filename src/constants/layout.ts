// A page whose Container is a two-column grid on desktop (title, tabs and
// picker on the left): this puts an item in the right column, from the top
// of the card down beside the title and tabs.
export const BESIDE_HEADER =
  'lg:col-start-2 lg:row-start-1 lg:row-span-3 min-w-0';

// The Container's classes for that grid; on phones it stays one column. The
// last row takes any extra height, so a tall right column doesn't spread out
// the title, tabs and picker.
export const SPLIT_CARD =
  'gap-4 lg:grid lg:grid-cols-2 lg:grid-rows-[auto_auto_1fr] lg:gap-x-6 lg:items-start';

// Tab panels join the card's grid on desktop, so their parts can sit in
// either column; on phones they stack
export const SPLIT_PANEL = 'flex flex-col gap-4 lg:contents';
