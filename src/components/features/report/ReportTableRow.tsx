'use client'
import { cn } from '@/lib/utils/cn'

export default function ReportTableRow({ texts }: { texts: string[] }) {
  return (
    <div className="mb-1 flex items-center justify-between gap-2 rounded-full bg-white p-1 shadow-[0px_8px_16px_0px_#00000017]">
      {texts.map((text, index) => (
        <div
          key={`${text}-${index}`}
          className={cn(
            'w-[56.2px] text-center',
            'text-[13px] font-normal leading-[16.9px] text-brand-dark'
          )}
        >
          {text}
        </div>
      ))}
    </div>
  )
}
