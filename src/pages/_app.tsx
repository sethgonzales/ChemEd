import { Suspense } from 'react';
import '~/styles/globals.css';
import { ThemeProvider } from '~/styles/theme-provider';
import Loading from '~/components/ui/loading';
import type { AppProps } from 'next/app';
import Header from '~/components/ui/header';

export default function App({ Component, pageProps }: AppProps) {
  return (
    <ThemeProvider>
      <Suspense fallback={<Loading />}>
        <Header />
        <Component {...pageProps} />
      </Suspense>
    </ThemeProvider>
  );
}
