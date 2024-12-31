interface BackIconProps {
  className?: string
}

export default function BackIcon({ className }: BackIconProps) {
  return (
    <svg
      width="40"
      height="40"
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <g clipPath="url(#clip0_706_683)">
        <path d="M24 12L16 20L24 28" stroke="black" strokeWidth="2" />
      </g>
      <defs>
        <clipPath id="clip0_706_683">
          <rect width="40" height="40" fill="white" />
        </clipPath>
      </defs>
    </svg>
  )
}
