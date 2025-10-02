import { Zone, ZoneType } from "@/lib/types/zone";
import { useEffect, useState } from "react";

interface ZoneRowProps {
  zone: Zone;
  type: ZoneType;
  onMinChange: (name: string, newMin: string) => void;
}

export default function ZoneRow({ zone, type, onMinChange }: ZoneRowProps) {
  const [value, setValue] = useState<string>(zone.min.toString());

  // zone.min이 변경될 때 로컬 상태 동기화
  useEffect(() => {
    setValue(zone.min.toString());
  }, [zone.min]);

  // value 변경 핸들러
  const handleValueChange = (newValue: string) => {
    setValue(newValue);
    onMinChange(zone.name, newValue);
  };

  return (
    <div className="flex justify-between items-center py-2 border-b last:border-none">
      <div className="flex items-center gap-2">
        <div className={`w-4 h-4 rounded ${zone.color}`} />
        <span className="font-semibold">{zone.name}</span>
        <span>{zone.description}</span>
      </div>

      <div className="flex items-center gap-1 text-gray-600">
        <input
          type="number"
          value={value}
          className="w-12 border rounded px-1 bg-white text-center"
          onChange={(e) => handleValueChange(e.target.value)}
        />
        <span> - {(type === 'power') ? (zone.name === 'Z7') ? '∞' : zone.max : (zone.name === 'Z5') ? '∞' : zone.max}</span>
      </div>
    </div>
  );
}
