import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Masa Tomato',
    short_name: 'Masa Tomato',
    description: 'Focus timer and shared life dashboard',
    start_url: '/',
    display: 'standalone',
    background_color: '#FDF8F3',
    theme_color: '#FDF8F3',
    orientation: 'portrait',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
      {
        src: '/icon-maskable-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}
