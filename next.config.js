/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Fix for OneDrive sync issues
  experimental: {
    // Disable some features that conflict with OneDrive
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
  // Disable file system caching for development (helps with OneDrive)
  onDemandEntries: {
    maxInactiveAge: 25 * 1000,
    pagesBufferLength: 2,
  },
}

module.exports = nextConfig

