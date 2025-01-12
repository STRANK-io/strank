import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import useWithdrawal from '@/hooks/user/api/useWithdrawal'
import { ROUTES } from '@/lib/constants/routes'
import { toast } from 'sonner'
import { ToastContent } from '@/components/common/ToastContent'
import { ERROR_CODES, ERROR_MESSAGES } from '@/lib/constants/error'
import { useRouter } from 'next/navigation'

export const WithdrawalButton = () => {
  const router = useRouter()
  const { mutate: withdrawal } = useWithdrawal()

  const handleWithdrawal = () => {
    withdrawal(undefined, {
      onSuccess: () => {
        router.push(ROUTES.PUBLIC.HOME)
      },
      onError: () => {
        toast(<ToastContent text={ERROR_MESSAGES[ERROR_CODES.AUTH.WITHDRAWAL_FAILED]} />)
      },
    })
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <button className="cursor-pointer text-brand-primary underline decoration-brand-primary">
          회원탈퇴
        </button>
      </AlertDialogTrigger>
      <AlertDialogContent className="w-[353px] rounded-lg bg-white">
        <AlertDialogHeader>
          <AlertDialogTitle className="font-bold text-brand-dark">회원탈퇴</AlertDialogTitle>
          <AlertDialogDescription className="whitespace-pre-line text-sm text-brand-dark">
            {`회원탈퇴 시, 고객님의 데이터가 전부 사라집니다.\n정말로 삭제하시겠습니까?`}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>취소</AlertDialogCancel>
          <AlertDialogAction onClick={handleWithdrawal}>확인</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
