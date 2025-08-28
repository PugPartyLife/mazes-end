"""
SQLite database operations for card-centric MTG tournament data.
Optimized for Pothos/Yoga GraphQL integration.
"""

import sqlite3
import hashlib
import json
import os
from datetime import datetime, date
from typing import Dict, List, Optional, Any
from pathlib import Path
from .models import ParsedDeck, CardStats, PlayerCardPreference, CommanderPairing
from .parser import DecklistParser


class SQLiteCardDatabase:
    """SQLite database handler for card-centric tournament data."""
    
    def __init__(self, db_path: str = "mtg_cards.db"):
        """Initialize SQLite database."""
        self.db_path = db_path
        self.parser = DecklistParser()
        self._init_database()
    
    def _init_database(self):
        """Initialize database and create schema if needed."""
        # Get schema from the same directory as this file
        schema_path = Path(__file__).parent / "schema.sql"
        
        if not schema_path.exists():
            # Fallback: create minimal schema
            self._create_minimal_schema()
            return
        
        # Load and execute schema
        with open(schema_path, 'r') as f:
            schema_sql = f.read()
        
        conn = self.connect()
        try:
            # Execute schema (split by semicolon for multiple statements)
            for statement in schema_sql.split(';'):
                if statement.strip():
                    conn.execute(statement)
            conn.commit()
            print(f"✅ Database initialized: {self.db_path}")
        except Exception as e:
            print(f"❌ Schema creation error: {e}")
            raise
        finally:
            conn.close()
    
    def _create_minimal_schema(self):
        """Create minimal schema if schema.sql not found."""
        conn = self.connect()
        try:
            # Essential tables only
            conn.executescript("""
                CREATE TABLE IF NOT EXISTS tournaments (
                    tournament_id TEXT PRIMARY KEY,
                    tournament_name TEXT,
                    game TEXT,
                    format TEXT,
                    start_date DATETIME,
                    total_players INTEGER,
                    has_decklists BOOLEAN DEFAULT 0
                );
                
                CREATE TABLE IF NOT EXISTS players (
                    player_id TEXT PRIMARY KEY,
                    player_name TEXT NOT NULL,
                    total_tournaments INTEGER DEFAULT 0
                );
                
                CREATE TABLE IF NOT EXISTS decks (
                    deck_id TEXT PRIMARY KEY,
                    tournament_id TEXT,
                    player_id TEXT,
                    player_name TEXT,
                    standing INTEGER,
                    win_rate REAL DEFAULT 0.0,
                    commander_1 TEXT,
                    commander_2 TEXT
                );
                
                CREATE TABLE IF NOT EXISTS card_entries (
                    entry_id INTEGER PRIMARY KEY AUTOINCREMENT,
                    card_id TEXT NOT NULL,
                    card_name TEXT NOT NULL,
                    deck_id TEXT NOT NULL,
                    tournament_id TEXT NOT NULL,
                    player_name TEXT NOT NULL,
                    quantity INTEGER DEFAULT 1,
                    deck_section TEXT NOT NULL,
                    tournament_date DATE NOT NULL,
                    tournament_format TEXT NOT NULL,
                    deck_win_rate REAL
                );
                
                CREATE INDEX idx_card_entries_card_name ON card_entries(card_name);
                CREATE INDEX idx_card_entries_tournament_date ON card_entries(tournament_date);
            """)
            conn.commit()
            print("✅ Minimal database schema created")
        finally:
            conn.close()
    
    def connect(self) -> sqlite3.Connection:
        """Create database connection."""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row  # Enable column access by name
        return conn
    
    def generate_deck_id(self, tournament_id: str, player_name: str, player_id: Optional[str] = None) -> str:
        """Generate a unique deck ID."""
        base_string = f"{tournament_id}:{player_name}"
        if player_id:
            base_string += f":{player_id}"
        return hashlib.sha256(base_string.encode()).hexdigest()[:32]
    
    def process_tournaments(self, tournaments: List[Dict]) -> Dict[str, int]:
        """Process tournament data and insert into database."""
        conn = self.connect()
        cursor = conn.cursor()
        
        stats = {
            'tournaments_processed': 0,
            'decks_processed': 0, 
            'card_entries_created': 0,
            'players_added': 0
        }
        
        try:
            for tournament in tournaments:
                tournament_id = tournament.get('TID')
                if not tournament_id:
                    continue
                    
                print(f"Processing tournament: {tournament_id}")
                
                # Insert tournament
                self._insert_tournament(cursor, tournament)
                stats['tournaments_processed'] += 1
                
                # Process each deck/player
                standings = tournament.get('standings', [])
                for standing_data in standings:
                    try:
                        parsed_deck = self._parse_player_deck(tournament, standing_data)
                        if parsed_deck and parsed_deck.card_entries:  # Only process if has cards
                            # Insert player if not exists
                            if parsed_deck.player_id:
                                self._insert_player(cursor, parsed_deck.player_id, parsed_deck.player_name)
                                stats['players_added'] += 1
                            
                            # Insert deck
                            self._insert_deck(cursor, parsed_deck)
                            stats['decks_processed'] += 1
                            
                            # Insert card entries
                            entries_added = self._insert_card_entries(cursor, parsed_deck)
                            stats['card_entries_created'] += entries_added
                            
                    except Exception as e:
                        print(f"Error processing deck for {standing_data.get('name', 'Unknown')}: {e}")
                        continue
                
                # Commit after each tournament
                conn.commit()
                print(f"  Processed {len(standings)} decks")
            
            # Update statistics if table exists
            try:
                self._update_card_statistics(cursor)
                self._update_commander_pairings(cursor)
                conn.commit()
            except sqlite3.OperationalError:
                print("⚠️  Statistics tables not found, skipping aggregation")
            
            return stats
            
        except Exception as e:
            conn.rollback()
            print(f"Database error: {e}")
            raise
        finally:
            cursor.close()
            conn.close()
    
    def get_top_cards(self, limit: int = 50, format_filter: str = None) -> List[Dict[str, Any]]:
        """Get most played cards (GraphQL-friendly format)."""
        conn = self.connect()
        cursor = conn.cursor()
        
        try:
            query = """
            SELECT 
                card_name,
                COUNT(*) as total_entries,
                COUNT(DISTINCT deck_id) as total_decks,
                COUNT(DISTINCT tournament_id) as total_tournaments,
                AVG(deck_win_rate) as avg_win_rate,
                AVG(deck_standing) as avg_standing,
                MIN(tournament_date) as first_seen,
                MAX(tournament_date) as last_seen
            FROM card_entries
            """
            
            params = []
            if format_filter:
                query += " WHERE tournament_format = ?"
                params.append(format_filter)
            
            query += """
            GROUP BY card_name
            ORDER BY total_entries DESC
            LIMIT ?
            """
            params.append(limit)
            
            cursor.execute(query, params)
            
            results = []
            for row in cursor.fetchall():
                results.append({
                    'cardName': row['card_name'],
                    'totalEntries': row['total_entries'],
                    'totalDecks': row['total_decks'],
                    'totalTournaments': row['total_tournaments'],
                    'avgWinRate': row['avg_win_rate'] or 0.0,
                    'avgStanding': row['avg_standing'] or 0.0,
                    'firstSeen': row['first_seen'],
                    'lastSeen': row['last_seen']
                })
            
            return results
            
        finally:
            cursor.close()
            conn.close()
    
    def get_player_card_preferences(self, player_name: str = None, min_usage: int = 2, limit: int = 50) -> List[Dict[str, Any]]:
        """Get player card preferences (GraphQL-friendly)."""
        conn = self.connect()
        cursor = conn.cursor()
        
        try:
            query = """
            SELECT 
                player_name,
                card_name,
                COUNT(*) as times_played,
                COUNT(DISTINCT tournament_id) as tournaments_played,
                AVG(deck_win_rate) as avg_performance,
                MAX(tournament_date) as last_played
            FROM card_entries
            WHERE player_name IS NOT NULL
            """
            
            params = []
            if player_name:
                query += " AND player_name = ?"
                params.append(player_name)
            
            query += """
            GROUP BY player_name, card_name
            HAVING times_played >= ?
            ORDER BY times_played DESC, avg_performance DESC
            LIMIT ?
            """
            params.extend([min_usage, limit])
            
            cursor.execute(query, params)
            
            results = []
            for row in cursor.fetchall():
                results.append({
                    'playerName': row['player_name'],
                    'cardName': row['card_name'],
                    'timesPlayed': row['times_played'],
                    'tournamentsPlayed': row['tournaments_played'],
                    'avgPerformance': row['avg_performance'] or 0.0,
                    'lastPlayed': row['last_played']
                })
            
            return results
            
        finally:
            cursor.close()
            conn.close()
    
    def get_commander_meta(self, limit: int = 50, format_filter: str = "EDH") -> List[Dict[str, Any]]:
        """Get commander meta breakdown (GraphQL-friendly)."""
        conn = self.connect()
        cursor = conn.cursor()
        
        try:
            query = """
            SELECT 
                d.commander_1,
                d.commander_2,
                COUNT(DISTINCT d.deck_id) as deck_count,
                AVG(d.win_rate) as avg_win_rate,
                COUNT(CASE WHEN d.standing <= 8 THEN 1 END) as top_8_count,
                MAX(ce.tournament_date) as last_seen
            FROM decks d
            JOIN card_entries ce ON d.deck_id = ce.deck_id
            WHERE d.commander_1 IS NOT NULL
            """
            
            params = []
            if format_filter:
                query += " AND ce.tournament_format = ?"
                params.append(format_filter)
            
            query += """
            GROUP BY d.commander_1, d.commander_2
            HAVING deck_count >= 3
            ORDER BY deck_count DESC
            LIMIT ?
            """
            params.append(limit)
            
            cursor.execute(query, params)
            
            results = []
            for row in cursor.fetchall():
                results.append({
                    'commander1': row['commander_1'],
                    'commander2': row['commander_2'],
                    'deckCount': row['deck_count'],
                    'avgWinRate': row['avg_win_rate'] or 0.0,
                    'top8Count': row['top_8_count'],
                    'lastSeen': row['last_seen']
                })
            
            return results
            
        finally:
            cursor.close()
            conn.close()
    
    def get_card_trends(self, days: int = 30, limit: int = 20) -> List[Dict[str, Any]]:
        """Get trending cards (GraphQL-friendly)."""
        conn = self.connect()
        cursor = conn.cursor()
        
        try:
            query = """
            SELECT 
                card_name,
                COUNT(CASE WHEN tournament_date >= date('now', '-{} days') THEN 1 END) as entries_recent,
                COUNT(CASE WHEN tournament_date >= date('now', '-{} days') 
                           AND tournament_date < date('now', '-{} days') THEN 1 END) as entries_previous,
                COUNT(*) as total_entries
            FROM card_entries
            WHERE tournament_date >= date('now', '-{} days')
            GROUP BY card_name
            HAVING entries_recent >= 3
            ORDER BY entries_recent DESC
            LIMIT ?
            """.format(days, days * 2, days, days * 2)
            
            cursor.execute(query, (limit,))
            
            results = []
            for row in cursor.fetchall():
                growth_rate = 0.0
                if row['entries_previous'] > 0:
                    growth_rate = ((row['entries_recent'] - row['entries_previous']) / row['entries_previous']) * 100
                
                results.append({
                    'cardName': row['card_name'],
                    'entriesRecent': row['entries_recent'],
                    'entriesPrevious': row['entries_previous'],
                    'totalEntries': row['total_entries'],
                    'growthRate': growth_rate
                })
            
            return results
            
        finally:
            cursor.close()
            conn.close()
    
    def get_tournaments_summary(self) -> Dict[str, Any]:
        """Get tournament summary statistics (perfect for GraphQL root queries)."""
        conn = self.connect()
        cursor = conn.cursor()
        
        try:
            # Get basic counts
            cursor.execute("SELECT COUNT(*) FROM tournaments")
            total_tournaments = cursor.fetchone()[0]
            
            cursor.execute("SELECT COUNT(*) FROM decks")
            total_decks = cursor.fetchone()[0]
            
            cursor.execute("SELECT COUNT(*) FROM card_entries")
            total_card_entries = cursor.fetchone()[0]
            
            cursor.execute("SELECT COUNT(DISTINCT card_name) FROM card_entries")
            unique_cards = cursor.fetchone()[0]
            
            cursor.execute("SELECT COUNT(DISTINCT player_name) FROM card_entries WHERE player_name IS NOT NULL")
            unique_players = cursor.fetchone()[0]
            
            # Get latest tournament date
            cursor.execute("SELECT MAX(tournament_date) FROM card_entries")
            latest_tournament = cursor.fetchone()[0]
            
            return {
                'totalTournaments': total_tournaments,
                'totalDecks': total_decks,
                'totalCardEntries': total_card_entries,
                'uniqueCards': unique_cards,
                'uniquePlayers': unique_players,
                'latestTournament': latest_tournament,
                'databasePath': self.db_path,
                'databaseSize': os.path.getsize(self.db_path) if os.path.exists(self.db_path) else 0
            }
            
        finally:
            cursor.close()
            conn.close()
    
    def _parse_player_deck(self, tournament: Dict, standing_data: Dict) -> Optional[ParsedDeck]:
        """Parse a player's deck from tournament standing data."""
        player_name = standing_data.get('name', '').strip()
        if not player_name:
            return None
            
        # Get decklist
        decklist_raw = standing_data.get('decklist', '')
        deck_obj = standing_data.get('deckObj')
        
        # Parse cards from decklist
        card_entries = []
        if deck_obj:
            card_entries = self.parser.parse_deck_object(deck_obj)
        elif decklist_raw:
            card_entries = self.parser.parse_decklist_text(decklist_raw)
        
        if not card_entries:  # Skip if no cards found
            return None
        
        # Extract commanders
        commanders = self.parser.extract_commanders(card_entries)
        
        # Create ParsedDeck object
        return ParsedDeck(
            tournament_id=tournament.get('TID'),
            player_id=standing_data.get('id'),
            player_name=player_name,
            standing=standing_data.get('standing', 0),
            wins=standing_data.get('wins', 0),
            losses=standing_data.get('losses', 0),
            draws=standing_data.get('draws', 0),
            wins_swiss=standing_data.get('winsSwiss', 0),
            losses_swiss=standing_data.get('lossesSwiss', 0),
            wins_bracket=standing_data.get('winsBracket', 0),
            losses_bracket=standing_data.get('lossesBracket', 0),
            win_rate=standing_data.get('winRate', 0.0),
            byes=standing_data.get('byes', 0),
            decklist_raw=decklist_raw,
            commanders=commanders,
            deck_colors=self.parser.determine_deck_colors(commanders, card_entries),
            card_entries=card_entries
        )
    
    def _insert_tournament(self, cursor: sqlite3.Cursor, tournament: Dict):
        """Insert tournament into database."""
        tournament_id = tournament.get('TID')
        start_date = None
        if tournament.get('startDate'):
            start_date = datetime.fromtimestamp(tournament['startDate']).isoformat()
        
        event_data = tournament.get('eventData', {})
        has_decklists = any(player.get('decklist') for player in tournament.get('standings', []))
        
        cursor.execute("""
            INSERT OR IGNORE INTO tournaments 
            (tournament_id, tournament_name, game, format, start_date, swiss_rounds, 
             top_cut, total_players, location_city, location_state, location_venue, has_decklists)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            tournament_id,
            tournament.get('tournamentName'),
            tournament.get('game'),
            tournament.get('format'),
            start_date,
            tournament.get('swissNum'),
            tournament.get('topCut'),
            len(tournament.get('standings', [])),
            event_data.get('city'),
            event_data.get('state'),
            event_data.get('location'),
            has_decklists
        ))
    
    def _insert_player(self, cursor: sqlite3.Cursor, player_id: str, player_name: str):
        """Insert or update player in database."""
        cursor.execute("""
            INSERT OR REPLACE INTO players (player_id, player_name, total_tournaments, last_seen)
            VALUES (?, ?, 
                COALESCE((SELECT total_tournaments FROM players WHERE player_id = ?), 0) + 1,
                CURRENT_TIMESTAMP)
        """, (player_id, player_name, player_id))
    
    def _insert_deck(self, cursor: sqlite3.Cursor, deck: ParsedDeck):
        """Insert deck into database."""
        deck_id = self.generate_deck_id(deck.tournament_id, deck.player_name, deck.player_id)
        
        commander_1 = deck.commanders[0] if len(deck.commanders) > 0 else None
        commander_2 = deck.commanders[1] if len(deck.commanders) > 1 else None
        total_cards = sum(entry.quantity for entry in deck.card_entries)
        
        cursor.execute("""
            INSERT OR IGNORE INTO decks 
            (deck_id, tournament_id, player_id, player_name, standing, wins, losses, draws,
             wins_swiss, losses_swiss, wins_bracket, losses_bracket, win_rate, byes,
             decklist_raw, commander_1, commander_2, deck_colors, total_cards)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            deck_id, deck.tournament_id, deck.player_id, deck.player_name,
            deck.standing, deck.wins, deck.losses, deck.draws,
            deck.wins_swiss, deck.losses_swiss, deck.wins_bracket, deck.losses_bracket,
            deck.win_rate, deck.byes, deck.decklist_raw,
            commander_1, commander_2, deck.deck_colors, total_cards
        ))
    
    def _insert_card_entries(self, cursor: sqlite3.Cursor, deck: ParsedDeck) -> int:
        """Insert all card entries for a deck."""
        if not deck.card_entries:
            return 0
            
        deck_id = self.generate_deck_id(deck.tournament_id, deck.player_name, deck.player_id)
        tournament_date = date.today().isoformat()  # Default to today
        
        entries_added = 0
        for entry in deck.card_entries:
            # Generate card_id if not present
            card_id = entry.card_id or self._generate_card_id(entry.card_name)
            
            cursor.execute("""
                INSERT OR IGNORE INTO card_entries
                (card_id, card_name, deck_id, tournament_id, player_id, player_name,
                 quantity, deck_section, tournament_date, tournament_format,
                 deck_standing, deck_win_rate)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                card_id, entry.card_name, deck_id, deck.tournament_id,
                deck.player_id, deck.player_name, entry.quantity, entry.section,
                tournament_date, "EDH",  # TODO: get from tournament data
                deck.standing, deck.win_rate
            ))
            entries_added += 1
            
        return entries_added
    
    def _generate_card_id(self, card_name: str) -> str:
        """Generate a card ID from card name."""
        return hashlib.sha256(card_name.encode()).hexdigest()[:16]
    
    def _update_card_statistics(self, cursor: sqlite3.Cursor):
        """Update the card_statistics table with current data."""
        cursor.execute("""
            INSERT OR REPLACE INTO card_statistics 
            (card_id, card_name, total_entries, total_decks, total_tournaments,
             first_seen, last_seen, avg_deck_win_rate, avg_deck_standing)
            SELECT 
                ce.card_id,
                ce.card_name,
                COUNT(*) as total_entries,
                COUNT(DISTINCT ce.deck_id) as total_decks,
                COUNT(DISTINCT ce.tournament_id) as total_tournaments,
                MIN(ce.tournament_date) as first_seen,
                MAX(ce.tournament_date) as last_seen,
                AVG(ce.deck_win_rate) as avg_deck_win_rate,
                AVG(ce.deck_standing) as avg_deck_standing
            FROM card_entries ce
            GROUP BY ce.card_id, ce.card_name
        """)
    
    def _update_commander_pairings(self, cursor: sqlite3.Cursor):
        """Update commander pairings table with current data."""
        cursor.execute("""
            INSERT OR REPLACE INTO commander_pairings
            (commander_1, commander_2, tournament_format, deck_count, avg_win_rate, last_seen)
            SELECT 
                d.commander_1,
                d.commander_2,
                'EDH' as tournament_format,
                COUNT(*) as deck_count,
                AVG(d.win_rate) as avg_win_rate,
                MAX(ce.tournament_date) as last_seen
            FROM decks d
            JOIN card_entries ce ON d.deck_id = ce.deck_id
            WHERE d.commander_1 IS NOT NULL
            GROUP BY d.commander_1, d.commander_2
        """)