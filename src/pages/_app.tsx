import { Suspense } from 'react';
import localFont from 'next/font/local';
import ClickSounds from '~/components/click-sounds';
import { GuideProvider } from '~/components/guide';
import { ThemeProvider } from '~/styles/theme-provider';
import '~/styles/globals.css';

import Header from '~/components/header';
import Loading from '~/components/loading';

import type { AppProps } from 'next/app';

// the 8-bit font for headings and buttons: our copy of Pixelify Sans, with a
// 5 that isn't drawn like an S (see src/fonts/README.md)
const pixel = localFont({
  // written out: next/font only reads literal values
  src: [
    { path: '../fonts/pixelify-sans-400.woff', weight: '400' },
    { path: '../fonts/pixelify-sans-500.woff', weight: '500' },
    { path: '../fonts/pixelify-sans-600.woff', weight: '600' },
    { path: '../fonts/pixelify-sans-700.woff', weight: '700' },
  ],
  variable: '--font-pixelify',
});

export default function App({ Component, pageProps, router }: AppProps) {
  return (
    <ThemeProvider>
      {/* every button and checkbox clicks the same quiet click */}
      <ClickSounds />
      <div className={pixel.variable}>
        <GuideProvider page={router.pathname}>
          <Suspense fallback={<Loading />}>
            <Header page={router.pathname} />
            {/* on desktop, room at the bottom so pages can scroll clear of Mr. G */}
            <div className="p-6 sm:p-10 md:pb-36 text-secondary-500">
              <Component {...pageProps} />
            </div>
          </Suspense>
        </GuideProvider>
      </div>
    </ThemeProvider>
  );
}
