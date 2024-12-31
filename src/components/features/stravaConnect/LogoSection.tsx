import Image from 'next/image'

export default function LogoSection() {
  return (
    <div className="mb-[149px] flex w-full justify-center gap-8 px-5 py-5">
      <div className="flex h-[120px] w-[120px] items-center justify-center">
        <Image
          src="/images/strank-logo.png"
          alt="스트랭크 로고"
          width={109}
          height={80}
          className="h-[80px] w-[109px]"
        />
      </div>
      <Image
        src="/images/strava-logo.png"
        alt="스트라바 로고"
        width={120}
        height={120}
        className="h-[120px] w-[120px]"
      />
    </div>
  )
}
