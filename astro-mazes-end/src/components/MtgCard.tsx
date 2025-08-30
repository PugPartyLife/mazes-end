import React from 'react'
import ManaText from '../components/ManaText'
import CardStats from '../components/CardStats'

type MtgCardProps = {
  card: any
  index?: number | string
}

/** Safely pull face-aware fields (works for DFC/MDFC and single-faced) */
function faceField<T = any> (card: any, key: string, fallback: T = '' as T): T {
  if (card?.[key] != null) return card[key] as T
  if (Array.isArray(card?.card_faces) && card.card_faces[0]?.[key] != null) {
    return card.card_faces[0][key] as T
  }
  return fallback
}

/** First available art image */
function getArt (card: any): string | undefined {
  return (
    card?.image_uris?.art_crop ||
    card?.image_uris?.normal ||
    card?.image_uris?.large ||
    card?.card_faces?.[0]?.image_uris?.art_crop ||
    card?.card_faces?.[0]?.image_uris?.normal ||
    card?.card_faces?.[0]?.image_uris?.large
  )
}

function cardColor (card: any): string {
  const colors = card?.colors || []
  if (colors.length === 0) return '#c0bcaa'
  if (colors.length === 1) {
    switch (colors[0]) {
      case 'W':
        return 'border-[#d8c89a]'
      case 'U':
        return 'border-[#d8c89a]'
      case 'B':
        return 'border-[#8a837c]'
      case 'R':
        return 'border-[#ce8f72]'
      case 'G':
        return 'border-[#b0c4b7]'
      default:
        return 'border-[#c0bcaa]'
    }
  }
  // if legendary and multicolor, return gold
  if (card?.type_line?.includes('Legendary') && colors.length > 1) return 'border-me-yellow'
  return 'border-[#c0bcaa]'
}

/** Inline renderer that injects <ManaText> for tokens like {2}, {W}, {U/B}, etc. */
function InlineMana ({ text }: { text: string }) {
  if (!text) return null
  const parts = text.split(/(\{[^}]+\})/g).filter(Boolean)
  return (
    <>
      {parts.map((p, i) =>
        p.startsWith('{') && p.endsWith('}') ? (
          <ManaText key={`${p}-${i}`} text={p} size={14} gap={1} inline />
        ) : (
          <span key={`t-${i}`}>{p}</span>
        )
      )}
    </>
  )
}

