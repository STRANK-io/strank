import SyncIcon from '@/components/common/icons/SyncIcon'
import StrankDefaultLogo from '@/components/common/logos/StrankDefaultLogo'
import StravaLogo from '@/components/common/logos/StravaLogo'

export default function LogoSection() {
  return (
    <div className="mb-[80px] flex w-full items-center justify-center gap-4 px-5 py-5">
      <div className="flex h-[120px] w-[120px] items-center justify-center">
        <StrankDefaultLogo />
      </div>
      <SyncIcon />
      <StravaLogo />
    </div>
  )
}
