interface DefaultUserIconProps {
  width?: number
  height?: number
}

export function DefaultUserIcon({ width = 94, height = 94 }: DefaultUserIconProps) {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 95 94"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="aspect-square"
    >
      <g clipPath="url(#clip0_967_312)">
        <path
          d="M47.5 94C73.4574 94 94.5 72.9574 94.5 47C94.5 21.0426 73.4574 0 47.5 0C21.5426 0 0.5 21.0426 0.5 47C0.5 72.9574 21.5426 94 47.5 94Z"
          fill="#FFD7A1"
        />
        <path
          d="M48.225 47.2584C54.1246 47.2584 58.9071 42.4759 58.9071 36.5763C58.9071 30.6768 54.1246 25.8943 48.225 25.8943C42.3255 25.8943 37.543 30.6768 37.543 36.5763C37.543 42.4759 42.3255 47.2584 48.225 47.2584Z"
          className="fill-brand-secondary"
        />
        <path
          d="M43.0547 51.7432H53.1584C61.7372 51.7432 68.7023 58.7083 68.7023 67.2871H27.5107C27.5107 58.7083 34.4759 51.7432 43.0547 51.7432Z"
          className="fill-brand-secondary"
        />
      </g>
      <defs>
        <clipPath id="clip0_967_312">
          <rect width="94" height="94" fill="white" transform="translate(0.5)" />
        </clipPath>
      </defs>
    </svg>
  )
}
