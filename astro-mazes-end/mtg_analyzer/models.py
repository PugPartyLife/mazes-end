"""
Database models and data structures for card-centric MTG tournament analysis.
Refactored to match the comprehensive schema design.
"""

from dataclasses import dataclass, field
from typing import Dict, List, Optional, Any
from datetime import datetime
import json


@dataclass
class CardType:
    """Represents a card type classification."""
    type_name: str
    type_plural: str
    description: Optional[str] = None


@dataclass
class Tournament:
    """Tournament data from TopDeck API."""
    tournament_id: str
    tournament_name: Optional[str]
    game: str = 'Magic: The Gathering'
    format: str = 'EDH'
    start_date: Optional[datetime] = None
    swiss_rounds: Optional[int] = None
    top_cut: Optional[int] = None
    total_players: Optional[int] = None
    location_city: Optional[str] = None
    location_state: Optional[str] = None
    location_venue: Optional[str] = None
    has_decklists: bool = False
    created_at: datetime = field(default_factory=datetime.now)


@dataclass
class Player:
    """Player information and lifetime stats."""
    player_id: str
    player_name: str
    discord_username: Optional[str] = None
    discord_id: Optional[str] = None
    total_tournaments: int = 0
    first_seen: datetime = field(default_factory=datetime.now)
    last_seen: datetime = field(default_factory=datetime.now)


@dataclass
class Deck:
    """Individual deck entry for a tournament."""
    deck_id: str
    tournament_id: str
    player_id: Optional[str]
    player_name: str
    standing: Optional[int] = None
    wins: int = 0
    losses: int = 0
    draws: int = 0
    wins_swiss: int = 0
    losses_swiss: int = 0
    wins_bracket: int = 0
    losses_bracket: int = 0
    win_rate: float = 0.0
    byes: int = 0
    
    # Raw decklist storage
    decklist_raw: Optional[str] = None
    decklist_parsed: bool = False
    
    # Commander information
    commander_1: Optional[str] = None
    commander_2: Optional[str] = None  # For partner commanders
    deck_colors: Optional[str] = None  # WUBRG format
    
    has_decklist: bool = False
    created_at: datetime = field(default_factory=datetime.now)


@dataclass
class Card:
    """Enhanced card information from Scryfall API."""
    card_name: str
    scryfall_id: Optional[str] = None
    
    # Core card data
    mana_cost: Optional[str] = None
    cmc: Optional[int] = None
    type_line: Optional[str] = None
    oracle_text: Optional[str] = None
    power: Optional[str] = None
    toughness: Optional[str] = None
    
    # Color information (stored as JSON strings)
    colors: Optional[str] = None  # JSON array
    color_identity: Optional[str] = None  # JSON array
    
    # Multi-face card support
    layout: Optional[str] = None
    card_faces: Optional[str] = None  # JSON
    
    # Images (JSON)
    image_uris: Optional[str] = None  # JSON
    
    # Additional metadata
    component: Optional[str] = None
    rarity: Optional[str] = None
    flavor_text: Optional[str] = None
    artist: Optional[str] = None
    
    # Set information
    set_code: Optional[str] = None
    set_name: Optional[str] = None
    collector_number: Optional[str] = None
    
    # Scryfall URIs
    scryfall_uri: Optional[str] = None
    uri: Optional[str] = None
    rulings_uri: Optional[str] = None
    prints_search_uri: Optional[str] = None
    
    # Simplified card type
    card_type: str = 'Unknown'
    
    # Price and metadata
    price_usd: Optional[float] = None
    price_updated: Optional[datetime] = None
    first_seen: datetime = field(default_factory=datetime.now)
    last_updated: datetime = field(default_factory=datetime.now)
    
    def get_colors_list(self) -> List[str]:
        """Parse colors JSON string to list."""
        if self.colors:
            try:
                return json.loads(self.colors)
            except (json.JSONDecodeError, TypeError):
                return []
        return []
    
    def get_color_identity_list(self) -> List[str]:
        """Parse color_identity JSON string to list."""
        if self.color_identity:
            try:
                return json.loads(self.color_identity)
            except (json.JSONDecodeError, TypeError):
                return []
        return []
    
    def get_image_uris_dict(self) -> Dict[str, str]:
        """Parse image_uris JSON string to dictionary."""
        if self.image_uris:
            try:
                return json.loads(self.image_uris)
            except (json.JSONDecodeError, TypeError):
                return {}
        return {}


@dataclass
class DeckCard:
    """Junction table entry for deck composition."""
    deck_id: str
    card_name: str
    quantity: int = 1
    deck_section: str = 'mainboard'  # 'commander', 'mainboard', 'sideboard'


@dataclass
class PlayerSurvey:
    """Survey response for commander recommendations."""
    survey_id: str
    player_id: Optional[str] = None
    
    # Color preferences (JSON arrays)
    preferred_colors: Optional[str] = None  # JSON: ["W","U","B"]
    avoid_colors: Optional[str] = None      # JSON: ["R","G"]
    
    # Playstyle preferences
    play_style: Optional[str] = None  # 'Aggro', 'Control', 'Combo', 'Midrange', 'Casual'
    win_condition_pref: Optional[str] = None  # 'Combat', 'Combo', 'Alt Win', 'Value', 'Any'
    
    # Experience and complexity
    experience_level: Optional[str] = None  # 'Beginner', 'Intermediate', 'Advanced', 'Expert'
    complexity_comfort: Optional[int] = None  # 1-5 scale
    
    # Budget and power level
    budget_range: Optional[str] = None  # 'Budget', 'Mid', 'High', 'No Limit'
    power_level_target: Optional[int] = None  # 1-10 scale
    
    # Social preferences
    interaction_level: Optional[str] = None  # 'Low', 'Medium', 'High'
    politics_comfort: bool = False
    
    # Theme interests
    kindred_interest: bool = False
    artifacts_interest: bool = False
    graveyard_interest: bool = False
    spellslinger_interest: bool = False
    
    created_at: datetime = field(default_factory=datetime.now)
    
    def get_preferred_colors_list(self) -> List[str]:
        """Parse preferred_colors JSON to list."""
        if self.preferred_colors:
            try:
                return json.loads(self.preferred_colors)
            except (json.JSONDecodeError, TypeError):
                return []
        return []
    
    def get_avoid_colors_list(self) -> List[str]:
        """Parse avoid_colors JSON to list."""
        if self.avoid_colors:
            try:
                return json.loads(self.avoid_colors)
            except (json.JSONDecodeError, TypeError):
                return []
        return []


