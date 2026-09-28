import type { Metadata, Viewport } from 'next'
import '@fontsource/anton/latin-400.css'
import '@fontsource/jetbrains-mono/latin-400.css'
import '@fontsource/jetbrains-mono/latin-500.css'
import '@fontsource/jetbrains-mono/latin-700.css'
import './globals.css'

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
  themeColor: '#0E0F12',
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
    <html lang="en" className="bg-ink">
      <body className="bg-ink text-bone font-mono antialiased">{children}</body>
    </html>
  )
}
