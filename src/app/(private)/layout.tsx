import PrivatePageNav from '@/components/common/PrivatePageNav'

export default async function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      {children}
      <div className="fixed bottom-3 left-1/2 -translate-x-1/2">
        <PrivatePageNav />
      </div>
    </div>
  )
}
