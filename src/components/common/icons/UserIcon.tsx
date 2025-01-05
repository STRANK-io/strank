interface UserIconProps {
  className?: string
}

export default function UserIcon({ className }: UserIconProps) {
  return (
    <svg width="26" height="26" viewBox="0 0 26 26" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M13 13C16.5898 13 19.5 10.0899 19.5 6.5C19.5 2.91015 16.5898 0 13 0C9.41015 0 6.5 2.91015 6.5 6.5C6.5 10.0899 9.41015 13 13 13Z"
        className={className}
      />
      <path
        d="M9.81129 15.5999H16.1887C21.6036 15.5999 26 20.26 26 25.9999H0C0 20.26 4.39638 15.5999 9.81129 15.5999Z"
        className={className}
      />
    </svg>
  )
}
