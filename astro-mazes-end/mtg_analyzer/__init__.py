"""
MTG Tournament Card Analysis Package

A card-centric approach to analyzing Magic: The Gathering tournament data.
Focuses on individual card usage, performance, and trends across tournaments.
"""

from .database import CardDatabase
from .parser import DecklistParser
from .models import CardEntry, ParsedDeck, CardStats, PlayerCardPreference, CommanderPairing
from .main import MTGAnalyzer, create_analyzer

__version__ = "1.0.0"
__author__ = "MTG Analysis Tools"

# Export main components
__all__ = [
    'MTGAnalyzer',
    'create_analyzer',
    'CardDatabase', 
    'DecklistParser',
    'CardEntry',
    'ParsedDeck',
    'CardStats',
    'PlayerCardPreference',
    'CommanderPairing'
]