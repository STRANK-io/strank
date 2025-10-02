export const ZONE_CONFIG = {
  power: [
    { name: "Z7", description: "파워 간격", color: "bg-red-600" },
    { name: "Z6", description: "클라이밍 반복", color: "bg-orange-500" },
    { name: "Z5", description: "정상 상태", color: "bg-yellow-400" },
    { name: "Z4", description: "템포", color: "bg-green-500" },
    { name: "Z3", description: "인듀어런스 거리", color: "bg-blue-500" },
    { name: "Z2", description: "기본 거리", color: "bg-indigo-800" },
    { name: "Z1", description: "회복 거리", color: "bg-gray-400" },
  ],
  heart: [
    { name: "Z5", description: "최고 심박수", color: "bg-red-600" },
    { name: "Z4", description: "높은 심박수", color: "bg-orange-500" },
    { name: "Z3", description: "심장 강화 운동", color: "bg-yellow-400" },
    { name: "Z2", description: "지방 연소", color: "bg-green-500" },
    { name: "Z1", description: "낮은 심박수", color: "bg-blue-500" },
  ],
} as const;
  
export const ZONE_RATIOS = {
  power: [0.5, 0.87, 0.95, 1.0, 1.11, 3.0, 0.0],
  heart: [0.65, 0.75, 0.85, 0.95, 1.0],
} as const;

// Zone max 값 계산을 위한 상수
export const ZONE_MAX_VALUES = {
  power: { 'Z7': 2500 },
  heart: { 'Z5': 250 }
} as const;