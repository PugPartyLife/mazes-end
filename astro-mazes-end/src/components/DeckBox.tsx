import React, { useMemo, useState, useEffect, useCallback, useRef } from "react";
import MtgCard from "./MtgCard";
import ManaText from "./ManaText";

type Color = "W" | "U" | "B" | "R" | "G";

export type DeckBoxProps = {
  name: string;                          // deck name (linked + gradient)
  tournamentName?: string;               // neutral pill
  commanders: any[];                     // 1–2 Scryfall cards
  colors?: Color[];                      // optional explicit colors
  player?: string;

  // Optional DB-driven stats
  wins?: number;
  losses?: number;
  draws?: number;
  avgWinRate?: number;                   // 0–1 or 0–100, normalized below
  top8Count?: number;
  deckCount?: number;
  lastSeen?: string;

  cardCount?: number;
  deckUrl?: string;

  className?: string;
  peekWidth?: number;
  peekHeight?: number;
  onOpenCard?: (card: any) => void;
};

const COLOR_TINT: Record<Color | "C", string> = {
  W: "#F8F6D8",
  U: "#C1D7E9",
  B: "#CAC5C0",
  R: "#E49977",
  G: "#A3C095",
  C: "#D1D5DB",
};

function headerGradient(colors?: Color[]) {
  const cols = (colors?.length ? colors : ["C"]) as (Color | "C")[];
  if (cols.length === 1) {
    const c = COLOR_TINT[cols[0]];
    return { backgroundImage: `linear-gradient(180deg, ${c}, ${c})` };
  }
  const step = 100 / (cols.length - 1);
  const parts = cols.map((c, i) => `${COLOR_TINT[c]} ${Math.round(i * step)}%`).join(", ");
  return { backgroundImage: `linear-gradient(90deg, ${parts})` };
}

function pipsText(colors?: Color[]) {
  if (!colors || colors.length === 0) return "";
  return colors.map((c) => `{${c}}`).join("");
}

function deriveColorsFromCommanders(commanders: any[]): Color[] | undefined {
  const set = new Set<Color>();
  for (const c of commanders || []) {
    const ids: string[] = c?.color_identity || c?.colors || [];
    for (const k of ids) if (["W", "U", "B", "R", "G"].includes(k)) set.add(k as Color);
  }
  return set.size ? (Array.from(set) as Color[]) : undefined;
}

/** Shallow “peek” of a real MtgCard */
function CommanderPeek({
  card,
  width,
  height,
  tilt,
  onOpen,
  className,
  maskRatio = 0.78, // how much of the height remains visible (0..1)
}: {
  card: any;
  width: number;
  height: number;
  tilt: number;
  onOpen: (c: any) => void;
  className?: string;
  maskRatio?: number;
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`Open ${card?.name ?? 'card'}`}
      onClick={() => onOpen(card)}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onOpen(card)}
      className={`relative ${className ?? ''}`}
      style={{ width, height }}
    >
      <div
        className="absolute inset-0 overflow-hidden rounded-[1rem] shadow-2xl ring-1 ring-black/30 bg-transparent"
        style={{
          transform: `rotate(${tilt}deg)`,
          // show only the top portion of the real card; fade at the bottom
          WebkitMaskImage: `linear-gradient(180deg, #000 ${maskRatio * 100}%, rgba(0,0,0,0) 100%)`,
          maskImage: `linear-gradient(180deg, black ${maskRatio * 100}%, transparent 100%)`,
        }}
      >
        <div className="w-full">
          <MtgCard card={card} />
        </div>
      </div>
    </div>
  );
}


