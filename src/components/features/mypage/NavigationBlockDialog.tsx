import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

interface NavigationBlockDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
}

export function NavigationBlockDialog({
  open,
  onOpenChange,
  onConfirm,
}: NavigationBlockDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="w-[353px] rounded-lg bg-white">
        <AlertDialogHeader>
          <AlertDialogTitle className="sr-only">페이지 이동 확인</AlertDialogTitle>
          <AlertDialogDescription className="whitespace-pre-line text-sm text-brand-dark">
            {`동기화중 다른 페이지로 이동할 시,\n최신화가 되질 않습니다.\n정말로 이동하시겠습니까?`}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>취소</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>이동하기</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
