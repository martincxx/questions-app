/** @type {import('next').NextConfig} */
import withSerwist from '@serwist/next';

const withPwa = withSerwist({
  swSrc: 'app/sw.js',
  swDest: 'public/sw.js',
  disable: process.env.NODE_ENV === 'development',
});

const nextConfig = {
  reactStrictMode: true,
};

export default withPwa(nextConfig);