const DeckBox: React.FC<DeckBoxProps> = ({
  name,
  tournamentName,
  commanders,
  colors,
  player,
  wins = 0,
  losses = 0,
  draws = 0,
  avgWinRate,
  top8Count,
  deckCount,
  lastSeen,
  cardCount = 99,
  deckUrl = "https://topdeck.gg/deck/yXwMlmGU74ISJ9x5OdlP/cQ30wpoy0eSg7t80b79fgn07Wz62", // example
  className,
  onOpenCard,
  peekWidth = 260,
  peekHeight = 160,
}) => {
  const [open, setOpen] = useState<any | null>(null);
  const closeBtnRef = useRef<HTMLButtonElement | null>(null);

  const safeCommanders = Array.isArray(commanders) ? commanders.slice(0, 2) : [];
  const derivedColors = colors?.length ? colors : deriveColorsFromCommanders(safeCommanders);
  const pips = pipsText(derivedColors);
  const gradientStyle = useMemo(() => headerGradient(derivedColors), [derivedColors]);

  // Normalize winrate (prefer DB avg, fallback to record)
  const games = wins + losses + draws;
  const fromRecord = games > 0 ? (wins / games) * 100 : undefined;
  const normalizedAvg = typeof avgWinRate === "number" ? (avgWinRate <= 1 ? avgWinRate * 100 : avgWinRate) : undefined;
  const winrate = Math.round((normalizedAvg ?? fromRecord ?? 0));

  // Reserve enough vertical space for the visible slice, plus tilt/shadow padding
  const MASK_RATIO = 0.78;           // must match CommanderPeek default
  const SHADOW_PAD = 16;             // extra space for tilt & shadow
  const peekZone = Math.ceil(peekHeight * MASK_RATIO) + SHADOW_PAD;
  const paddingTop = peekZone + 16;  // header breathing room

  const handleOpen = useCallback(
    (c: any) => {
      setOpen(c);
      onOpenCard?.(c);
    },
    [onOpenCard],
  );

  // ESC to close
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (open) closeBtnRef.current?.focus();
  }, [open]);

  return (
    <>
      {/* Keep grid space when modal open, but hide visually */}
      <div
        className={[
          "relative w-full max-w-[25rem] sm:max-w-[26rem]",
          "rounded-3xl overflow-visible",
          "bg-neutral-900/92 backdrop-blur",
          "shadow-[0_15px_40px_rgba(0,0,0,.55)] ring-1 ring-neutral-800",
          "px-4 sm:px-5 pb-4 sm:pb-5",
          open ? "invisible" : "",
          className ?? "",
        ].join(" ")}
        style={{ paddingTop }}
        aria-hidden={!!open}
      >
        {/* Commander peeks (inside reserved zone, lower z-index) */}
        <div
          className="absolute inset-x-0 z-0 flex justify-center gap-4 items-start"
          style={{ top: 8, height: peekZone }}
        >
          {safeCommanders.length ? (
            safeCommanders.map((c, i) => (
              <CommanderPeek
                key={c?.id ?? i}
                card={c}
                width={peekWidth}
                height={peekHeight}
                tilt={i === 0 ? -2 : 2}
                onOpen={handleOpen}
                maskRatio={MASK_RATIO}
                className={i === 1 ? "translate-y-[6px]" : ""}
              />
            ))
          ) : (
            <div className="text-sm text-neutral-400">No commander data</div>
          )}
        </div>

        {/* CONTENT (higher z-index so it always sits above the peeks) */}
        <div className="relative z-[1]">
          {/* Deck name (gradient + pips) */}
          <div
            className="rounded-xl border border-neutral-700/60 px-3 py-2 mb-3 text-neutral-900 shadow-inner"
            style={gradientStyle}
          >
            <div className="flex items-start justify-between gap-2">
              <a
                href={deckUrl}
                target="_blank"
                rel="noopener noreferrer"
                title={name}
                className="min-w-0 font-semibold leading-snug text-sm sm:text-[15px] hover:opacity-90 hover:underline underline-offset-2"
                style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}
              >
                {name}
              </a>
              {pips && (
                <div className="shrink-0 translate-y-0.5">
                  <ManaText text={pips} size={16} gap={2} inline />
                </div>
              )}
            </div>
          </div>

          {/* Tournament (neutral pill, unchanged) */}
          {tournamentName && (
            <div className="rounded-xl border border-neutral-700/60 bg-neutral-800/70 px-3 py-2 mb-4">
              <div className="text-[11px] uppercase tracking-wide text-neutral-300 mb-1">Tournament</div>
              <p
                className="text-sm sm:text-[15px] font-semibold leading-snug text-neutral-100"
                title={tournamentName}
                style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}
              >
                {tournamentName}
              </p>
            </div>
          )}

          {/* Player */}
          <div className="mb-3 flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-neutral-700 text-neutral-200 grid place-items-center text-xs font-bold">
              {(player ?? "?").toString().slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="text-[11px] uppercase tracking-wide text-neutral-400">Player</div>
              <div className="text-sm sm:text-base font-medium text-neutral-300 truncate">
                {player ?? "Unknown"}
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-4 text-neutral-200">
            <div className="col-span-2">
              <div className="flex items-end justify-between">
                <span className="text-[11px] uppercase tracking-wide text-neutral-400">Winrate</span>
                <span className="text-[11px] font-semibold">{winrate}%</span>
              </div>
              <div className="mt-1 h-2 w-full rounded-full bg-neutral-800 overflow-hidden">
                <div
                  className="h-full rounded-full bg-emerald-500"
                  style={{ width: `${Math.min(100, Math.max(0, winrate))}%`, transition: "width .35s ease" }}
                />
              </div>
            </div>

            <div>
              <div className="text-[11px] uppercase tracking-wide text-neutral-400">Top 8</div>
              <div className="text-sm font-semibold">{top8Count ?? "—"}</div>
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-wide text-neutral-400">Decks</div>
              <div className="text-sm font-semibold">{deckCount ?? "—"}</div>
            </div>

            <div>
              <div className="text-[11px] uppercase tracking-wide text-neutral-400">Cards</div>
              <div className="text-sm font-semibold">{cardCount}</div>
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-wide text-neutral-400">Last seen</div>
              <div className="text-sm font-semibold">
                {lastSeen ? new Date(lastSeen).toLocaleDateString() : "—"}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal with full MtgCard */}
      {open && (
        <div className="fixed inset-0 z-[70]">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setOpen(null)}
            aria-hidden="true"
          />
          <div className="absolute inset-0 grid place-items-center p-4">
            <div role="dialog" aria-modal="true" aria-label={open?.name ?? "Card"} className="relative w-full max-w-[min(92vw,32rem)]">
              <button ref={closeBtnRef} onClick={() => setOpen(null)} className="absolute -top-10 right-0 text-neutral-200 hover:text-white text-sm">
                ✕ Close
              </button>
              <div className="rounded-2xl overflow-hidden">
                <MtgCard card={open} />
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default DeckBox;
