import Image from 'next/image'

export default function CompatibleWithStravaImage() {
  return (
    <Image
      src="/images/with-strava-logo.png"
      alt="compatible with strava image"
      width={130}
      height={56}
      className="object-contain"
      priority
    />
  )
}
