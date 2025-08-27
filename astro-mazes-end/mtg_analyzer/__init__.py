"""
MTG Tournament Card Analysis Package

A card-centric approach to analyzing Magic: The Gathering tournament data.
Focuses on individual card usage, performance, and trends across tournaments.
"""

from .sqlite_database import SQLiteCardDatabase
from .sqlite_main import SQLiteMTGAnalyzer, create_sqlite_analyzer
from .parser import DecklistParser
from .models import CardEntry, ParsedDeck, CardStats, PlayerCardPreference, CommanderPairing

__version__ = "1.0.0"
__author__ = "Connor Cameron"

# Export main components
__all__ = [
    'SQLiteMTGAnalyzer',
    'create_sqlite_analyzer',
    'SQLiteCardDatabase', 
    'DecklistParser',
    'CardEntry',
    'ParsedDeck',
    'CardStats',
    'PlayerCardPreference',
    'CommanderPairing'
]