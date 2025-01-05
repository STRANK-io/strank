interface ReportIconProps {
  className?: string
}

export default function ReportIcon({ className }: ReportIconProps) {
  return (
    <svg width="24" height="30" viewBox="0 0 24 30" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="24" height="30" className={className} />
      <rect x="4" y="11" width="4" height="15" className="fill-white" />
      <path d="M10 15H14V26H10V15Z" className="fill-white" />
      <rect x="16" y="20" width="4" height="6" className="fill-white" />
    </svg>
  )
}
