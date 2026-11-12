import type { NextConfig } from 'next';
import withFlowbiteReact from "flowbite-react/plugin/nextjs";

const nextConfig: NextConfig = {
  /* config options here */
  reactStrictMode: true,
  // Mr. G lives in the bottom-right corner
  devIndicators: { position: 'bottom-left' },
};

export default withFlowbiteReact(nextConfig);