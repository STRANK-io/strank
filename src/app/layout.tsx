import '@/styles/globals.css'
import Providers from '@/components/providers'
import { pretendardFont } from '@/lib/fonts'
import { Metadata } from 'next'
import { Toaster } from '@/components/ui/toaster'

const defaultUrl = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : 'http://localhost:3000'

// TODO: 메타데이터에 필요한 데이터 요청
export const metadata: Metadata = {
  metadataBase: new URL(defaultUrl),
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
      <body className="bg-background text-foreground">
        <main className="mx-auto min-h-screen w-full max-w-[393px] pt-11">
          <Providers>{children}</Providers>
        </main>
        <Toaster />
      </body>
    </html>
  )
}
