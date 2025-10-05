import React from 'react'
// Import your SVG from assets - adjust the path and filename as needed
import LogoSVG from '../assets/learn-cedh-logo.svg?url'

export type LogoProps = {
  size?: number
  className?: string
}

/** Logo component that uses the SVG from assets */
export default function Logo({ size = 22, className = "" }: LogoProps) {
  return (
    <img 
      src={LogoSVG} 
      alt="Learn cEDH Logo"
      width={size}
      height={size}
      className={className}
    />
  )
}