import React from 'react'

export default function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className='text-[11px] uppercase tracking-wide text-neutral-300'>
      {children}
    </div>
  )
}