export default function MtgCard ({
  card,
  index
}: MtgCardProps): React.JSX.Element {
  const name = faceField<string>(card, 'name', card?.name || '')
  const manaCost = faceField<string>(card, 'mana_cost', '')
  const typeLine = faceField<string>(card, 'type_line', '')
  const oracleText = faceField<string>(card, 'oracle_text', '')
  const flavorText = faceField<string>(card, 'flavor_text', '')
  const artist = faceField<string>(card, 'artist', '')
  const power = faceField<string>(card, 'power', '')
  const toughness = faceField<string>(card, 'toughness', '')
  const loyalty = faceField<string>(card, 'loyalty', '')
  const artSrc = getArt(card)
  const cardColorClass = cardColor(card)

  const hasPT = power && toughness
  const hasLoyalty = !!loyalty

  // Split oracle text by lines; MTG uses line breaks for abilities/keywords
  const oracleLines = oracleText ? oracleText.split('\n') : []

  return (
    <div
      key={index}
      // Add correct color of card border.
      className={`relative aspect-[63/88] w-full max-w-sm mx-auto rounded-[1.25rem] shadow-2xl overflow-hidden pb-10 bg-neutral-900 border-2 ${cardColor(card)}`}
      style={{
        // little inner bevel to mimic a frame
        boxShadow:
          'inset 0 0 0 2px rgba(255,255,255,0.05), 0 10px 30px rgba(0,0,0,0.6)'
      }}
    >
      {/* Inner frame */}
      <div className='absolute inset-0 rounded-[1rem] overflow-hidden flex flex-col'>
        {/* Top bar: Name (left), Mana Cost (right) */}
        <div className='flex items-start justify-between gap-2 px-3 pt-2 pb-1  to-transparent'>
          <h3 className='font-serif font-bold text-base sm:text-lg text-neutral-100 leading-tight truncate'>
            {name}
          </h3>
          {manaCost ? (
            <div className='shrink-0 translate-y-[2px]'>
              <ManaText text={manaCost} size={16} gap={2} inline />
            </div>
          ) : null}
        </div>

        {/* Art window */}
        <div className='px-3'>
          <div className='relative w-full rounded-md overflow-hidden border border-neutral-700/70 bg-neutral-100'>
            <div className='w-full h-48 sm:h-56 md:h-64'>
              {artSrc ? (
                <img
                  src={artSrc}
                  alt={name}
                  className='w-full h-full object-cover'
                  loading='lazy'
                  decoding='async'
                />
              ) : (
                <div className='w-full h-full grid place-items-center text-neutral-100 text-sm'>
                  No art available
                </div>
              )}
            </div>
            {/* Card stats (power, cost, popularity, difficulty, salt) */}
            {/* Random values for demo purposes */}
            <div className='absolute top-2 left-2 bg-black/50 rounded-4xl p-1'>
              <CardStats
                size={88}
                values={{
                  power: Math.floor(Math.random() * 10) + 1,
                  cost: Math.floor(Math.random() * 10) + 1,
                  popularity: Math.floor(Math.random() * 10) + 1,
                  difficulty: Math.floor(Math.random() * 10) + 1,
                  salt: Math.floor(Math.random() * 10) + 1
                }}
                max={10}
                rings={4}
                padding={10}
                showLabels={false} // toggle if you want labels on-card
              />
            </div>
          </div>
        </div>

        {/* Type line */}
        <div className='mt-1 px-3'>
          <div className='rounded-sm border border-neutral-700/70 bg-neutral-900/70 px-2 py-1'>
            <p className='text-[13px] sm:text-sm text-neutral-200 tracking-wide'>
              {typeLine}
            </p>
          </div>
        </div>

        {/* Rules box + P/T or Loyalty */}
        <div className="relative mt-2 px-3 pb-3 flex-1">
          <div className='relative rounded-md border border-neutral-700/70 bg-[#f7f2e7] text-neutral-900 px-3 py-2 min-h-[112px]'>
            {/* Rules text */}
            <div className='space-y-1.5 text-[13px] leading-5'>
              {oracleLines.length ? (
                oracleLines.map((line, i) => (
                  <p key={i}>
                    <InlineMana text={line} />
                  </p>
                ))
              ) : (
                <p className='text-neutral-500 italic'>—</p>
              )}
            </div>

            {/* Flavor text */}
            {flavorText ? (
              <>
                <div className='my-2 border-t border-neutral-300/70' />
                <p className='text-[13px] italic text-neutral-700 leading-5'>
                  {flavorText}
                </p>
              </>
            ) : null}

            {/* P/T or Loyalty box (bottom-right) */}
            {(hasPT || hasLoyalty) && (
              <div className='absolute -bottom-2 -right-2'>
                <div className='rounded-md bg-neutral-900 text-neutral-100 border border-neutral-700 px-2 py-1 shadow'>
                  <span className='text-sm font-semibold tracking-wide'>
                    {hasPT ? `${power}/${toughness}` : `Loyalty ${loyalty}`}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer: Artist credit */}
        {(artist || card?.set_name) && (
          <div className="px-3 pb-2 pt-1 mt-auto flex items-center justify-between text-[11px] text-neutral-500">
            <div className='truncate'>
              {artist ? <span>Illus. {artist}</span> : <span>&nbsp;</span>}
            </div>
            <div className='truncate'>
              {card?.set_name ? <span>{card.set_name}</span> : null}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
