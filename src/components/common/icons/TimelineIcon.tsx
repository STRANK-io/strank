interface TimelineIconProps {
  className?: string
}

export default function TimelineIcon({ className }: TimelineIconProps) {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="14" cy="14" r="14" className={className} />
      <path
        d="M14 5.5V14L9 17.5"
        className="stroke-white"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
