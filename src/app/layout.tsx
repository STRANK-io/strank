import '@/styles/globals.css'
import Providers from '@/components/providers'
import { pretendardFont } from '@/lib/fonts'
import { Metadata } from 'next'
import { Toaster } from 'sonner'
import { GoogleAnalytics } from '@next/third-parties/google'
import { Viewport } from 'next'
import { InAppBrowserHandler } from '@/components/common/InAppBrowserHandler'

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://strank.io'),
  title: {
    template: 'STRANK',
    default: 'STRANK',
  },
  description:
    '지역별 랭킹으로 더 가까워진 라이딩 커뮤니티 / 자전거 기록도, 랭킹도 이제 하이퍼 로컬하게',
  other: {
    'format-detection': 'telephone=no, email=no',
    'naver-site-verification': '7a826a257d5221d1d1c4cd52c8e2b252a37dbc2e',
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
      <body suppressHydrationWarning className="bg-gray-100">
        {process.env.NODE_ENV === 'production' && process.env.NEXT_PUBLIC_GTM_ID && (
          <GoogleAnalytics gaId={process.env.NEXT_PUBLIC_GTM_ID} />
        )}

        <InAppBrowserHandler />
        <Providers>{children}</Providers>
        <Toaster toastOptions={{ unstyled: true }} duration={2000} />
      </body>
    </html>
  )
}
