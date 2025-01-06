import Image from 'next/image'

export default function PrivatePageHeader() {
  return (
    <header className="flex items-center gap-[9.5px]">
      <Image
        src="/images/strank-logo.png"
        alt="스트랭크 로고"
        width={54.5}
        height={40}
        className="h-[40px] w-[54.5px]"
      />
      <span className="text-xl font-bold leading-[23.87px]">STRANK</span>
    </header>
  )
}
