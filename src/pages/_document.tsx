import { Html, Head, Main, NextScript } from 'next/document';
import { fontScript } from '~/utils/font';
import { themeScript } from '~/utils/theme';

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        {/* sets the theme's colours before the first paint, so a refresh
            doesn't flash white while React loads */}
        <script dangerouslySetInnerHTML={{ __html: themeScript() }} />
        {/* and the readable font, if chosen, so the pixel font doesn't flash */}
        <script dangerouslySetInnerHTML={{ __html: fontScript() }} />
      </Head>
      <body className="antialiased">
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
