import { ZONE_CONFIG } from '@/lib/constants/zone';
import { Zone, ZoneType } from '@/lib/types/zone';
import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/lib/supabase/supabase';

export const getZoneColor = (zoneName: string, zoneType: ZoneType): string => {
  const config = ZONE_CONFIG[zoneType];
  const zone = config.find(z => z.name === zoneName || z.description === zoneName);
  return zone?.color || 'bg-gray-400';
};

export const getZoneDescription = (zoneName: string, zoneType: ZoneType): string => {
  const config = ZONE_CONFIG[zoneType];
  const zone = config.find(z => z.name === zoneName);
  return zone?.description || '';
};

export const createDefaultZones = (zoneType: ZoneType): Zone[] => {
  const config = ZONE_CONFIG[zoneType];
  const defaultValues = {
    power: [
      { min: 661, max: 2500 },
      { min: 245, max: 660 },
      { min: 221, max: 244 },
      { min: 210, max: 220 },
      { min: 192, max: 209 },
      { min: 111, max: 191 },
      { min: 0, max: 110 },
    ],
    heart: [
      { min: 172, max: 250 },
      { min: 154, max: 171 },
      { min: 136, max: 153 },
      { min: 118, max: 135 },
      { min: 0, max: 117 },
    ],
  };

  return config.map((zone, index) => ({
    name: zone.name,
    description: zone.description,
    color: zone.color,
    min: defaultValues[zoneType][index].min,
    max: defaultValues[zoneType][index].max,
  }));
};

// 범용 존 컨버터 함수
export function convertZoneDataToZones(zoneInfo: any[]): Record<string, [number, number]> {
  const zones: Record<string, [number, number]> = {};

  zoneInfo.forEach(zone => {
    const zoneName = zone.zone_name;
    zones[zoneName] = [zone.min, zone.max];
  });

  return zones;
}

// 서버 사이드에서 사용할 수 있는 존 정보 가져오기 함수
export async function getZoneInfo(
    type: 'power' | 'heart',
    userId: string, 
    defaultZones: Record<string, [number, number]>,
    supabase: SupabaseClient<Database>
  ): Promise<Record<string, [number, number]>> {
  try {
    const { data: zoneInfo, error } = await supabase
      .from('zone_info')
      .select('*')
      .eq('user_id', userId)
      .eq('zone_type', type)
      .order('min', { ascending: false });

    console.log("🚀zoneInfo 조회 결과:", {
      userId,
      type,
      zoneInfo,
      error,
      count: zoneInfo?.length || 0
    });

    if (error) {
      console.error('Error fetching zone info:', error);
      return defaultZones;
    }

    if (!zoneInfo || zoneInfo.length === 0) {
      return defaultZones; // 기본값 반환
    }

    return convertZoneDataToZones(zoneInfo);
  } catch (error) {
    console.error('Error in getZoneInfo:', error);
    return defaultZones;
  }
}