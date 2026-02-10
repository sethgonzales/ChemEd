import { Suspense } from 'react';
import { ThemeProvider } from '~/styles/theme-provider';
import '~/styles/globals.css';

import Header from '~/components/header';
import Loading from '~/components/loading';

import type { AppProps } from 'next/app';

export default function App({ Component, pageProps }: AppProps) {
  return (
    <ThemeProvider>
      <Suspense fallback={<Loading />}>
        <Header />
        <div className="p-6 sm:p-10 text-secondary-500">
          <Component {...pageProps} />
        </div>
      </Suspense>
    </ThemeProvider>
  );
}
