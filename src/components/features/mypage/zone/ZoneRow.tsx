import { Zone, ZoneType } from "@/lib/types/zone";

interface ZoneRowProps {
  zone: Zone;
  type: ZoneType;
  onMinChange: (name: string, newMin: number) => void;
}

export default function ZoneRow({ zone, type, onMinChange }: ZoneRowProps) {
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
          value={zone.min}
          className="w-12 border rounded px-1 bg-white text-center"
          onChange={(e) => onMinChange(zone.name, Number(e.target.value))}
        />
        <span> - {(type === 'power') ? (zone.name === 'Z7') ? '∞' : zone.max : (zone.name === 'Z5') ? '∞' : zone.max}</span>
      </div>
    </div>
  );
}
