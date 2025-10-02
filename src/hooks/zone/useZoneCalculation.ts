import { useState, useEffect } from 'react';
import { Zone, ZoneType } from '@/lib/types/zone';
import { ZONE_RATIOS, ZONE_MAX_VALUES } from '@/lib/constants/zone';
import { createDefaultZones, getZoneColor, getZoneDescription } from '@/lib/utils/zone';

interface UseZoneCalculationProps {
  zoneType: ZoneType;
  zoneInfo: any[];
  isOpen: boolean;
}

export const useZoneCalculation = ({ 
  zoneType, 
  zoneInfo, 
  isOpen
}: UseZoneCalculationProps) => {
  const [zones, setZones] = useState<Zone[]>([]);
  const [originalZones, setOriginalZones] = useState<Zone[]>([]);

  // 카드가 열릴 때마다 초기화 및 데이터 로드
  useEffect(() => {
    if (isOpen) {
      if (zoneInfo && zoneInfo.length > 0) {
        // DB 데이터 사용
        const convertedZones = zoneInfo.map(zone => ({
          name: zone.zone_name,
          description: getZoneDescription(zone.zone_name, zoneType),
          min: zone.min,
          max: zone.max,
          color: getZoneColor(zone.zone_name, zoneType),
        }));
        setZones(convertedZones);
      } else {
        // 기본값 사용
        setZones(createDefaultZones(zoneType));
      }
    }
  }, [isOpen, zoneInfo, zoneType]);

  // zones 변경 시 원본 백업
  useEffect(() => {
    if (zones.length > 0) {
      setOriginalZones([...zones]);
    }
  }, [zones]);

  // Zone max 값 계산
  const calculateZoneMax = (zoneName: string, inputValue: number, ratio: number): number => {
    const maxValue = ZONE_MAX_VALUES[zoneType][zoneName as keyof typeof ZONE_MAX_VALUES[typeof zoneType]];
    return maxValue ?? Math.round(inputValue * ratio);
  };

  // Zone 계산
  const calculateZones = (inputValue: number) => {
    const ratios = ZONE_RATIOS[zoneType];
    const updatedZones = [...zones];

    // Zone을 역순으로 처리 (Z1부터 Z7/Z5까지)
    for (let i = 0; i < updatedZones.length; i++) {
      const zoneIndex = updatedZones.length - 1 - i; // 역순 인덱스
      const ratioIndex = i; // 비율 배열은 정순 인덱스
      const currentZone = updatedZones[zoneIndex];
      
      if (i === 0) {
        // 첫 번째 Zone (Z1) - 최소값은 0
        currentZone.min = 0;
        currentZone.max = calculateZoneMax(currentZone.name, inputValue, ratios[ratioIndex]);
      } else {
        // 나머지 Zone들 - 이전 Zone의 max + 1이 min
        const previousZone = updatedZones[zoneIndex + 1];
        currentZone.min = previousZone.max + 1;
        currentZone.max = calculateZoneMax(currentZone.name, inputValue, ratios[ratioIndex]);
      }
    }

    setZones(updatedZones);
  };

  // Zone min 값 변경
  const handleZoneMinChange = (name: string, newMin: number) => {
    setZones((prevZones) => {
      const updatedZones = [...prevZones];
      const currentZoneIndex = updatedZones.findIndex((zone) => zone.name === name);

      if (currentZoneIndex === -1) {
        return updatedZones; // Zone을 찾을 수 없는 경우 원본 반환
      }

      // 현재 Zone의 min 값 업데이트
      updatedZones[currentZoneIndex] = { 
        ...updatedZones[currentZoneIndex], 
        min: newMin 
      };

      // 이전 Zone의 max 값을 현재 Zone의 min - 1로 설정
      const previousZoneIndex = currentZoneIndex + 1;
      if (previousZoneIndex < updatedZones.length) {
        updatedZones[previousZoneIndex] = {
          ...updatedZones[previousZoneIndex],
          max: newMin - 1,
        };
      }

      return updatedZones;
    });
  };

  // 원본으로 복원
  const resetZones = () => {
    setZones([...originalZones]);
  };

  return {
    zones,
    calculateZones,
    handleZoneMinChange,
    resetZones,
  };
};
