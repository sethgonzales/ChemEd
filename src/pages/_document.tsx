import { Html, Head, Main, NextScript } from 'next/document';
import { themeScript } from '~/utils/theme';

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        {/* sets the theme's colours before the first paint, so a refresh
            doesn't flash white while React loads */}
        <script dangerouslySetInnerHTML={{ __html: themeScript() }} />
      </Head>
      <body className="antialiased">
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
