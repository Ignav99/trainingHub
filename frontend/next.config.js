/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Optimizaciones para reducir uso de memoria en build
  swcMinify: true,
  output: 'standalone',

  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
      },
    ],
  },

  // Reducir uso de memoria en webpack
  webpack: (config, { isServer }) => {
    // Limitar paralelismo para reducir memoria
    config.parallelism = 1;
    return config;
  },

  async rewrites() {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;

    if (!apiUrl) {
      return [];
    }

    return [
      {
        source: '/api/v1/:path*',
        destination: `${apiUrl}/v1/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
