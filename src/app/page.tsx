import { Button } from '@/components/ui/button'

export default async function Home() {
  return (
    <>
      <main className="flex flex-1 flex-col gap-6 px-4">
        <h2 className="text-black-900 mb-4 text-xl font-bold">STRANK</h2>
        <h2 className="text-black-900 mb-4 text-xl font-medium">
          지역별 랭킹으로 더 가까워진 라이딩 커뮤니티
        </h2>
        <h2 className="text-black-900 mb-4 text-xl font-medium">
          STRANK의 서비스를 원활히 이용하기 위해서 STRAVA와 연동이 필요합니다.
        </h2>
        <Button />
      </main>
    </>
  )
}
