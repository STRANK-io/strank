import { Database } from '@/lib/supabase/supabase'

export type UsersType = Pick<
  Database['public']['Tables']['users']['Row'],
  'name' | 'profile' | 'district' | 'last_activity_sync_at'
>
