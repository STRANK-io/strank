'use client'

import { toast } from 'sonner'
import { ToastContent } from '@/components/common/ToastContent'
import { ERROR_CODES, ERROR_MESSAGES } from '@/lib/constants/error'
import { createClient } from '@/lib/supabase/client'
import { PrimaryButton } from '@/components/common/PrimaryButton'
import { ROUTES } from '@/lib/constants/routes'
import { logError } from '@/lib/utils/log'

export function GoogleSignButton() {
  const supabase = createClient()

  const handleSignIn = async () => {
    try {
      const redirectUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          queryParams: {
            access_type: 'offline',
          },
          redirectTo: `${redirectUrl}${ROUTES.PUBLIC.AUTH_CALLBACK}`,
        },
      })

      if (error) throw error
    } catch (error) {
      logError('Error signing in with Google:', {
        error,
        endpoint: 'api/strava/sync',
      })
      toast(<ToastContent text={ERROR_MESSAGES[ERROR_CODES.AUTH.AUTH_CALLBACK_ERROR]} />)
    }
  }

  return <PrimaryButton text="Sign in with Google" onClick={handleSignIn} />
}
