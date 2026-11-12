import { Suspense } from 'react';
import { Pixelify_Sans } from 'next/font/google';
import { GuideProvider } from '~/components/guide';
import { ThemeProvider } from '~/styles/theme-provider';
import '~/styles/globals.css';

import Header from '~/components/header';
import Loading from '~/components/loading';

import type { AppProps } from 'next/app';

// the 8-bit font for headings and buttons; served by the app, not Google
const pixel = Pixelify_Sans({
  subsets: ['latin'],
  variable: '--font-pixelify',
});

export default function App({ Component, pageProps, router }: AppProps) {
  return (
    <ThemeProvider>
      <div className={pixel.variable}>
        <GuideProvider page={router.pathname}>
          <Suspense fallback={<Loading />}>
            <Header />
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
