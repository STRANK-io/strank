import '@/styles/globals.css'
import Providers from '@/components/providers'
import { pretendardFont } from '@/lib/fonts'
import { Metadata } from 'next'
import { Toaster } from 'sonner'

// TODO: 메타데이터에 필요한 데이터 요청
export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),
  title: {
    template: 'Strank',
    default: 'Strank',
  },
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
        <Providers>{children}</Providers>

        <Toaster toastOptions={{ unstyled: true }} duration={2000} />
      </body>
    </html>
  )
}
