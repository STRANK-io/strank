interface Props {
  width?: number
  height?: number
  className?: string
}

export default function StrankDefaultLogo({ width = 109, height = 80, className }: Props) {
  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <g clipPath="url(#clip0_218_118)">
        <path d="M27.2462 52.764H0V79.9924H27.2462V52.764Z" fill="#FF9619" />
        <path d="M108.992 52.764H81.7461V79.9924H108.992V52.764Z" fill="#FF9619" />
        <path
          d="M27.2461 52.764H43.3948C49.5246 52.764 54.4923 57.736 54.4923 63.8543V79.9924H27.2461V52.764Z"
          fill="#FF6331"
        />
        <path
          d="M54.5 25.528V41.6662C54.5 47.792 49.5247 52.7564 43.4025 52.7564H27.2538V25.528H54.5Z"
          fill="#FFCC3A"
        />
        <path
          d="M81.7461 80H54.4999V63.8619C54.4999 57.736 59.4751 52.7716 65.5974 52.7716H81.7461V80Z"
          fill="#FFCC3A"
        />
        <path
          d="M81.7461 25.5356V52.764H65.5974C59.4676 52.764 54.4999 47.792 54.4999 41.6738V25.5356H81.7461Z"
          fill="#FF6331"
        />
        <path d="M81.7461 52.764L95.373 66.382V80H81.7461V52.764Z" fill="#FFCC3A" />
        <path d="M54.5 66.382L68.1269 80H54.5V66.382Z" fill="#FF9619" />
        <path
          d="M43.4023 11.0902C49.5322 11.0902 54.4998 16.0547 54.4998 22.1805C54.4998 16.0547 59.4675 11.0902 65.5973 11.0902C59.4675 11.0902 54.4998 6.12582 54.4998 0C54.4998 6.12582 49.5322 11.0902 43.4023 11.0902Z"
          fill="#FF6331"
        />
      </g>
      <defs>
        <clipPath id="clip0_218_118">
          <rect width={width} height={height} fill="white" />
        </clipPath>
      </defs>
    </svg>
  )
}
