interface Props {
  width?: number
  height?: number
  className?: string
}

export default function StravaLogo({ width = 120, height = 120, className }: Props) {
  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <g clipPath="url(#clip0_224_2679)">
        <path d="M120 0H0V120H120V0Z" fill="#FC6C26" />
        <path
          d="M55.6975 14.4413H54.665H53.6325L27.6348 66.231H42.9028L54.665 45.5981L66.4273 66.231H81.6953L55.6975 14.4413Z"
          fill="#FEFEFE"
        />
        <path
          d="M81.6948 66.231L74.0591 80.7821L66.4269 66.231H55.752L73.4726 104.578L73.9254 105.562H74.1929L74.6491 104.578L92.3697 66.231H81.6948Z"
          fill="#FEB28E"
        />
      </g>
      <defs>
        <clipPath id="clip0_224_2679">
          <rect width={width} height={height} rx="40" fill="white" />
        </clipPath>
      </defs>
    </svg>
  )
}
