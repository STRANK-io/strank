'use client'

import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils/cn'
import { DISTRICTS } from '@/lib/constants/region'

interface RegionSelectProps {
  value: string | null
  onChange: (value: string) => void
}

export const RegionSelect = ({ value, onChange }: RegionSelectProps) => {
  return (
    <div className={cn('space-y-2')}>
      <div className="flex items-end space-x-2">
        <Label className="text-base font-bold leading-[20.8px]">내 거주지</Label>
        <p className="text-[13px] font-normal leading-[16.9px] text-[#B1B1B1]">
          (현재는 서울시 지역분들만 가능해요.)
        </p>
      </div>

      <Select value={value ?? ''} onValueChange={onChange}>
        <SelectTrigger
          className={cn(
            'h-[58px] bg-[#F3F3F3]',
            'rounded-2xl px-4 py-5',
            'text-sm font-semibold leading-[18.2px]',
            value ? 'text-brand-dark' : 'text-[#B1B1B1]',
            'border-0 outline-none focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0'
          )}
        >
          <SelectValue placeholder="지역구" />
        </SelectTrigger>
        <SelectContent className="bg-[#F3F3F3]">
          {DISTRICTS.map(district => (
            <SelectItem key={district} value={district}>
              {district}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
