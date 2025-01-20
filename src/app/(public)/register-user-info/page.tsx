import StepIndicator from '@/components/common/StepIndicator'
import { CompleteButton } from '@/components/common/userInfo/CompleteButton'
import { UserInfoForm } from '@/components/common/userInfo/userInfoForm/UserInfoForm'
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
    <div>
      <StepIndicator />
      <UserInfoForm userId={user.id} />
      <div className="fixed bottom-12 left-1/2 w-full max-w-[450px] -translate-x-1/2 px-5">
        <CompleteButton userId={user.id} text="입력 완료" />
      </div>
    </div>
  )
}
