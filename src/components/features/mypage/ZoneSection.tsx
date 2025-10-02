'use client';

import { useState } from 'react';
import ZoneCard from './zone/ZoneCard';
import { UserInfo } from '@/lib/types/userInfo';
import { DEFAULT_ZONE_VALUES } from '@/lib/constants/zone';

export default function ZoneSection({ userInfo }: { userInfo: UserInfo | null}) {
  const [openCard, setOpenCard] = useState<string | null>(null);

  const ftp = userInfo?.ftp_value === 0 ? DEFAULT_ZONE_VALUES.POWER : userInfo?.ftp_value;
  const heart = userInfo?.heart_value === 0 ? DEFAULT_ZONE_VALUES.HEART : userInfo?.heart_value;

  return (
    <div className="max-w-md mx-auto space-y-4">
        <div className="flex items-end gap-5">
            <p className="text-base font-bold leading-[20.8px] text-brand-dark">Zone 설정</p>
        </div>

        <ZoneCard
            type = 'power' 
            flagValue = {ftp}
            isOpen = {openCard === 'power'}
            onToggle = {() => setOpenCard(openCard === 'power' ? null : 'power')}
        ></ZoneCard>

        <ZoneCard
            type = 'heart' 
            flagValue = {heart}
            isOpen = {openCard === 'heart'}
            onToggle = {() => setOpenCard(openCard === 'heart' ? null : 'heart')}
        ></ZoneCard>
    </div>
  );
}
