import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { QUERY_KEYS } from '@/lib/constants/queryKeys'
import { ZoneInfo } from '@/lib/types/zone'

interface UpdateZoneSettingsParams {
  userId: string
  zoneType: 'power' | 'heart'
  zones: Omit<ZoneInfo, 'id' | 'user_id' | 'created_at' | 'updated_at'>[]
  value: number | null
}

export const useUpdateZoneInfo = () => {
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ userId, zoneType, zones, value }: UpdateZoneSettingsParams) => {
      // 1. zone_info 테이블 업데이트
      // 기존 데이터 삭제
      const { error: deleteError } = await supabase
        .from('zone_info')
        .delete()
        .eq('user_id', userId)
        .eq('zone_type', zoneType)

      if (deleteError) throw deleteError

      // 새 데이터 삽입
      const newZones = zones.map(zone => ({
        user_id: userId,
        zone_type: zoneType,
        zone_name: zone.zone_name,
        min: zone.min,
        max: zone.max,
      }))

      const { error: insertError } = await supabase
        .from('zone_info')
        .insert(newZones)

      if (insertError) throw insertError

      // 2. users 테이블 업데이트
      const updateData: any = {}
      zoneType === 'power' && value !== undefined ?
        updateData.ftp_value = value : updateData.heart_value = value

      if (Object.keys(updateData).length > 0) {
        const { error: userUpdateError } = await supabase
          .from('users')
          .update(updateData)
          .eq('id', userId)

        if (userUpdateError) throw userUpdateError
      }
    },
    onSuccess: (_, variables) => {
      // 관련 쿼리들 무효화
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.USER.INFO(variables.userId),
      })
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.ZONE.INFO(variables.userId, variables.zoneType),
      })
    },
    onError: (error) => {
      console.error('Zone settings update failed:', error)
    },
  })
}
