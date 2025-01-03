export default function StravaSyncPage() {
  return (
    <div>
      <div className="flex w-full flex-col gap-6 px-5">
        <h2 className="text-[32px] font-bold leading-[41.6px]">연동중</h2>
        <p className="whitespace-pre-line text-base font-bold leading-[20.8px] text-brand-dark">
          {`소중한 운동정보를 가져오고 있습니다\n조금만 기다려 주세요\n자동으로 첫화면으로 이동됩니다`}
        </p>
      </div>
    </div>
  )
}
