/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Fix for OneDrive sync issues
  experimental: {
    optimizePackageImports: ['lucide-react', 'recharts'],
    // Disable some features that conflict with OneDrive
    serverActions: {
      bodySizeLimit: '2mb',
    },
    // Prisma uses native binaries; bundling it breaks Vercel builds ("Failed to collect page data" / engine errors).
    serverComponentsExternalPackages: ['@prisma/client', 'prisma'],
  },
  // Disable file system caching for development (helps with OneDrive)
  onDemandEntries: {
    maxInactiveAge: 25 * 1000,
    pagesBufferLength: 2,
  },
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  images: {
    formats: ['image/avif', 'image/webp'],
  },
}

module.exports = nextConfig

