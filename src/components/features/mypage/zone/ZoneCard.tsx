import { useState, useEffect } from 'react';
import ZoneRow from './ZoneRow';
import { useUserContext } from '@/contexts/UserContext';
import { useGetZoneInfoQuery } from '@/hooks/zone/api/useGetZoneInfoQuery';
import { useUpdateZoneInfo } from '@/hooks/zone/api/useUpdateZoneSettings';
import { useZoneCalculation } from '@/hooks/zone/useZoneCalculation';
import { toast } from 'sonner';
import { ToastContent } from '@/components/common/ToastContent'

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
  
  const [value, setValue] = useState<string>((flagValue || 0).toString());
  const [isCalculated, setIsCalculated] = useState(false); // 자동계산 실행 여부

  const { zones, calculateZones, handleZoneMaxChange, resetZones } = useZoneCalculation({
    zoneType: type as 'power' | 'heart',
    zoneInfo: zoneInfo || [],
    isOpen,
    flagValue: flagValue || 0,
  });

  // 카드가 열릴 때마다 value 초기화
  useEffect(() => {
    if (isOpen) {
      setValue((flagValue || 0).toString());
      setIsCalculated(false); // 카드 열릴 때 계산 상태 초기화
    }
  }, [isOpen, flagValue]);

  // 저장 핸들러
  const handleSave = () => {
    // 1. FTP/심박수 값 검증
    if (!value || value.trim() === '') {
      const fieldName = type === 'power' ? 'FTP(와트)' : '최대 심박수';
      toast(<ToastContent text={`${fieldName}를 입력해주세요.`} />);
      return;
    }

    if (Number(value) <= 0) {
      toast(<ToastContent text="0보다 큰 값을 입력해주세요." />);
      return;
    }

    // 2. 자동계산이 실행되었는지 확인
    // zones가 기본값인지 확인 (자동계산이 실행되지 않은 상태)
    const hasCalculatedZones = zones.some(zone => zone.max > 0);
    if (!hasCalculatedZones) {
      toast(<ToastContent text="자동계산을 먼저 실행해주세요." />);
      return;
    }

    // 3. zone 값들이 유효한지 확인
    const hasInvalidZones = zones.some(zone => zone.min >= zone.max || zone.max <= 0);
    if (hasInvalidZones) {
      toast(<ToastContent text="존 값이 올바르지 않습니다. 자동계산을 다시 실행해주세요." />);
      return;
    }

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
      value: Number(value) || 0
    }, {
      onSuccess: () => {
        toast(<ToastContent text="저장되었습니다." />);
      },
      onError: () => {
        toast(<ToastContent text="저장에 실패했습니다. 다시 시도해주세요." />);
      }
    }); 
  };

  // 취소 핸들러
  const handleCancel = () => {
    setValue((flagValue || 0).toString());
    resetZones();
    onToggle();
  };

  // 자동계산 핸들러
  const handleCalculate = () => {
    // 값이 비어있는 경우
    if (!value || value.trim() === '') {
      const fieldName = type === 'power' ? 'FTP(와트)' : '최대 심박수';
      toast(<ToastContent text={`${fieldName}를 입력해주세요.`} />);
      return;
    }
    
    // 값이 0 이하인 경우
    if (Number(value) <= 0) {
      toast(<ToastContent text="0보다 큰 값을 입력해주세요." />);
      return;
    }
    
    const numValue = Number(value) || 0;
    calculateZones(numValue);
    setIsCalculated(true); // 자동계산 완료 표시
  };

  // value 변경 핸들러
  const handleValueChange = (newValue: string) => {
    setValue(newValue);
    setIsCalculated(false); // 값이 변경되면 계산 상태 초기화
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
              onChange={(e) => handleValueChange(e.target.value)}
              className="border rounded px-2 py-1 bg-white w-4/6"
              placeholder="숫자만 입력하세요"
            />
          </div>

          <div className="flex justify-end items-center gap-2 mb-4">
            <button 
              onClick={handleCalculate}
              className="px-2 py-1 bg-gray-200 rounded"
            >
              자동계산
            </button>
            <button 
              onClick={handleSave}
              disabled={!isCalculated}
              className={`px-2 py-1 rounded ${
                isCalculated 
                  ? 'bg-blue-500 text-white hover:bg-blue-600 cursor-pointer' 
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
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
