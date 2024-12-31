import Image from 'next/image'

export default function StravaImage() {
  return (
    <div className="my-11 flex flex-col items-center justify-center">
      <Image
        src="/images/strava-origin.png"
        alt="스트라바 로고"
        width={109}
        height={80}
        className="h-[80px] w-[109px]"
      />
    </div>
  )
}
