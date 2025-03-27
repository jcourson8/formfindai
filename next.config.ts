import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  experimental: {
    ppr: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
        port: '',
        pathname: '**',
      },
    ],
    domains: ['cdn.formfind.vercel.app', 'formfind-images.vercel.app'],
  },
  async redirects() {
    return [
      {
        source: '/design',
        destination: '/chat',
        permanent: false,
      },
    ];
  },
  env: {
    APP_NAME: 'FormFind',
    APP_DESCRIPTION: 'AI-powered furniture design platform',
  }
};

export default nextConfig;
