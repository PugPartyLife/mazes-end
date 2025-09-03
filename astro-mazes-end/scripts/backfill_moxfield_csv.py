#!/usr/bin/env python3
"""
Backfill deck_cards from moxfield_to_scryfall_rows.csv into the local SQLite DB.

Heuristic matching for each CSV row:
- Match decks by player_name (case-insensitive) and commander pair (order-insensitive) when present.
- If multiple candidates, pick by smallest date distance between CSV.created_at and tournament.start_date.
- Only fills decks that currently have zero deck_cards rows (safe by default).

Usage:
  python scripts/backfill_moxfield_csv.py \
    --db astro-mazes-end/test.db \
    --csv astro-mazes-end/src/data/moxfield_to_scryfall_rows.csv \
    [--limit 1000]

Requires only Python stdlib.
"""
from __future__ import annotations

import argparse
import csv
import json
import os
import re
import sqlite3
from dataclasses import dataclass
from datetime import datetime
from typing import Dict, List, Optional, Tuple


@dataclass
class CsvRow:
    created_at: Optional[datetime]
    player_name: str
    deck_link: Optional[str]
    scryfall_card_id: Optional[str]
    decklist_text: Optional[str]
    deckobj_json: Optional[str]


def parse_csv_row(row: Dict[str, str]) -> CsvRow:
    created_raw = row.get('created_at') or ''
    created_at: Optional[datetime] = None
    if created_raw:
        try:
            # Accept ISO or space-separated with TZ
            created_at = datetime.fromisoformat(created_raw.replace('Z', '+00:00'))
        except Exception:
            created_at = None
    return CsvRow(
        created_at=created_at,
        player_name=(row.get('player_name') or '').strip(),
        deck_link=(row.get('deck_link') or '').strip() or None,
        scryfall_card_id=(row.get('scryfall_card_id') or '').strip() or None,
        decklist_text=row.get('topdeck_decklist') or None,
        deckobj_json=row.get('topdeck_deckobj') or None,
    )


def norm_name(s: Optional[str]) -> str:
    if not s:
        return ''
    # Normalize quotes/dashes
    s = s.replace('\u2019', "'").replace('\u2018', "'")
    s = s.replace('\u2013', '-').replace('\u2014', '-')
    return re.sub(r'\s+', ' ', s.strip()).lower()


def extract_cards_from_deckobj(obj: Dict) -> List[Tuple[str, int, str]]:
    cards: List[Tuple[str, int, str]] = []
    # Expect sections like { "Commanders": { name: { id, count } }, "Mainboard": { ... } }
    for section, payload in obj.items():
        if not isinstance(payload, dict):
            continue
        if section.lower().startswith('commander'):
            section_name = 'Commander'
        elif section.lower().startswith('main'):
            section_name = 'mainboard'
        elif section.lower().startswith('side'):
            section_name = 'sideboard'
        else:
            section_name = 'mainboard'
        for name, meta in payload.items():
            if not isinstance(meta, dict):
                continue
            q = int(meta.get('count') or meta.get('quantity') or 1)
            if name:
                cards.append((name, q, section_name))
    return cards


def extract_commanders_from_list(text: str) -> List[str]:
    commanders: List[str] = []
    # Unescape/normalize
    text = text.replace('\r\n', '\n').replace('\r', '\n').replace('\\r\\n', '\n').replace('\\n', '\n')
    lines = [ln.strip() for ln in text.split('\n')]
    in_cmd = False
    for ln in lines:
        if not ln:
            continue
        if ln.lower().startswith('~~command') or ln.lower().startswith('commander'):
            in_cmd = True
            continue
        if ln.lower().startswith('~~main') or ln.lower().startswith('mainboard') or ln.lower().startswith('maindeck'):
            in_cmd = False
        if in_cmd:
            if ln.startswith('1 '):
                nm = re.sub(r'^\s*1\s+', '', ln)
                nm = re.sub(r'\s*[\(\[][\w\d]+[\)\]]\s*\d*\s*$', '', nm).strip()
                if nm:
                    commanders.append(nm)
            else:
                # Some formats list plain names
                nm = ln.strip(' -')
                if nm:
                    commanders.append(nm)
    return commanders[:2]


def extract_cards_from_list(text: str) -> List[Tuple[str, int, str]]:
    text = text.replace('\r\n', '\n').replace('\r', '\n').replace('\\r\\n', '\n').replace('\\n', '\n')
    lines = [ln.strip() for ln in text.split('\n')]
    section = 'mainboard'
    out: List[Tuple[str, int, str]] = []
    for ln in lines:
        if not ln:
            continue
        if ln.lower().startswith('~~command') or ln.lower() in ('commander:', 'commanders:'):
            section = 'Commander'
            continue
        if ln.lower().startswith('~~main') or ln.lower() in ('maindeck:', 'deck:', 'mainboard:'):
            section = 'mainboard'
            continue
        if ln.lower().startswith('~~side') or ln.lower() == 'sideboard:':
            section = 'sideboard'
            continue
        if ln.startswith('//') or ln.startswith('#') or ln == '---' or ln.lower().startswith('imported from '):
            continue
        m = re.match(r'^(\d+)x?\s+(.+)$', ln)
        if m:
            q = int(m.group(1))
            nm = m.group(2)
            nm = re.sub(r'\s*[\(\[][\w\d]+[\)\]]\s*\d*\s*$', '', nm)
            nm = re.sub(r'\s+\d+\s*$', '', nm).strip()
            if nm:
                out.append((nm, q, section))
    return out


