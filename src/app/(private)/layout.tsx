import PrivatePageHeader from '@/components/common/PrivatePageHeader'
import PrivatePageNav from '@/components/common/PrivatePageNav'

export default async function Layout({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-[#FFF9FA]">
      <div className="mx-auto min-h-screen w-full max-w-[393px] pt-11">
        <PrivatePageHeader />
        {children}
        <div className="fixed bottom-3 left-1/2 -translate-x-1/2">
          <PrivatePageNav />
        </div>
      </div>
    </main>
  )
}
