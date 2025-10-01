import { useState, useEffect } from 'react';
import { Zone } from '@/lib/types/zone';
import { ZONE_RATIOS } from '@/lib/constants/zone';
import { createDefaultZones, getZoneColor, getZoneDescription } from '@/lib/utils/zone';

interface UseZoneCalculationProps {
  zoneType: 'power' | 'heart';
  zoneInfo: any[];
  isOpen: boolean;
  flagValue: number | null;
}

export const useZoneCalculation = ({ 
  zoneType, 
  zoneInfo, 
  isOpen, 
  flagValue 
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

  // Zone 계산
  const calculateZones = (inputValue: number) => {
    const ratios = ZONE_RATIOS[zoneType];
    const updatedZones = [...zones];

    for (let i = 0; i < updatedZones.length; i++) {
      const zoneIndex = updatedZones.length - 1 - i;
      const ratioIndex = i;
      
      if (i === 0) {
        updatedZones[zoneIndex].min = 0;
        updatedZones[zoneIndex].max = Math.round(inputValue * ratios[ratioIndex]);
      } else {
        updatedZones[zoneIndex].min = updatedZones[zoneIndex + 1].max + 1;

        // Z7은 2500으로 고정
        if (updatedZones[zoneIndex].name === 'Z7') {
          updatedZones[zoneIndex].max = 2500;
        } else {
          updatedZones[zoneIndex].max = Math.round(inputValue * ratios[ratioIndex]);
        }
      }
    }

    setZones(updatedZones);
  };

  // Zone min 값 변경
  const handleZoneMinChange = (name: string, newMin: number) => {
    setZones((prevZones) => {
      const updatedZones = [...prevZones];
      const index = updatedZones.findIndex((z) => z.name === name);

      if (index !== -1) {
        updatedZones[index] = { ...updatedZones[index], min: newMin };

        // 이전 zone의 max = 현재 zone min - 1
        if (index + 1 < updatedZones.length) {
          updatedZones[index + 1] = {
            ...updatedZones[index + 1],
            max: newMin - 1,
          };
        }
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
