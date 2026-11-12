import type { NextConfig } from 'next';
import withFlowbiteReact from "flowbite-react/plugin/nextjs";

const nextConfig: NextConfig = {
  /* config options here */
  reactStrictMode: true,
  // plain HTML, CSS and JS in out/, served by Firebase Hosting (no server)
  output: 'export',
  // Mr. G lives in the bottom-right corner
  devIndicators: { position: 'bottom-left' },
};

export default withFlowbiteReact(nextConfig);