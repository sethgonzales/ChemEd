import { useEffect, useState } from 'react';

// globals.css swaps the pixel font for a plain one under html[data-font="readable"]
export const FONT_STORAGE_KEY = 'chem.readableFont';

/** Whether the student chose the plain font in this browser */
export function isReadableFont() {
  try {
    return localStorage.getItem(FONT_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

/** Switches the whole page between the pixel and plain fonts, and saves it */
export function applyReadableFont(on: boolean) {
  const html = document.documentElement;
  if (on) html.dataset.font = 'readable';
  else delete html.dataset.font;
  try {
    localStorage.setItem(FONT_STORAGE_KEY, String(on));
  } catch {
    // storage can be blocked; the choice just won't be remembered
  }
}

/** A script for <head> that puts the saved font back before the first paint */
export function fontScript() {
  return `(function(){try{if(localStorage.getItem(${JSON.stringify(FONT_STORAGE_KEY)})==='true')document.documentElement.dataset.font='readable'}catch(e){}})()`;
}

/** The readable-font switch: [readable, toggle] */
export function useReadableFont() {
  const [readable, setReadable] = useState(false);
  // read after mount, so the server render and first client render match
  useEffect(() => setReadable(isReadableFont()), []);
  const toggle = () => {
    applyReadableFont(!readable);
    setReadable(!readable);
  };
  return [readable, toggle] as const;
}
