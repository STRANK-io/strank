import { useEffect, useState, useRef } from 'react'
import { useRouter, usePathname } from 'next/navigation'

interface UseNavigationBlockProps {
  shouldBlock: boolean
}

interface UseNavigationBlockReturn {
  showAlert: boolean
  setShowAlert: (show: boolean) => void
  pendingNavigation: (() => void) | null
  handleNavigationConfirm: () => void
}

export const useNavigationBlock = ({
  shouldBlock,
}: UseNavigationBlockProps): UseNavigationBlockReturn => {
  const router = useRouter()
  const pathname = usePathname()
  const [showAlert, setShowAlert] = useState(false)
  const [pendingNavigation, setPendingNavigation] = useState<(() => void) | null>(null)
  const isConfirmed = useRef(false)
  const historyStateCount = useRef(0)

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (shouldBlock) {
        e.preventDefault()
        return ''
      }
    }

    // 클릭 이벤트를 통한 네비게이션 감지
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      const anchor = target.closest('a')
      if (
        anchor &&
        anchor.href &&
        anchor.href.startsWith(window.location.origin) &&
        shouldBlock &&
        new URL(anchor.href).pathname !== pathname
      ) {
        e.preventDefault()
        e.stopPropagation()
        setShowAlert(true)
        setPendingNavigation(() => () => router.push(anchor.href))
      }
    }

    // 뒤로가기/앞으로가기 감지
    const handlePopState = () => {
      if (shouldBlock && !isConfirmed.current) {
        window.history.pushState(null, '', window.location.href)
        historyStateCount.current += 1
        setShowAlert(true)
        setPendingNavigation(() => () => {
          isConfirmed.current = true
          window.history.go(-(historyStateCount.current + 1))
        })
      } else {
        historyStateCount.current = 0
        isConfirmed.current = false
      }
    }

    if (shouldBlock) {
      // shouldBlock이 true일 때만 초기 history 상태 추가
      window.history.pushState(null, '', window.location.href)
      historyStateCount.current = 1
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    window.addEventListener('popstate', handlePopState)
    document.addEventListener('click', handleClick, { capture: true })

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
      window.removeEventListener('popstate', handlePopState)
      document.removeEventListener('click', handleClick, { capture: true })
    }
  }, [shouldBlock, router, pathname])

  const handleNavigationConfirm = () => {
    if (pendingNavigation) {
      pendingNavigation()
    }
    setPendingNavigation(null)
    setShowAlert(false)
  }

  return {
    showAlert,
    setShowAlert,
    pendingNavigation,
    handleNavigationConfirm,
  }
}
