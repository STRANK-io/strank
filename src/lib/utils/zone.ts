import { ZONE_CONFIG } from '@/lib/constants/zone';
import { Zone } from '@/lib/types/zone';

export const getZoneColor = (zoneName: string, zoneType: 'power' | 'heart'): string => {
  const config = ZONE_CONFIG[zoneType];
  const zone = config.find(z => z.name === zoneName || z.description === zoneName);
  return zone?.color || 'bg-gray-400';
};

export const getZoneDescription = (zoneName: string, zoneType: 'power' | 'heart'): string => {
  const config = ZONE_CONFIG[zoneType];
  const zone = config.find(z => z.name === zoneName);
  return zone?.description || '';
};

export const createDefaultZones = (zoneType: 'power' | 'heart'): Zone[] => {
  const config = ZONE_CONFIG[zoneType];
  const defaultValues = {
    power: [
      { min: 601, max: 800 },
      { min: 223, max: 600 },
      { min: 201, max: 222 },
      { min: 191, max: 200 },
      { min: 175, max: 190 },
      { min: 101, max: 174 },
      { min: 0, max: 100 },
    ],
    heart: [
      { min: 201, max: 222 },
      { min: 191, max: 200 },
      { min: 175, max: 190 },
      { min: 101, max: 174 },
      { min: 0, max: 100 },
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
