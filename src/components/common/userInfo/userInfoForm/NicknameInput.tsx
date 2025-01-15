'use client'

import { useState, useEffect } from 'react'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils/cn'
import { useDebounce } from '@/hooks/common/useDebounce'
import { Caption } from '@/components/common/Caption'

interface NicknameInputProps {
  initialValue: string
  onChange: (value: string) => void
}

export const NicknameInput = ({ initialValue, onChange }: NicknameInputProps) => {
  const [localValue, setLocalValue] = useState(initialValue)
  const debouncedOnChange = useDebounce(onChange, 150)

  useEffect(() => {
    setLocalValue(initialValue)
  }, [initialValue])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    setLocalValue(newValue)
    debouncedOnChange(newValue)
  }

  return (
    <div className={cn('space-y-2')}>
      <Label htmlFor="nickname" className="text-base font-bold leading-[20.8px]">
        닉네임
      </Label>
      <Input
        id="nickname"
        type="text"
        value={localValue}
        onChange={handleChange}
        placeholder="사용자의 이름을 알려주세요"
        className={cn(
          'h-[58px] bg-[#F3F3F3]',
          'text-sm font-semibold leading-[18.2px] placeholder:text-[#B1B1B1]',
          'rounded-2xl px-4 py-5',
          'border-0 outline-none focus-visible:ring-0 focus-visible:ring-offset-0'
        )}
      />
      <Caption text="* 한글, 영문 포함 2~10자 이내 / 특수문자, 숫자, 공백 제외" />
    </div>
  )
}
