import StrankDefaultLogo from '@/components/common/logos/StrankDefaultLogo'
import StrankTitleLogo from '@/components/common/logos/StrankTitleLogo'

export default function PrivatePageHeader() {
  return (
    <header className="flex items-center gap-[9.5px] px-5">
      <div className="h-[40px] w-[54.5px]">
        <StrankDefaultLogo className="h-full w-full" />
      </div>
      <StrankTitleLogo width={85} height={16} />
    </header>
  )
}
