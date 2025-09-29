import { useState, useEffect } from 'react';
import ZoneRow from './ZoneRow';
import { useUserContext } from '@/contexts/UserContext';
import { useGetZoneInfoQuery } from '@/hooks/zone/api/useGetZoneInfoQuery';
import { useUpdateZoneInfo } from '@/hooks/zone/api/useUpdateZoneSettings';
import { useZoneCalculation } from '@/hooks/zone/useZoneCalculation';

interface ZoneCardProps {
  type: string;
  flagValue?: number | null;
  isOpen: boolean;
  onToggle: () => void;
}

export default function ZoneCard({ type, flagValue, isOpen, onToggle }: ZoneCardProps) {
  const { userId } = useUserContext();
  const { data: zoneInfo } = useGetZoneInfoQuery(userId, type as 'power' | 'heart');
  const { mutate: updateZoneInfo } = useUpdateZoneInfo();
  
  const [value, setValue] = useState(flagValue || 0);

  const { zones, calculateZones, handleZoneMaxChange, resetZones } = useZoneCalculation({
    zoneType: type as 'power' | 'heart',
    zoneInfo: zoneInfo || [],
    isOpen,
    flagValue: flagValue || 0,
  });

  // 카드가 열릴 때마다 value 초기화
  useEffect(() => {
    if (isOpen) {
      setValue(flagValue || 0);
    }
  }, [isOpen, flagValue]);

  // 저장 핸들러
  const handleSave = () => {
    const zoneData = zones.map(zone => ({
      user_id: userId,
      zone_type: type as 'power' | 'heart',
      zone_name: zone.name,
      min: zone.min,
      max: zone.max,
    }));

    updateZoneInfo({
      userId,
      zoneType: type as 'power' | 'heart',
      zones: zoneData,
      value: value
    }, {
      onSuccess: () => {
        onToggle();
      }
    });
  };

  // 취소 핸들러
  const handleCancel = () => {
    setValue(flagValue || 0);
    resetZones();
    onToggle();
  };

  return (
    <div className="bg-white shadow-md rounded-xl p-4">
      {/* 헤더 */}
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">
          {type === 'power' ? '⚡ 파워 존' : '❤️ 심박수'}
        </h2>
        <button
          onClick={handleCancel}
          className="px-3 py-1 border border-orange-500 text-orange-500 rounded-full text-sm font-medium hover:bg-orange-50"
        >
          {isOpen ? "닫기" : "설정하기"}
        </button>
      </div>

      {/* 카드 영역 */}
      {isOpen && (
        <div className="mt-4">
          <div className="flex justify-between items-center gap-2 mb-4">
            <label className="font-semibold">
              {type === 'power' ? 'FTP(와트)' : '최대 심박수'}
            </label>
            <input
              id={type}
              type="number"
              value={value}
              onChange={(e) => setValue(Number(e.target.value))}
              className="border rounded px-2 py-1 bg-white w-4/6"
            />
          </div>

          <div className="flex justify-end items-center gap-2 mb-4">
            <button 
              onClick={() => calculateZones(value)}
              className="px-2 py-1 bg-gray-200 rounded"
            >
              자동계산
            </button>
            <button 
              onClick={handleSave}
              className="px-2 py-1 bg-blue-500 text-white rounded"
            >
              저장하기
            </button>
          </div>

          {/* zone 콘텐츠 */}
          <div>
            {zones.length > 0 ? (
              zones.map((zone) => (
                <ZoneRow 
                  key={zone.name} 
                  zone={zone} 
                  onMaxChange={handleZoneMaxChange} 
                />
              ))
            ) : (
              <div>로딩 중...</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
