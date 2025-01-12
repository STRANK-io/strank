import useLogOut from '@/hooks/user/api/useLogOut'
import { ROUTES } from '@/lib/constants/routes'
import { toast } from 'sonner'
import { ToastContent } from '@/components/common/ToastContent'
import { ERROR_CODES, ERROR_MESSAGES } from '@/lib/constants/error'
import { useRouter } from 'next/navigation'

export const LogOutButton = () => {
  const router = useRouter()
  const { mutate: logOut } = useLogOut()

  const handleLogOut = () => {
    logOut(undefined, {
      onSuccess: () => {
        router.push(ROUTES.PUBLIC.HOME)
      },
      onError: () => {
        toast(<ToastContent text={ERROR_MESSAGES[ERROR_CODES.AUTH.LOGOUT_FAILED]} />)
      },
    })
  }

  return (
    <button
      className="cursor-pointer text-brand-dark underline decoration-brand-dark"
      onClick={handleLogOut}
    >
      로그아웃
    </button>
  )
}
