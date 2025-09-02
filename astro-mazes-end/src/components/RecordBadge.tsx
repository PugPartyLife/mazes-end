import React from 'react'

export default function RecordBadge ({
  wins,
  losses,
  draws
}: {
  wins: number
  losses: number
  draws: number
}) {
  const pill = (label: string, value: number, color: string) => (
    <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[12px] ring-1 ${color}`}>
      <span className='font-semibold'>{value}</span>
      <span className='opacity-80'>{label}</span>
    </div>
  )
  return (
    <div className='flex items-center gap-2'>
      {pill('W', wins, 'bg-green-600/15 text-green-300 ring-green-500/40')}
      {pill('L', losses, 'bg-red-600/15 text-red-300 ring-red-500/40')}
      {pill('D', draws, 'bg-blue-600/15 text-blue-300 ring-blue-500/40')}
    </div>
  )
}

