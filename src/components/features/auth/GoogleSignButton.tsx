'use client'

import { toast } from 'sonner'
import { ToastContent } from '@/components/common/ToastContent'
import { ERROR_CODES, ERROR_MESSAGES } from '@/lib/constants/error'
import { createClient } from '@/lib/supabase/client'
import { PrimaryButton } from '@/components/common/PrimaryButton'

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
          redirectTo: `${redirectUrl}/auth/callback`,
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
