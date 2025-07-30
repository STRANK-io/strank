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
import { DISTRICTS, PROVINCES } from '@/lib/constants/region'

interface RegionSelectProps {
  provinceValue: string | null
  districtValue: string | null
  onProvinceChange: (value: string) => void
  onDistrictChange: (value: string) => void
}

export const RegionSelect = ({
  provinceValue,
  districtValue,
  onProvinceChange,
  onDistrictChange,
}: RegionSelectProps) => {
  return (
    <div className={cn('space-y-2')}>
      <Label className="text-base font-bold leading-[20.8px]">내 거주지</Label>
      
      <div className="flex gap-2">
        <Select value={provinceValue ?? ''} onValueChange={onProvinceChange}>
          <SelectTrigger
            className={cn(
              'h-[58px] bg-[#F3F3F3]',
              'rounded-2xl px-4 py-5',
              'text-sm font-semibold leading-[18.2px]',
              provinceValue ? 'text-brand-dark' : 'text-[#B1B1B1]',
              'border-0 outline-none focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0'
            )}
          >
            <SelectValue placeholder="시/도" />
          </SelectTrigger>
          <SelectContent className="bg-[#F3F3F3]">
            {PROVINCES.map(province => (
              <SelectItem key={province} value={province}>
                {province}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select 
          value={districtValue ?? ''} 
          onValueChange={onDistrictChange}
          disabled={!provinceValue}
        >
          <SelectTrigger
            className={cn(
              'h-[58px] bg-[#F3F3F3]',
              'rounded-2xl px-4 py-5',
              'text-sm font-semibold leading-[18.2px]',
              districtValue ? 'text-brand-dark' : 'text-[#B1B1B1]',
              'border-0 outline-none focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0'
            )}
          >
            <SelectValue placeholder="시/군/구" />
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
    </div>
  )
}