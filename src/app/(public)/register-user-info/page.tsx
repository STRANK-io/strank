import PublicPageHeader from '@/components/common/PublicPageHeader'
import StepIndicator from '@/components/common/StepIndicator'
import { CompleteButton } from '@/components/features/registerUserInfo/CompleteButton'
import { UserInfoForm } from '@/components/features/registerUserInfo/UserInfoForm'
import { ERROR_CODES } from '@/lib/constants/error'
import { ROUTES } from '@/lib/constants/routes'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function RegisterUserInfoPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect(`${ROUTES.PUBLIC.HOME}?error=${ERROR_CODES.AUTH.AUTHENTICATION_REQUIRED}`)
  }

  return (
    <div className="mt-11">
      <PublicPageHeader title="기본정보 입력" href={ROUTES.PUBLIC.STRAVA_CONNECT} />
      <StepIndicator />
      <UserInfoForm user={user} />
      <div className="fixed bottom-12 left-1/2 w-full max-w-[393px] -translate-x-1/2 px-5">
        <CompleteButton user={user} />
      </div>
    </div>
  )
}
