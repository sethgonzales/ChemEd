import '~/styles/globals.css';
import type { AppProps } from 'next/app';
import { ThemeProvider, useTheme } from '~/styles/theme-provider';
import { IconLoader } from '@tabler/icons-react';

type ThemedAppProps = {
  Component: AppProps['Component'];
  pageProps: AppProps['pageProps'];
};

function ThemedApp({ Component, pageProps }: ThemedAppProps) {
  const { themeIsReady } = useTheme();

  if (!themeIsReady) {
    return (
      <div className="flex items-center justify-center h-screen">
        <IconLoader size={40} className="animate-spin" />
      </div>
    );
  }

  return <Component {...pageProps} />;
}

export default function App({ Component, pageProps }: AppProps) {
  return (
    <ThemeProvider>
      <ThemedApp Component={Component} pageProps={pageProps} />
    </ThemeProvider>
  );
}
