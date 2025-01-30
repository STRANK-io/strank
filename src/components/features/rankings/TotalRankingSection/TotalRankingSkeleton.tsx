import { Skeleton } from '@/components/ui/skeleton'

export default function TotalRankingSkeleton() {
  return (
    <>
      <Skeleton className="h-[231px] w-full rounded-2xl" />
      <div className="grid grid-cols-2 gap-4">
        <Skeleton className="h-[231px] rounded-2xl" />
        <Skeleton className="h-[231px] rounded-2xl" />
      </div>
      <div className="space-y-4">
        {Array.from({ length: 2 }).map((_, i) => (
          <Skeleton key={i} className="h-[72px] w-full rounded-2xl" />
        ))}
      </div>
    </>
  )
}