def find_deck_id(conn: sqlite3.Connection, player_name: str, commanders: List[str], created_at: Optional[datetime]) -> Optional[str]:
    cur = conn.cursor()
    cur.execute(
        """
        SELECT d.deck_id, d.commander_1, d.commander_2, COALESCE(t.start_date, d.created_at) AS seen_at
        FROM decks d
        LEFT JOIN tournaments t ON t.tournament_id = d.tournament_id
        WHERE LOWER(d.player_name) = LOWER(?)
        """,
        (player_name,)
    )
    rows = cur.fetchall()
    if not rows:
        return None

    cmd_norm = {norm_name(c) for c in commanders if c}

    best: Tuple[int, float, str] | None = None  # (score, abs_days, deck_id)
    for deck_id, c1, c2, seen_at in rows:
        dset = {norm_name(c1), norm_name(c2)} - {''}
        score = 0
        if cmd_norm:
            if dset == cmd_norm:
                score += 3
            elif cmd_norm & dset:
                score += 1
        else:
            score += 0
        abs_days = 999999.0
        if created_at and seen_at:
            try:
                # when might be text; try parse
                dt = None
                if isinstance(seen_at, str):
                    try:
                        dt = datetime.fromisoformat(seen_at.replace('Z', '+00:00'))
                    except Exception:
                        dt = None
                elif isinstance(seen_at, (datetime,)):
                    dt = seen_at
                if dt:
                    abs_days = abs((dt - created_at).total_seconds()) / 86400.0
            except Exception:
                pass
        # Prefer decks with zero deck_cards already
        cur2 = conn.cursor()
        cur2.execute("SELECT COUNT(*) FROM deck_cards WHERE deck_id = ?", (deck_id,))
        cnt = cur2.fetchone()[0]
        if cnt == 0:
            score += 1
        cand = (score, abs_days, deck_id)
        if best is None or cand > best or (cand[0] == best[0] and cand[1] < best[1]):
            best = cand

    return best[2] if best else None


def backfill(db_path: str, csv_path: str, limit: Optional[int] = None) -> None:
    if not os.path.exists(db_path):
        raise SystemExit(f"DB not found: {db_path}")
    if not os.path.exists(csv_path):
        raise SystemExit(f"CSV not found: {csv_path}")

    conn = sqlite3.connect(db_path)
    conn.execute('PRAGMA foreign_keys = ON')

    inserted = 0
    matched = 0
    skipped = 0
    total = 0

    with open(csv_path, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            total += 1
            if limit and total > limit:
                break
            rec = parse_csv_row(row)
            # Prefer deckobj; fallback to text
            cards: List[Tuple[str, int, str]] = []
            commanders: List[str] = []
            if rec.deckobj_json:
                try:
                    obj = json.loads(rec.deckobj_json)
                    cards = extract_cards_from_deckobj(obj)
                    commanders = [nm for nm, _, sec in cards if sec == 'Commander'][:2]
                except Exception:
                    cards = []
            if not cards and rec.decklist_text:
                cards = extract_cards_from_list(rec.decklist_text)
                commanders = extract_commanders_from_list(rec.decklist_text)

            if not cards:
                skipped += 1
                continue

            deck_id = find_deck_id(conn, rec.player_name, commanders, rec.created_at)
            if not deck_id:
                skipped += 1
                continue

            matched += 1
            # Only backfill if empty
            cur = conn.cursor()
            cur.execute("SELECT COUNT(*) FROM deck_cards WHERE deck_id = ?", (deck_id,))
            if cur.fetchone()[0] == 0:
                for name, qty, section in cards:
                    # Ensure card exists minimally to satisfy FK
                    cur.execute("INSERT OR IGNORE INTO cards (card_name) VALUES (?)", (name,))
                    cur.execute(
                        """
                        INSERT OR REPLACE INTO deck_cards (deck_id, card_name, quantity, deck_section)
                        VALUES (?, ?, ?, ?)
                        """,
                        (deck_id, name, int(qty or 1), section)
                    )
                # Mark as having a decklist
                cur.execute("UPDATE decks SET has_decklist = 1 WHERE deck_id = ?", (deck_id,))
                conn.commit()
                inserted += 1

            # Lightweight progress heartbeat every 200 rows
            if total % 200 == 0:
                print(
                    f"Processing… rows={total} matched={matched} filled={inserted} skipped={skipped}",
                    end='\r', flush=True
                )

    # Ensure progress line doesn't overwrite final summary
    print()
    print(f"Processed rows: {total}")
    print(f"Matched decks:  {matched}")
    print(f"Decks filled:   {inserted}")
    print(f"Rows skipped:   {skipped}")


def main():
    ap = argparse.ArgumentParser(description='Backfill deck_cards from Moxfield CSV')
    ap.add_argument('--db', default='astro-mazes-end/test.db', help='Path to SQLite DB (default: astro-mazes-end/test.db)')
    ap.add_argument('--csv', default='astro-mazes-end/src/data/moxfield_to_scryfall_rows.csv', help='CSV path')
    ap.add_argument('--limit', type=int, default=None, help='Limit rows for a dry run')
    args = ap.parse_args()
    backfill(args.db, args.csv, args.limit)


if __name__ == '__main__':
    main()
