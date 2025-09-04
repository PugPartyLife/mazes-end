import React from 'react'

export type LogoProps = React.SVGProps<SVGSVGElement> & {
  size?: number
}

/** Gothic arch logo used for brand + favicon */
export default function Logo({ size = 22, className, ...rest }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
      {...rest}
    >
      {/* Outer pointed arch + base */}
      <path d="M4 20V11q4-6 8-7 4 1 8 7v9M4 20h16" />
      {/* Inner arch */}
      <path d="M7 20v-8q2.5-4 5-5 2.5 1 5 5v8" />
      {/* Tracery mullions + roundels */}
      <path d="M12 13v7M9.5 14v6M14.5 14v6" />
      <circle cx="12" cy="11.2" r="0.9" />
      <circle cx="9.8" cy="12.2" r="0.8" />
      <circle cx="14.2" cy="12.2" r="0.8" />
    </svg>
  )
}

