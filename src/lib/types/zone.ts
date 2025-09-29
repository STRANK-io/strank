export type Zone = {
  name: string;
  description: string;
  min: number;
  max: number;
  color: string;
};
  
export type ZoneInfo = {
  id: number;
  user_id: string;
  zone_type: string; // 'power' | 'heart'
  zone_name: string;
  min: number;
  max: number;
  created_at: string;
  updated_at: string;
};