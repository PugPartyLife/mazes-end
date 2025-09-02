import React from 'react'

export default function MetaRow({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={['mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-neutral-300', className ?? ''].join(' ')}>
      {children}
    </div>
  )
}

