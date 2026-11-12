import { Suspense } from 'react';
import { GuideProvider } from '~/components/guide';
import { ThemeProvider } from '~/styles/theme-provider';
import '~/styles/globals.css';

import Header from '~/components/header';
import Loading from '~/components/loading';

import type { AppProps } from 'next/app';

export default function App({ Component, pageProps, router }: AppProps) {
  return (
    <ThemeProvider>
      <GuideProvider page={router.pathname}>
        <Suspense fallback={<Loading />}>
          <Header />
          {/* on desktop, room at the bottom so pages can scroll clear of Mr. G */}
          <div className="p-6 sm:p-10 md:pb-36 text-secondary-500">
            <Component {...pageProps} />
          </div>
        </Suspense>
      </GuideProvider>
    </ThemeProvider>
  );
}
