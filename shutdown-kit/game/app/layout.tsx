import type { Metadata, Viewport } from 'next'
import localFont from 'next/font/local'
import './globals.css'

// V4 type (section 2): Bebas Neue display, Share Tech Mono instrument/labels. Local OFL files, no network.
const bebas = localFont({
  src: './fonts/BebasNeue-Regular.ttf',
  weight: '400',
  display: 'swap',
  variable: '--font-bebas',
})
const shareTech = localFont({
  src: './fonts/ShareTechMono-Regular.ttf',
  weight: '400',
  display: 'swap',
  variable: '--font-share-tech',
})

export const metadata: Metadata = {
  title: 'SHUTDOWN — Facility 07',
  description:
    'The building is hunting you. And it can hear you. A landscape stealth-horror game where the facility itself is the killer.',
  applicationName: 'SHUTDOWN',
  appleWebApp: { capable: true, title: 'SHUTDOWN', statusBarStyle: 'black-translucent' },
  icons: {
    icon: [{ url: '/icon.svg', type: 'image/svg+xml' }],
    apple: '/apple-icon.png',
  },
}

export const viewport: Viewport = {
  themeColor: '#142127',
  colorScheme: 'dark',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${bebas.variable} ${shareTech.variable} bg-ink`}>
      <body className="bg-ink text-bone font-mono antialiased">{children}</body>
    </html>
  )
}
