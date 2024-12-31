'use client'

import { toast } from 'sonner'
import { ToastContent } from '@/components/common/ToastContent'
import { Button } from '@/components/ui/button'
import { ERROR_CODES, ERROR_MESSAGES } from '@/lib/constants/error'
import { createClient } from '@/lib/supabase/client'

export function GoogleSignButton() {
  const supabase = createClient()

  const handleSignIn = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          queryParams: {
            access_type: 'offline',
          },
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      })
      if (error) throw error
    } catch (error) {
      console.error('Error signing in with Google:', error)
      toast(<ToastContent text={ERROR_MESSAGES[ERROR_CODES.AUTH.AUTH_CALLBACK_ERROR]} />)
    }
  }

  return (
    <Button
      size="lg"
      className="h-[65px] w-full rounded-2xl bg-brand-primary text-lg font-medium leading-[23px] hover:bg-brand-primary/90"
      onClick={handleSignIn}
      style={{ boxShadow: '0px 4px 8px 0px #FF6A3952' }}
    >
      Sign in with Google
    </Button>
  )
}
