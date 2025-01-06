import ConnectWithStravaIcon from '@/components/common/icons/ConnectWithStravaIcon'
import Link from 'next/link'

export default function ConnectButton() {
  return (
    <div className="flex w-full justify-center px-5">
      <Link href="/register-user-info" scroll={true}>
        <button>
          <ConnectWithStravaIcon />
        </button>
      </Link>
    </div>
  )
}
