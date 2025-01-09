import { Database } from '@/lib/supabase/supabase'

export type UsersType = Pick<
  Database['public']['Tables']['users']['Row'],
  'id' | 'name' | 'profile' | 'district'
>
