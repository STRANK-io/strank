import '@/styles/globals.css'
import Providers from '@/components/providers'
import { pretendardFont } from '@/lib/fonts'
import { Metadata } from 'next'
import { Toaster } from 'sonner'
import { GoogleTagManager } from '@next/third-parties/google'
import type { Viewport } from 'next'

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://strank.io'),
  title: {
    template: 'Strank',
    default: 'Strank',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ko" className={`${pretendardFont.variable} font-sans`} suppressHydrationWarning>
      <body suppressHydrationWarning>
        {/* TODO: 393px screen 스타일 적용해서 싹 바꾸기 */}
        {process.env.NODE_ENV === 'production' && process.env.NEXT_PUBLIC_GA_ID && (
          <GoogleTagManager gtmId={process.env.NEXT_PUBLIC_GA_ID} />
        )}
        <Providers>{children}</Providers>
        <Toaster toastOptions={{ unstyled: true }} duration={2000} />
      </body>
    </html>
  )
}
