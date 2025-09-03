import React, { useEffect, useRef } from 'react'
import MtgCard from './MtgCard'
import type { DbUICard } from '../types'

export default function CardModal ({
  card,
  onClose
}: {
  card: DbUICard | null
  onClose: () => void
}) {
  const closeBtnRef = useRef<HTMLButtonElement | null>(null)

  useEffect(() => {
    if (!card) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    closeBtnRef.current?.focus()
    return () => window.removeEventListener('keydown', onKey)
  }, [card, onClose])

  if (!card) return null
  return (
    <div className='fixed inset-0 z-[70]'>
      <div
        className='absolute inset-0 bg-black/40 backdrop-blur-sm'
        onClick={onClose}
        aria-hidden='true'
      />
      <div className='absolute inset-0 grid place-items-center p-4'>
        <div
          role='dialog'
          aria-modal='true'
          aria-label={card?.name ?? 'Card'}
          className='relative w-full max-w-[min(92vw,32rem)]'
        >
          <button
            ref={closeBtnRef}
            onClick={onClose}
            className='absolute -top-10 right-0 text-neutral-200 hover:text-white text-sm cursor-pointer'
          >
            ✕ Close
          </button>
          <div className='overflow-visible'>
            <MtgCard card={card} showChips={false} />
          </div>
        </div>
      </div>
    </div>
  )
}
