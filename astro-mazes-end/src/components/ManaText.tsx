import React, { useMemo } from "react";
import { symbols as magicSymbols } from "../data/magicSymbols";

type ManaTextProps = {
  /** String containing MTG mana symbols, e.g. "{2}{W}" or "{U}{B}{R}" */
  text: string;
  /** Pixel size for each icon (width & height). Defaults to 18 */
  size?: number;
  /** Gap in pixels between icons. Defaults to 2 */
  gap?: number;
  /** Optional className for the outer wrapper */
  className?: string;
  /** If true, renders inline (span). Otherwise, wraps in a div */
  inline?: boolean;
};

/**
 * Build a lookup map from symbol text (e.g. "{W}") -> { svg_uri, english }.
 * Also indexes loose variants and gatherer alternates (wrapped in braces when possible).
 */
function useSymbolIndex() {
  return useMemo(() => {
    type Entry = { svg_uri: string; english?: string };
    const index = new Map<string, Entry>();

    const data = (magicSymbols?.data ?? []) as Array<{
      symbol: string;
      svg_uri: string;
      english?: string;
      loose_variant?: string | null;
      gatherer_alternates?: string[] | null;
    }>;

    for (const s of data) {
      if (s.symbol && s.svg_uri) {
        index.set(s.symbol, { svg_uri: s.svg_uri, english: s.english });
      }

      // If loose_variant exists (e.g. "W"), also allow "{W}"
      if (s.loose_variant) {
        const braceKey = `{${s.loose_variant}}`;
        if (!index.has(braceKey)) {
          index.set(braceKey, { svg_uri: s.svg_uri, english: s.english });
        }
      }

      // Gatherer alternates like "oW" — try both raw and braced "{oW}"
      if (Array.isArray(s.gatherer_alternates)) {
        for (const alt of s.gatherer_alternates) {
          if (alt) {
            if (!index.has(alt)) {
              index.set(alt, { svg_uri: s.svg_uri, english: s.english });
            }
            const altBraced = `{${alt}}`;
            if (!index.has(altBraced)) {
              index.set(altBraced, { svg_uri: s.svg_uri, english: s.english });
            }
          }
        }
      }
    }

    return index;
  }, []);
}

/**
 * Replace tokens like "{2}{W}" with <img> icons sourced from Scryfall.
 */
const ManaText: React.FC<ManaTextProps> = ({
  text,
  size = 18,
  gap = 2,
  className,
  inline = true,
}) => {
  const index = useSymbolIndex();

  // Split into tokens that are either "{...}" or plain text
  const parts = useMemo(() => {
    // This keeps the braces groups while preserving text between them
    // e.g. "Costs {2}{W} to cast" -> ["Costs ", "{2}", "{W}", " to cast"]
    return text.split(/(\{[^}]+\})/g).filter(Boolean);
  }, [text]);

  const Wrapper: React.ElementType = inline ? "span" : "div";

  return (
    <Wrapper
      className={className}
      style={{
        display: inline ? "inline-flex" : "flex",
        alignItems: "center",
        flexWrap: "wrap",
        gap,
        lineHeight: 1, // tighter alignment with icons
      }}
    >
      {parts.map((part, i) => {
        if (part.startsWith("{") && part.endsWith("}")) {
          const entry = index.get(part);
          // Fallback: try to normalize whitespace within braces, e.g. "{ W }"
          const normalized =
            entry ??
            index.get(`{${part.slice(1, -1).trim()}}`) ??
            null;

          if (normalized) {
            return (
              <img
                key={`${part}-${i}`}
                src={normalized.svg_uri}
                alt={normalized.english ?? part}
                title={normalized.english ?? part}
                width={size}
                height={size}
                style={{
                  display: "inline-block",
                  width: size,
                  height: size,
                  verticalAlign: "middle",
                  // Scryfall symbols are square and transparent; no extra styling needed.
                }}
                loading="lazy"
                decoding="async"
              />
            );
          }
          // Unknown token — render raw text so you can spot issues
          return (
            <span key={`${part}-${i}`} style={{ whiteSpace: "pre" }}>
              {part}
            </span>
          );
        }

        // Plain text between symbols
        return (
          <span key={`txt-${i}`} style={{ whiteSpace: "pre-wrap" }}>
            {part}
          </span>
        );
      })}
    </Wrapper>
  );
};

export default ManaText;
