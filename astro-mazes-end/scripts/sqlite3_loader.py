#!/usr/bin/env python3
"""
Database loader for MTG tournament data from TopDeck and Scryfall APIs.
Loads JSON outputs into SQLite database following the defined schema.
"""

import sqlite3
import json
import logging
import hashlib
from typing import Dict, List, Optional, Any
from datetime import datetime
from pathlib import Path
import re

# Import our models
from mtg_analyzer.models import (
    Tournament, Player, Deck, Card, DeckCard, 
    CardType, CommanderArchetype, PlayerSurvey
)

# Configure SQLite datetime adapter for Python 3.12+
def adapt_datetime_iso(val):
    """Adapt datetime to ISO string for SQLite storage."""
    return val.isoformat()

def convert_datetime(val):
    """Convert ISO string back to datetime from SQLite."""
    return datetime.fromisoformat(val.decode())

# Register the adapters
sqlite3.register_adapter(datetime, adapt_datetime_iso)
sqlite3.register_converter("timestamp", convert_datetime)


class DatabaseLoader:
    """Loads tournament and card data from JSON files into SQLite database."""
    
    def __init__(self, db_path: str, update_mode: bool = True):
        """Initialize the database loader.
        
        Args:
            db_path: Path to SQLite database
            update_mode: If True, update existing records. If False, skip existing records.
        """
        self.db_path = db_path
        self.update_mode = update_mode
        self.logger = logging.getLogger(__name__)
        logging.basicConfig(level=logging.INFO)
        
        # Statistics - clearer naming for tournament data loading
        self.stats = {
            'tournaments_processed': 0,
            'tournaments_new': 0,
            'tournaments_updated': 0,
            'tournaments_skipped': 0,
            
            'player_records_processed': 0,  # Total player appearances across tournaments
            'unique_players_new': 0,        # First time seeing this player
            'unique_players_seen': 0, # Player appeared in another tournament
            
            'deck_records_processed': 0,
            'decks_new': 0,
            'decks_updated': 0,
            'decks_skipped': 0,
            
            'card_records_processed': 0,
            'cards_new': 0,
            'cards_updated': 0,
            'cards_skipped': 0,
            
            'deck_cards_loaded': 0,
            'errors': 0
        }
    
    def create_database(self, schema_file: str = "schema.sql") -> None:
        """Create database tables from schema file."""
        try:
            with open(schema_file, 'r', encoding='utf-8') as f:
                schema_sql = f.read()
            
            # Clean up comments that SQLite doesn't recognize
            # Convert # comments to -- comments
            lines = schema_sql.split('\n')
            cleaned_lines = []
            for line in lines:
                # Convert lines starting with # to --
                if line.strip().startswith('#'):
                    line = line.replace('#', '--', 1)
                cleaned_lines.append(line)
            
            schema_sql = '\n'.join(cleaned_lines)
            
            with sqlite3.connect(self.db_path) as conn:
                conn.executescript(schema_sql)
                
            self.logger.info(f"Database created at {self.db_path}")
            
        except Exception as e:
            self.logger.error(f"Error creating database: {e}")
            raise
    
    def load_tournaments_from_json(self, json_file: str) -> None:
        """Load tournaments from TopDeck API JSON output."""
        try:
            with open(json_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            # Handle both direct tournament list and wrapped format
            tournaments_data = data.get('tournaments', data) if isinstance(data, dict) else data
            
            self.logger.info(f"Loading {len(tournaments_data)} tournaments from {json_file}")
            
            with sqlite3.connect(self.db_path) as conn:
                for tournament_data in tournaments_data:
                    self._load_tournament(conn, tournament_data)
            
            processed = self.stats['tournaments_processed']
            new = self.stats['tournaments_new'] 
            updated = self.stats['tournaments_updated']
            self.logger.info(f"Tournament loading complete. Processed {processed}, New: {new}, Updated: {updated}")
            
        except Exception as e:
            self.logger.error(f"Error loading tournaments from {json_file}: {e}")
            raise
    
    def _load_tournament(self, conn: sqlite3.Connection, tournament_data: Dict) -> None:
        """Load a single tournament and its associated data."""
        try:
            # Extract tournament info
            tournament = self._parse_tournament_data(tournament_data)
            
            # Insert tournament
            self._insert_tournament(conn, tournament)
            
            # Process standings (players and decks)
            standings = tournament_data.get('standings', [])
            for standing_data in standings:
                player = self._parse_player_data(standing_data)
                deck = self._parse_deck_data(standing_data, tournament.tournament_id)
                
                # Insert player and deck
                self._insert_player(conn, player)
                self._insert_deck(conn, deck)
                
                # Parse decklist if present
                if deck.decklist_raw and deck.has_decklist:
                    deck_cards = self._parse_decklist(deck.decklist_raw, deck.deck_id)
                    for deck_card in deck_cards:
                        self._insert_deck_card(conn, deck_card)
            
            self.stats['tournaments_processed'] += 1
            
        except Exception as e:
            self.logger.error(f"Error loading tournament {tournament_data.get('TID', 'unknown')}: {e}")
            self.stats['errors'] += 1
    
    def _parse_tournament_data(self, data: Dict) -> Tournament:
        """Parse tournament data from TopDeck JSON format."""
        # Convert dateCreated to datetime if it exists
        start_date = None
        if data.get('dateCreated'):
            try:
                start_date = datetime.fromtimestamp(data['dateCreated'])
            except (ValueError, TypeError):
                pass
        
        return Tournament(
            tournament_id=data.get('TID', ''),
            tournament_name=data.get('tournamentName'),
            game=data.get('game', 'Magic: The Gathering'),
            format=data.get('format', 'EDH'),
            start_date=start_date,
            swiss_rounds=data.get('swissNum'),
            top_cut=data.get('topCut'),
            total_players=len(data.get('standings', [])),
            location_city=data.get('locationCity'),
            location_state=data.get('locationState'), 
            location_venue=data.get('locationVenue'),
            has_decklists=any(p.get('decklist') for p in data.get('standings', []))
        )
    
    def _parse_player_data(self, standing_data: Dict) -> Player:
        """Parse player data from standings entry."""
        player_name = standing_data.get('name', '')
        
        # Generate consistent player_id from name
        player_id = self._generate_player_id(player_name)
        
        return Player(
            player_id=player_id,
            player_name=player_name,
            discord_username=standing_data.get('discordUsername'),
            discord_id=standing_data.get('discordId')
        )
    
    def _parse_deck_data(self, standing_data: Dict, tournament_id: str) -> Deck:
        """Parse deck data from standings entry."""
        player_name = standing_data.get('name', '')
        player_id = self._generate_player_id(player_name)
        
        # Generate deck_id from tournament + player
        deck_id = f"{tournament_id}_{player_id}"
        
        # Extract commander info from decklist if available
        commanders = self._extract_commanders_from_decklist(standing_data.get('decklist', ''))
        
        return Deck(
            deck_id=deck_id,
            tournament_id=tournament_id,
            player_id=player_id,
            player_name=player_name,
            standing=standing_data.get('standing'),
            wins=standing_data.get('wins', 0),
            losses=standing_data.get('losses', 0),
            draws=standing_data.get('draws', 0),
            wins_swiss=standing_data.get('winsSwiss', 0),
            losses_swiss=standing_data.get('lossesSwiss', 0),
            wins_bracket=standing_data.get('winsBracket', 0),
            losses_bracket=standing_data.get('lossesBracket', 0),
            win_rate=standing_data.get('winRate', 0.0),
            byes=standing_data.get('byes', 0),
            decklist_raw=standing_data.get('decklist'),
            commander_1=commanders[0] if commanders else None,
            commander_2=commanders[1] if len(commanders) > 1 else None,
            deck_colors=self._extract_deck_colors(commanders),
            has_decklist=bool(standing_data.get('decklist')),
            decklist_parsed=bool(standing_data.get('decklist'))
        )
    
    def _generate_player_id(self, player_name: str) -> str:
        """Generate consistent player ID from player name."""
        # Use hash of normalized name for consistent IDs
        normalized = player_name.lower().strip()
        return hashlib.md5(normalized.encode()).hexdigest()[:12]
    
    def _extract_commanders_from_decklist(self, decklist: str) -> List[str]:
        """Extract commander names from decklist text."""
        if not decklist:
            return []
        
        commanders = []
        lines = decklist.strip().split('\n')
        
        in_commander_section = False
        for line in lines:
            line = line.strip()
            
            # Check for commander section headers
            if line.lower() in ['commander:', 'commanders:', 'commander', 'commanders']:
                in_commander_section = True
                continue
            
            # If we hit another section, stop looking for commanders
            if line.lower() in ['companion:', 'sideboard:', 'maindeck:', 'deck:', 'mainboard:']:
                in_commander_section = False
                continue
            
            # If we're in commander section or this looks like commander line
            if in_commander_section or line.startswith('1 '):
                # Remove quantity and clean up
                commander_name = re.sub(r'^\s*1\s+', '', line)
                commander_name = re.sub(r'\s*[\(\[][\w\d]+[\)\]]\s*\d*\s*$', '', commander_name)
                commander_name = commander_name.strip()
                
                if commander_name and len(commander_name) > 1:
                    commanders.append(commander_name)
                    
                # For commander section, usually just 1-2 cards
                if in_commander_section and len(commanders) >= 2:
                    break
        
        return commanders[:2]  # Max 2 commanders (partner)
    
    def _extract_deck_colors(self, commanders: List[str]) -> Optional[str]:
        """Extract color identity from commander names (placeholder)."""
        # This would need card data to determine actual colors
        # For now, return None - will be updated when cards are loaded
        return None
    
    def _parse_decklist(self, decklist_text: str, deck_id: str) -> List[DeckCard]:
        """Parse decklist text into DeckCard entries."""
        if not decklist_text:
            return []
        
        deck_cards = []
        lines = decklist_text.strip().split('\n')
        current_section = 'mainboard'
        
        for line in lines:
            line = line.strip()
            if not line:
                continue
            
            # Check for section headers
            if line.lower() in ['commander:', 'commanders:']:
                current_section = 'commander'
                continue
            elif line.lower() in ['companion:']:
                current_section = 'companion'
                continue
            elif line.lower() in ['sideboard:']:
                current_section = 'sideboard'
                continue
            elif line.lower() in ['maindeck:', 'deck:', 'mainboard:']:
                current_section = 'mainboard'
                continue
            
            # Skip category lines and comments
            if line.startswith('//') or line.startswith('#') or line == '---':
                continue
            
            # Parse quantity and card name
            quantity_match = re.match(r'^\s*(\d+)x?\s+(.+)$', line)
            if quantity_match:
                quantity = int(quantity_match.group(1))
                card_name = quantity_match.group(2)
                
                # Clean up card name (remove set codes, collector numbers)
                card_name = re.sub(r'\s*[\(\[][\w\d]+[\)\]]\s*\d*\s*$', '', card_name)
                card_name = re.sub(r'\s+\d+\s*$', '', card_name)
                card_name = card_name.strip()
                
                if card_name and len(card_name) > 1:
                    deck_card = DeckCard(
                        deck_id=deck_id,
                        card_name=card_name,
                        quantity=quantity,
                        deck_section=current_section
                    )
                    deck_cards.append(deck_card)
        
        return deck_cards
    
    def load_cards_from_json(self, json_file: str) -> None:
        """Load cards from Scryfall API JSON output."""
        try:
            with open(json_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            # Handle wrapped format from Scryfall API
            cards_data = data.get('cards', data) if isinstance(data, dict) else data
            
            self.logger.info(f"Loading {len(cards_data)} cards from {json_file}")
            
            with sqlite3.connect(self.db_path) as conn:
                for card_data in cards_data:
                    self._load_card(conn, card_data)
            
            total_processed = self.stats['card_records_processed']
            new_cards = self.stats['cards_new']
            updated_cards = self.stats['cards_updated']
            self.logger.info(f"Card loading complete. Processed {total_processed}, New: {new_cards}, Updated: {updated_cards}")
            
        except Exception as e:
            self.logger.error(f"Error loading cards from {json_file}: {e}")
            raise
    
    def _load_card(self, conn: sqlite3.Connection, card_data: Dict) -> None:
        """Load a single card into the database."""
        try:
            card = self._parse_card_data(card_data)
            self._insert_card(conn, card)
            # Remove double-counting - _insert_card already handles statistics
            
        except Exception as e:
            self.logger.error(f"Error loading card {card_data.get('card_name', 'unknown')}: {e}")
            self.stats['errors'] += 1
    
    def _parse_card_data(self, data: Dict) -> Card:
        """Parse card data from Scryfall JSON format."""
        # Handle datetime fields
        now = datetime.now()
        price_updated = None
        if data.get('price_updated'):
            try:
                price_updated = datetime.fromisoformat(data['price_updated'].replace('Z', '+00:00'))
            except (ValueError, TypeError):
                price_updated = now
        
        first_seen = now
        if data.get('first_seen'):
            try:
                first_seen = datetime.fromisoformat(data['first_seen'].replace('Z', '+00:00'))
            except (ValueError, TypeError):
                pass
        
        last_updated = now
        if data.get('last_updated'):
            try:
                last_updated = datetime.fromisoformat(data['last_updated'].replace('Z', '+00:00'))
            except (ValueError, TypeError):
                pass
        
        # Determine card type using both type_line and oracle_text
        type_line = data.get('type_line', '')
        oracle_text = data.get('oracle_text', '')
        card_type = self._determine_card_type(type_line, oracle_text)
        
        return Card(
            card_name=data.get('card_name', ''),
            scryfall_id=data.get('scryfall_id'),
            mana_cost=data.get('mana_cost'),
            cmc=data.get('cmc'),
            type_line=type_line,
            oracle_text=oracle_text,
            power=data.get('power'),
            toughness=data.get('toughness'),
            colors=data.get('colors'),  # Already JSON string from Scryfall API
            color_identity=data.get('color_identity'),  # Already JSON string
            layout=data.get('layout'),
            card_faces=json.dumps(data.get('card_faces', [])) if data.get('card_faces') else None,
            image_uris=json.dumps(data.get('image_uris', {})) if data.get('image_uris') else None,
            component=data.get('component'),
            rarity=data.get('rarity'),
            flavor_text=data.get('flavor_text'),
            artist=data.get('artist'),
            set_code=data.get('set_code'),
            set_name=data.get('set_name'),
            collector_number=data.get('collector_number'),
            scryfall_uri=data.get('scryfall_uri'),
            uri=data.get('uri'),
            rulings_uri=data.get('rulings_uri'),
            prints_search_uri=data.get('prints_search_uri'),
            card_type=card_type,  # Use the enhanced card type determination
            price_usd=data.get('price_usd'),
            price_updated=price_updated,
            first_seen=first_seen,
            last_updated=last_updated
        )
    
    def _insert_tournament(self, conn: sqlite3.Connection, tournament: Tournament) -> None:
        """Insert or update tournament in database."""
        # Check if tournament exists
        existing = conn.execute(
            "SELECT tournament_id, tournament_name FROM tournaments WHERE tournament_id = ?",
            (tournament.tournament_id,)
        ).fetchone()
        
        if existing:
            if self.update_mode:
                # Update all fields except tournament_id (primary key)
                sql = """
                UPDATE tournaments SET 
                    tournament_name = ?, game = ?, format = ?, start_date = ?,
                    swiss_rounds = ?, top_cut = ?, total_players = ?, 
                    location_city = ?, location_state = ?, location_venue = ?,
                    has_decklists = ?
                WHERE tournament_id = ?
                """
                conn.execute(sql, (
                    tournament.tournament_name, tournament.game, tournament.format,
                    tournament.start_date, tournament.swiss_rounds, tournament.top_cut,
                    tournament.total_players, tournament.location_city,
                    tournament.location_state, tournament.location_venue,
                    tournament.has_decklists, tournament.tournament_id
                ))
                self.stats['tournaments_updated'] += 1
                self.logger.debug(f"Updated tournament: {tournament.tournament_id}")
            else:
                self.stats['tournaments_skipped'] += 1
                self.logger.debug(f"Skipped existing tournament: {tournament.tournament_id}")
        else:
            # Insert new tournament
            sql = """
            INSERT INTO tournaments (
                tournament_id, tournament_name, game, format, start_date,
                swiss_rounds, top_cut, total_players, location_city,
                location_state, location_venue, has_decklists, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """
            conn.execute(sql, (
                tournament.tournament_id, tournament.tournament_name,
                tournament.game, tournament.format, tournament.start_date,
                tournament.swiss_rounds, tournament.top_cut, tournament.total_players,
                tournament.location_city, tournament.location_state,
                tournament.location_venue, tournament.has_decklists,
                tournament.created_at
            ))
            self.stats['tournaments_new'] += 1
            self.logger.debug(f"Inserted new tournament: {tournament.tournament_id}")
    
    def _insert_player(self, conn: sqlite3.Connection, player: Player) -> None:
        """Insert or update player in database."""
        # Always count that we processed a player record from tournament data
        self.stats['player_records_processed'] += 1
        
        # Check if player exists
        existing = conn.execute(
            "SELECT total_tournaments, first_seen FROM players WHERE player_id = ?",
            (player.player_id,)
        ).fetchone()
        
        if existing:
            # Player exists - this is another tournament appearance
            sql = """
            UPDATE players SET 
                player_name = ?, discord_username = ?, discord_id = ?,
                total_tournaments = total_tournaments + 1, last_seen = ?
            WHERE player_id = ?
            """
            conn.execute(sql, (
                player.player_name, player.discord_username, 
                player.discord_id, player.last_seen, player.player_id
            ))
            self.stats['unique_players_seen'] += 1
        else:
            # New player - first time seeing them
            sql = """
            INSERT INTO players (
                player_id, player_name, discord_username, discord_id,
                total_tournaments, first_seen, last_seen
            ) VALUES (?, ?, ?, ?, 1, ?, ?)
            """
            conn.execute(sql, (
                player.player_id, player.player_name, player.discord_username,
                player.discord_id, player.first_seen, player.last_seen
            ))
            self.stats['unique_players_new'] += 1
    
    def _insert_deck(self, conn: sqlite3.Connection, deck: Deck) -> None:
        """Insert or update deck in database."""
        # Always count that we processed a deck record
        self.stats['deck_records_processed'] += 1
        
        # Check if deck exists
        existing = conn.execute(
            "SELECT deck_id FROM decks WHERE deck_id = ?",
            (deck.deck_id,)
        ).fetchone()
        
        if existing:
            if self.update_mode:
                # Update all fields except deck_id (primary key)
                sql = """
                UPDATE decks SET 
                    tournament_id = ?, player_id = ?, player_name = ?, standing = ?,
                    wins = ?, losses = ?, draws = ?, wins_swiss = ?, losses_swiss = ?, 
                    wins_bracket = ?, losses_bracket = ?, win_rate = ?, byes = ?,
                    decklist_raw = ?, decklist_parsed = ?, commander_1 = ?, commander_2 = ?,
                    deck_colors = ?, has_decklist = ?
                WHERE deck_id = ?
                """
                conn.execute(sql, (
                    deck.tournament_id, deck.player_id, deck.player_name,
                    deck.standing, deck.wins, deck.losses, deck.draws,
                    deck.wins_swiss, deck.losses_swiss, deck.wins_bracket,
                    deck.losses_bracket, deck.win_rate, deck.byes,
                    deck.decklist_raw, deck.decklist_parsed, deck.commander_1,
                    deck.commander_2, deck.deck_colors, deck.has_decklist,
                    deck.deck_id
                ))
                self.stats['decks_updated'] += 1
                self.logger.debug(f"Updated deck: {deck.deck_id}")
            else:
                self.stats['decks_skipped'] += 1
                self.logger.debug(f"Skipped existing deck: {deck.deck_id}")
        else:
            # Insert new deck
            sql = """
            INSERT INTO decks (
                deck_id, tournament_id, player_id, player_name, standing,
                wins, losses, draws, wins_swiss, losses_swiss, 
                wins_bracket, losses_bracket, win_rate, byes,
                decklist_raw, decklist_parsed, commander_1, commander_2,
                deck_colors, has_decklist, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """
            conn.execute(sql, (
                deck.deck_id, deck.tournament_id, deck.player_id, deck.player_name,
                deck.standing, deck.wins, deck.losses, deck.draws,
                deck.wins_swiss, deck.losses_swiss, deck.wins_bracket,
                deck.losses_bracket, deck.win_rate, deck.byes,
                deck.decklist_raw, deck.decklist_parsed, deck.commander_1,
                deck.commander_2, deck.deck_colors, deck.has_decklist,
                deck.created_at
            ))
            self.stats['decks_new'] += 1
            self.logger.debug(f"Inserted new deck: {deck.deck_id}")
    
    def _insert_card(self, conn: sqlite3.Connection, card: Card) -> None:
        """Insert or update card in database."""
        # Always count that we processed a card record
        self.stats['card_records_processed'] += 1
        
        # Check if card exists
        existing = conn.execute(
            "SELECT card_name, first_seen FROM cards WHERE card_name = ?",
            (card.card_name,)
        ).fetchone()
        
        if existing:
            if self.update_mode:
                # Update all fields except card_name (primary key), but preserve first_seen
                original_first_seen = existing[1] if existing[1] else card.first_seen
                
                sql = """
                UPDATE cards SET 
                    scryfall_id = ?, mana_cost = ?, cmc = ?, type_line = ?, oracle_text = ?,
                    power = ?, toughness = ?, colors = ?, color_identity = ?, layout = ?,
                    card_faces = ?, image_uris = ?, component = ?, rarity = ?, 
                    flavor_text = ?, artist = ?, set_code = ?, set_name = ?, 
                    collector_number = ?, scryfall_uri = ?, uri = ?, rulings_uri = ?,
                    prints_search_uri = ?, card_type = ?, price_usd = ?, 
                    price_updated = ?, last_updated = ?
                WHERE card_name = ?
                """
                conn.execute(sql, (
                    card.scryfall_id, card.mana_cost, card.cmc, card.type_line,
                    card.oracle_text, card.power, card.toughness, card.colors,
                    card.color_identity, card.layout, card.card_faces,
                    card.image_uris, card.component, card.rarity, card.flavor_text,
                    card.artist, card.set_code, card.set_name, card.collector_number,
                    card.scryfall_uri, card.uri, card.rulings_uri,
                    card.prints_search_uri, card.card_type, card.price_usd,
                    card.price_updated, card.last_updated, card.card_name
                ))
                self.stats['cards_updated'] += 1
                self.logger.debug(f"Updated card: {card.card_name}")
            else:
                self.stats['cards_skipped'] += 1
                self.logger.debug(f"Skipped existing card: {card.card_name}")
        else:
            # Insert new card
            sql = """
            INSERT INTO cards (
                card_name, scryfall_id, mana_cost, cmc, type_line, oracle_text,
                power, toughness, colors, color_identity, layout, card_faces,
                image_uris, component, rarity, flavor_text, artist,
                set_code, set_name, collector_number, scryfall_uri, uri,
                rulings_uri, prints_search_uri, card_type, price_usd,
                price_updated, first_seen, last_updated
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """
            conn.execute(sql, (
                card.card_name, card.scryfall_id, card.mana_cost, card.cmc,
                card.type_line, card.oracle_text, card.power, card.toughness,
                card.colors, card.color_identity, card.layout, card.card_faces,
                card.image_uris, card.component, card.rarity, card.flavor_text,
                card.artist, card.set_code, card.set_name, card.collector_number,
                card.scryfall_uri, card.uri, card.rulings_uri,
                card.prints_search_uri, card.card_type, card.price_usd,
                card.price_updated, card.first_seen, card.last_updated
            ))
            self.stats['cards_new'] += 1
            self.logger.debug(f"Inserted new card: {card.card_name}")
    
    def _insert_deck_card(self, conn: sqlite3.Connection, deck_card: DeckCard) -> None:
        """Insert or replace deck card relationship."""
        # Always use INSERT OR REPLACE for deck_cards since they're relationships
        sql = """
        INSERT OR REPLACE INTO deck_cards (deck_id, card_name, quantity, deck_section)
        VALUES (?, ?, ?, ?)
        """
        
        conn.execute(sql, (
            deck_card.deck_id, deck_card.card_name, 
            deck_card.quantity, deck_card.deck_section
        ))
        self.stats['deck_cards_loaded'] += 1
    
    def _determine_card_type(self, type_line: str, oracle_text: str = "") -> str:
        """Determine primary card type from type line and oracle text."""
        type_lower = type_line.lower()
        oracle_lower = oracle_text.lower() if oracle_text else ""
        
        # Check for commander eligibility (more comprehensive)
        is_commander = (
            # Traditional legendary creatures
            ('legendary' in type_lower and 'creature' in type_lower) or
            # Planeswalker commanders (can be your commander rule)
            ('planeswalker' in type_lower and ('can be your commander' in oracle_lower or 'legendary' in type_lower)) or
            # Cards with partner ability
            'partner' in oracle_lower or
            # Background commanders
            'background' in type_lower or
            # Choose a Background commanders
            'choose a background' in oracle_lower
        )
        
        if is_commander:
            return 'Commander'
        elif 'battle' in type_lower:
            return 'Battle'
        elif 'planeswalker' in type_lower:
            return 'Planeswalker'
        elif 'creature' in type_lower:
            return 'Creature'
        elif 'sorcery' in type_lower:
            return 'Sorcery'
        elif 'instant' in type_lower:
            return 'Instant'
        elif 'artifact' in type_lower:
            return 'Artifact'
        elif 'enchantment' in type_lower:
            return 'Enchantment'
        elif 'land' in type_lower:
            return 'Land'
        else:
            return 'Unknown'
    
    def update_deck_colors(self) -> None:
        """Update deck color identities based on commander cards in database."""
        try:
            with sqlite3.connect(self.db_path) as conn:
                # Get all decks with commanders but no color identity
                decks_sql = """
                SELECT deck_id, commander_1, commander_2 
                FROM decks 
                WHERE commander_1 IS NOT NULL AND deck_colors IS NULL
                """
                
                decks = conn.execute(decks_sql).fetchall()
                
                updated = 0
                for deck_id, commander_1, commander_2 in decks:
                    colors = set()
                    
                    # Get colors for commander 1
                    if commander_1:
                        color_result = conn.execute(
                            "SELECT color_identity FROM cards WHERE card_name = ?",
                            (commander_1,)
                        ).fetchone()
                        
                        if color_result and color_result[0]:
                            try:
                                commander_colors = json.loads(color_result[0])
                                colors.update(commander_colors)
                            except json.JSONDecodeError:
                                pass
                    
                    # Get colors for commander 2 (partner)
                    if commander_2:
                        color_result = conn.execute(
                            "SELECT color_identity FROM cards WHERE card_name = ?",
                            (commander_2,)
                        ).fetchone()
                        
                        if color_result and color_result[0]:
                            try:
                                commander_colors = json.loads(color_result[0])
                                colors.update(commander_colors)
                            except json.JSONDecodeError:
                                pass
                    
                    # Update deck with combined color identity
                    if colors:
                        color_string = ''.join(sorted(colors))
                        conn.execute(
                            "UPDATE decks SET deck_colors = ? WHERE deck_id = ?",
                            (color_string, deck_id)
                        )
                        updated += 1
                
                self.logger.info(f"Updated color identity for {updated} decks")
                
        except Exception as e:
            self.logger.error(f"Error updating deck colors: {e}")
    
    def print_statistics(self) -> None:
        """Print loading statistics."""
        print("\nDatabase Loading Statistics:")
        print("=" * 60)
        
        # Tournaments (straightforward)
        print(f"Tournaments:")
        print(f"  Processed: {self.stats['tournaments_processed']:,}")
        print(f"  New: {self.stats['tournaments_new']:,}")
        print(f"  Updated: {self.stats['tournaments_updated']:,}")
        print(f"  Skipped: {self.stats['tournaments_skipped']:,}")
        
        # Players (explained clearly)
        total_player_records = self.stats['player_records_processed']
        new_players = self.stats['unique_players_new'] 
        repeat_players = self.stats['unique_players_seen']
        
        print(f"\nPlayers:")
        print(f"  Tournament entries processed: {total_player_records:,}")
        print(f"  New unique players discovered: {new_players:,}")
        print(f"  Existing players seen again: {repeat_players:,}")
        print(f"  → Total unique players: {new_players + repeat_players:,}")
        
        # Decks (one per tournament entry)
        print(f"\nDecks:")
        print(f"  Processed: {self.stats['deck_records_processed']:,}")
        print(f"  New: {self.stats['decks_new']:,}")
        print(f"  Updated: {self.stats['decks_updated']:,}")
        print(f"  Skipped: {self.stats['decks_skipped']:,}")
        
        # Cards (from Scryfall data)
        print(f"\nCards:")
        print(f"  Processed: {self.stats['card_records_processed']:,}")
        print(f"  New: {self.stats['cards_new']:,}")
        print(f"  Updated: {self.stats['cards_updated']:,}")
        print(f"  Skipped: {self.stats['cards_skipped']:,}")
        
        print(f"\nDeck-card relationships: {self.stats['deck_cards_loaded']:,}")
        print(f"Errors: {self.stats['errors']:,}")
        
        # Query database for verification
        try:
            with sqlite3.connect(self.db_path) as conn:
                # Count records in each table
                counts = {}
                tables = ['tournaments', 'players', 'decks', 'cards', 'deck_cards']
                
                for table in tables:
                    count = conn.execute(f"SELECT COUNT(*) FROM {table}").fetchone()[0]
                    counts[table] = count
                
                print(f"\nFinal Database Counts:")
                print("-" * 30)
                for table, count in counts.items():
                    print(f"{table}: {count:,}")
                
                # Show sample data
                print(f"\nSample Tournament:")
                tournament = conn.execute(
                    "SELECT tournament_id, tournament_name, total_players, has_decklists FROM tournaments LIMIT 1"
                ).fetchone()
                if tournament:
                    print(f"  ID: {tournament[0]}")
                    print(f"  Name: {tournament[1]}")
                    print(f"  Players: {tournament[2]}")
                    print(f"  Has Decklists: {tournament[3]}")
                
        except Exception as e:
            self.logger.error(f"Error getting database statistics: {e}")
        print("\nDatabase Loading Statistics:")
        print("=" * 50)
        print(f"Tournaments:")
        print(f"  New: {self.stats['tournaments_new']:,}")
        print(f"  Updated: {self.stats['tournaments_updated']:,}")
        print(f"  Skipped: {self.stats['tournaments_skipped']:,}")
        
        print(f"Players:")
        print(f"  New: {self.stats['unique_players_new']:,}")
        print(f"  Updated: {self.stats['unique_players_seen']:,}")
        
        print(f"Decks:")
        print(f"  New: {self.stats['decks_new']:,}")
        print(f"  Updated: {self.stats['decks_updated']:,}")
        print(f"  Skipped: {self.stats['decks_skipped']:,}")
        
        print(f"Cards:")
        print(f"  New: {self.stats['cards_new']:,}")
        print(f"  Updated: {self.stats['cards_updated']:,}")
        print(f"  Skipped: {self.stats['cards_skipped']:,}")
        
        print(f"Deck-card relationships: {self.stats['deck_cards_loaded']:,}")
        print(f"Errors: {self.stats['errors']:,}")
        
        # Query database for verification
        try:
            with sqlite3.connect(self.db_path) as conn:
                # Count records in each table
                counts = {}
                tables = ['tournaments', 'players', 'decks', 'cards', 'deck_cards']
                
                for table in tables:
                    count = conn.execute(f"SELECT COUNT(*) FROM {table}").fetchone()[0]
                    counts[table] = count
                
                print(f"\nDatabase Record Counts:")
                print("-" * 30)
                for table, count in counts.items():
                    print(f"{table}: {count:,}")
                
                # Show sample data
                print(f"\nSample Tournament:")
                tournament = conn.execute(
                    "SELECT tournament_id, tournament_name, total_players, has_decklists FROM tournaments LIMIT 1"
                ).fetchone()
                if tournament:
                    print(f"  ID: {tournament[0]}")
                    print(f"  Name: {tournament[1]}")
                    print(f"  Players: {tournament[2]}")
                    print(f"  Has Decklists: {tournament[3]}")
                
        except Exception as e:
            self.logger.error(f"Error getting database statistics: {e}")


def main():
    """Main function for command-line usage."""
    import argparse
    
    parser = argparse.ArgumentParser(
        description="Load tournament and card data into database",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Create database and load data (update mode)
  python database_loader.py --db tournament.db --create --tournaments tournaments.json --cards cards.json
  
  # Load tournaments only, skip existing records
  python database_loader.py --db tournament.db --tournaments tournaments.json --no-update
  
  # Load cards and update existing records
  python database_loader.py --db tournament.db --cards cards.json --update-colors
  
  # Force update all existing records
  python database_loader.py --db tournament.db --tournaments tournaments.json --update
        """
    )
    
    parser.add_argument('--db', required=True, help='SQLite database path')
    parser.add_argument('--create', action='store_true', help='Create database schema')
    parser.add_argument('--schema', default='schema.sql', help='Schema file path')
    parser.add_argument('--tournaments', help='Tournament JSON file from TopDeck API')
    parser.add_argument('--cards', help='Card JSON file from Scryfall API')
    parser.add_argument('--update-colors', action='store_true', help='Update deck color identities')
    parser.add_argument('--update', action='store_true', help='Update existing records (default: True)')
    parser.add_argument('--no-update', action='store_true', help='Skip existing records instead of updating')
    parser.add_argument('--verbose', '-v', action='store_true', help='Verbose logging')
    
    args = parser.parse_args()
    
    if args.verbose:
        logging.getLogger().setLevel(logging.DEBUG)
    
    # Determine update mode
    update_mode = True  # Default to update mode
    if args.no_update:
        update_mode = False
    elif args.update:
        update_mode = True
    
    # Initialize loader
    loader = DatabaseLoader(args.db, update_mode=update_mode)
    
    # Create database if requested
    if args.create:
        print(f"Creating database at {args.db}")
        loader.create_database(args.schema)
    
    # Print update mode
    mode_str = "UPDATE" if update_mode else "SKIP EXISTING"
    print(f"Running in {mode_str} mode")
    
    # Load tournaments
    if args.tournaments:
        print(f"Loading tournaments from {args.tournaments}")
        loader.load_tournaments_from_json(args.tournaments)
    
    # Load cards
    if args.cards:
        print(f"Loading cards from {args.cards}")
        loader.load_cards_from_json(args.cards)
    
    # Update deck colors if requested
    if args.update_colors:
        print("Updating deck color identities...")
        loader.update_deck_colors()
    
    # Print statistics
    loader.print_statistics()
    
    print(f"\nDatabase loading complete: {args.db}")


if __name__ == "__main__":
    main()