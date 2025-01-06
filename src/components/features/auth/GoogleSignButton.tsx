'use client'

import { toast } from 'sonner'
import { ToastContent } from '@/components/common/ToastContent'
import { ERROR_CODES, ERROR_MESSAGES } from '@/lib/constants/error'
import { createClient } from '@/lib/supabase/client'
import { PrimaryButton } from '@/components/common/PrimaryButton'
import { ROUTES } from '@/lib/constants/routes'

export function GoogleSignButton() {
  const supabase = createClient()

  const handleSignIn = async () => {
    try {
      if (!process.env.NEXT_PUBLIC_APP_URL) {
        throw new Error('NEXT_PUBLIC_APP_URL is not defined')
      }
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          queryParams: {
            access_type: 'offline',
          },
          redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}${ROUTES.PUBLIC.AUTH_CALLBACK}`,
        },
      })
      if (error) throw error
    } catch (error) {
      console.error('Error signing in with Google:', error)
      toast(<ToastContent text={ERROR_MESSAGES[ERROR_CODES.AUTH.AUTH_CALLBACK_ERROR]} />)
    }
  }

  return <PrimaryButton text="Sign in with Google" onClick={handleSignIn} />
}
