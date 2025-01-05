interface RankingIconProps {
  className?: string
}

export default function RankingIcon({ className }: RankingIconProps) {
  return (
    <svg width="28" height="30" viewBox="0 0 28 30" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M8.45117 6.49995C11.5161 6.49995 13.9999 8.98216 13.9999 12.0451C13.9999 8.98216 16.4838 6.49995 19.5487 6.49995C16.4838 6.49995 13.9999 4.01774 13.9999 0.954834C13.9999 4.01774 11.5161 6.49995 8.45117 6.49995Z"
        className={className}
      />
      <rect y="18.0452" width="8" height="11" className={className} />
      <rect x="10" y="14.0452" width="8" height="15" className={className} />
      <rect x="20" y="23.0452" width="8" height="6" className={className} />
    </svg>
  )
}