@dataclass
class CommanderArchetype:
    """Archetype tagging for commanders."""
    commander_name: str
    archetype_tag: str
    confidence_score: float = 1.0


# View result models (read-only)
@dataclass
class TopCommander:
    """Results from top_commanders view."""
    commander_name: str
    partner_name: Optional[str]
    total_decks: int
    tournaments_played: int
    avg_win_rate: float
    avg_standing: float
    top_8_finishes: int
    top_16_finishes: int
    first_seen: datetime
    last_seen: datetime
    popularity_score: float


@dataclass
class TopCardForCommander:
    """Results from top_cards_for_commanders view."""
    commander_name: str
    card_name: str
    type_line: Optional[str]
    cmc: Optional[int]
    colors: Optional[str]
    rarity: Optional[str]
    price_usd: Optional[float]
    card_type: str
    card_type_plural: str
    total_inclusions: int
    decks_included: int
    tournaments_seen: int
    inclusion_rate: float
    avg_win_rate_with_card: float
    avg_standing_with_card: float
    artist: Optional[str]
    set_code: Optional[str]
    layout: Optional[str]
    deck_section: str
    first_seen: datetime
    last_seen: datetime


@dataclass
class CommanderRecommendation:
    """Results from commander_recommendations view."""
    commander_name: str
    partner_name: Optional[str]
    total_decks: int
    avg_win_rate: float
    popularity_score: float
    top_8_finishes: int
    
    # Enhanced commander info
    color_identity: Optional[str]
    commander_type: Optional[str]
    commander_cost: Optional[str]
    commander_cmc: Optional[int]
    commander_ability: Optional[str]
    commander_images: Optional[str]
    commander_url: Optional[str]
    commander_card_type: Optional[str]
    
    # Archetype information
    archetype_tags: Optional[str]  # Comma-separated
    archetype_confidence: Optional[float]
    
    # Price estimate
    estimated_deck_price: Optional[float]
    
    def get_archetype_tags_list(self) -> List[str]:
        """Parse comma-separated archetype tags to list."""
        if self.archetype_tags:
            return [tag.strip() for tag in self.archetype_tags.split(',') if tag.strip()]
        return []
    
    def get_color_identity_list(self) -> List[str]:
        """Parse color_identity JSON to list."""
        if self.color_identity:
            try:
                return json.loads(self.color_identity)
            except (json.JSONDecodeError, TypeError):
                return []
        return []


# Legacy models for backward compatibility (deprecated)
@dataclass
class CardEntry:
    """Legacy model - use DeckCard instead."""
    card_name: str
    card_id: Optional[str]
    quantity: int
    section: str
    
    def to_deck_card(self, deck_id: str) -> DeckCard:
        """Convert to new DeckCard model."""
        return DeckCard(
            deck_id=deck_id,
            card_name=self.card_name,
            quantity=self.quantity,
            deck_section=self.section.lower()
        )


@dataclass
class ParsedDeck:
    """Legacy model - use Deck + DeckCard instead."""
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
    
    def to_deck_and_cards(self, deck_id: str) -> tuple[Deck, List[DeckCard]]:
        """Convert to new Deck + DeckCard models."""
        deck = Deck(
            deck_id=deck_id,
            tournament_id=self.tournament_id,
            player_id=self.player_id,
            player_name=self.player_name,
            standing=self.standing,
            wins=self.wins,
            losses=self.losses,
            draws=self.draws,
            wins_swiss=self.wins_swiss,
            losses_swiss=self.losses_swiss,
            wins_bracket=self.wins_bracket,
            losses_bracket=self.losses_bracket,
            win_rate=self.win_rate,
            byes=self.byes,
            decklist_raw=self.decklist_raw,
            commander_1=self.commanders[0] if self.commanders else None,
            commander_2=self.commanders[1] if len(self.commanders) > 1 else None,
            deck_colors=self.deck_colors,
            has_decklist=bool(self.card_entries),
            decklist_parsed=True
        )
        
        deck_cards = [entry.to_deck_card(deck_id) for entry in self.card_entries]
        return deck, deck_cards


@dataclass
class CardStats:
    """Legacy model - can be computed from views."""
    card_name: str
    total_entries: int
    total_decks: int
    total_tournaments: int
    avg_win_rate: float
    avg_standing: float
    first_seen: datetime
    last_seen: datetime


@dataclass
class PlayerCardPreference:
    """Player card preference analysis."""
    player_name: str
    card_name: str
    times_played: int
    tournaments_played: int
    avg_performance: float
    last_played: datetime


@dataclass
class CommanderPairing:
    """Legacy model - use TopCommander instead."""
    commander_1: str
    commander_2: Optional[str]
    deck_count: int
    avg_win_rate: float
    tournament_format: str
    last_seen: datetime