import { Database } from '@/lib/supabase/supabase'
import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export const updateSessionAndGetUser = async (request: NextRequest) => {
  const supabaseNextResponse = NextResponse.next({ request })

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: cookiesToSet => {
          cookiesToSet.forEach(({ name, value, options }) => {
            supabaseNextResponse.cookies.set({ name, value, ...options })
          })
        },
      },
    }
  )

  const {
    data: { user: sessionUser },
  } = await supabase.auth.getUser()

  return { supabaseNextResponse, supabase, sessionUser }
}
