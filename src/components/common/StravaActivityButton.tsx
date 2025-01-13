import Image from 'next/image'

interface StravaActivityButtonProps {
  activityId: number
}

export default function StravaActivityButton({ activityId }: StravaActivityButtonProps) {
  const handleClickStravaLogo = () => {
    window.open(`https://www.strava.com/activities/${activityId}`, '_blank')
  }

  return (
    <Image
      src="/images/strava-logo.png"
      role="button"
      alt="Strank Logo"
      width={24}
      height={24}
      className="cursor-pointer object-contain"
      priority
      onClick={handleClickStravaLogo}
    />
  )
}
