import Image from 'next/image'

export default function StrankImage() {
  return (
    <div className="my-11 flex flex-col items-center justify-center">
      <Image
        src="/images/strank-logo.png"
        alt="스트랭크 로고"
        width={109}
        height={80}
        className="h-[80px] w-[109px]"
      />
    </div>
  )
}
