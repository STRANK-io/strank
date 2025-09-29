import { Zone } from "@/lib/types/zone";

interface ZoneRowProps {
  zone: Zone;
  onMaxChange: (name: string, newMax: number) => void;
}

export default function ZoneRow({ zone, onMaxChange }: ZoneRowProps) {
  return (
    <div className="flex justify-between items-center py-2 border-b last:border-none">
      <div className="flex items-center gap-2">
        <div className={`w-4 h-4 rounded ${zone.color}`} />
        <span className="font-semibold">{zone.name}</span>
        <span>{zone.description}</span>
      </div>

      <div className="flex items-center gap-1 text-gray-600">
        <span>{zone.min} - </span>
        <input
          type="number"
          value={zone.max}
          className="w-12 border rounded px-1 bg-white text-center"
          onChange={(e) => onMaxChange(zone.name, Number(e.target.value))}
        />
      </div>
    </div>
  );
}
