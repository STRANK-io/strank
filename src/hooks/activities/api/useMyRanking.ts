import { useSuspenseQuery } from '@tanstack/react-query'
import { QUERY_KEYS } from '@/lib/constants/queryKeys'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/contexts/UserContext'
import { MyRankingResponse, RankingFilters, ActivityWithUser } from '@/lib/types/ranking'
import { UsersType } from '@/lib/types/auth'
import { createRankingQuery } from '@/lib/utils/ranking'

const fetchMyRanking = async (
  filters: RankingFilters,
  user: UsersType
): Promise<MyRankingResponse | null> => {
  const supabase = createClient()
  const { data: result, error } = await createRankingQuery(supabase, filters, user)

  if (error) {
    console.error(error)
    return null
  }

  if (!result || result.length === 0) return null

  const activities = result as ActivityWithUser[]
  let myBestRank = -1
  let myBestActivity: ActivityWithUser | null = null

  for (let i = 0; i < activities.length; i++) {
    const activity = activities[i]
    if (activity.users && activity.users.id === user.id) {
      myBestRank = i + 1
      myBestActivity = activity
      break
    }
  }

  if (!myBestActivity) return null

  return {
    id: myBestActivity.id,
    name: myBestActivity.name || '',
    rank: myBestRank,
    distance: myBestActivity.distance || 0,
    elevation: myBestActivity.total_elevation_gain || 0,
    date: myBestActivity.start_date || '',
    user: {
      nickname: myBestActivity.users.name || '이름 없음',
      imageUrl: myBestActivity.users.profile || undefined,
      district: myBestActivity.users.district || '지역 없음',
    },
  }
}

export const useMyRanking = (filters: RankingFilters) => {
  const user = useUser()

  return useSuspenseQuery({
    queryKey: QUERY_KEYS.RANKINGS.MY_RANKING(filters),
    queryFn: () => fetchMyRanking(filters, user),
  })
}
