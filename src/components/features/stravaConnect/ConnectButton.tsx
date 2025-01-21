'use client'
import ConnectWithStravaIcon from '@/components/common/icons/ConnectWithStravaIcon'

export default function ConnectButton() {
  const moveToStravaAuthPage = () => {
    // Strava OAuth 인증 요청
    const requiredScopes = ['read', 'profile:read_all', 'activity:read_all', 'activity:write']

    const authUrl = `https://www.strava.com/oauth/authorize?client_id=${
      process.env.NEXT_PUBLIC_STRAVA_CLIENT_ID
    }&redirect_uri=${
      process.env.NEXT_PUBLIC_APP_URL
    }/auth/strava/callback&response_type=code&scope=${encodeURIComponent(requiredScopes.join(','))}`

    window.location.href = authUrl
  }

  return (
    <div className="flex w-full justify-center px-5">
      <button onClick={moveToStravaAuthPage}>
        <ConnectWithStravaIcon />
      </button>
    </div>
  )
}
