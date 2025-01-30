import { Skeleton } from '@/components/ui/skeleton'

export default function ActivityCardSkeleton() {
  return (
    <div className="rounded-3xl bg-white p-6 shadow-[0px_8px_16px_0px_#00000017]">
      <div className="space-y-[6px]">
        <div className="flex items-start justify-between">
          <Skeleton className="h-[26px] w-3/4" />
          <Skeleton className="h-6 w-6 rounded-full" />
        </div>
        <Skeleton className="h-[18px] w-24" />
      </div>

      <div className="my-6 grid grid-cols-2 gap-3">
        {Array.from({ length: 8 }).map((_, index) => (
          <div key={index} className="flex items-center gap-1">
            <Skeleton className="h-[22px] w-20 rounded-lg" />
          </div>
        ))}
      </div>
    </div>
  )
}
