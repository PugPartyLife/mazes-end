"""
Database models and data structures for card-centric MTG tournament analysis.
"""

from dataclasses import dataclass
from typing import Dict, List, Optional
from datetime import datetime, date


@dataclass
class CardEntry:
    """Represents a single card entry in a deck."""
    card_name: str
    card_id: Optional[str]
    quantity: int
    section: str  # 'Commanders', 'Mainboard', 'Sideboard', etc.


@dataclass
class ParsedDeck:
    """Represents a parsed deck with all its cards."""
    tournament_id: str
    player_id: Optional[str]
    player_name: str
    standing: int
    wins: int
    losses: int
    draws: int
    wins_swiss: int
    losses_swiss: int  
    wins_bracket: int
    losses_bracket: int
    win_rate: float
    byes: int
    decklist_raw: str
    commanders: List[str]
    deck_colors: str
    card_entries: List[CardEntry]


@dataclass
class CardStats:
    """Card statistics summary."""
    card_name: str
    total_entries: int
    total_decks: int
    total_tournaments: int
    avg_win_rate: float
    avg_standing: float
    first_seen: date
    last_seen: date


@dataclass
class PlayerCardPreference:
    """Player's preference for a specific card."""
    player_name: str
    card_name: str
    times_played: int
    tournaments_played: int
    avg_performance: float
    last_played: date


@dataclass
class CommanderPairing:
    """Commander combination data."""
    commander_1: str
    commander_2: Optional[str]
    deck_count: int
    avg_win_rate: float
    tournament_format: str
    last_seen: date