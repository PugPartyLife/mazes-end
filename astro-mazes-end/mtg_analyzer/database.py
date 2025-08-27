"""
Database operations for card-centric MTG tournament data.
"""

import hashlib
from datetime import datetime, date
from typing import Dict, List, Optional
import mysql.connector
from .models import ParsedDeck, CardStats, PlayerCardPreference, CommanderPairing
from .parser import DecklistParser


class CardDatabase:
    """Handles database operations for card-centric tournament data."""
    
    def __init__(self, connection_params: Dict):
        self.connection_params = connection_params
        self.parser = DecklistParser()
    
    def connect(self):
        """Establish database connection."""
        return mysql.connector.connect(**self.connection_params)
    
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
            
            # Update statistics tables
            print("Updating card statistics...")
            self._update_card_statistics(cursor)
            self._update_commander_pairings(cursor)
            conn.commit()
            
            return stats
            
        except Exception as e:
            conn.rollback()
            print(f"Database error: {e}")
            raise
        finally:
            cursor.close()
            conn.close()
    
    def get_top_cards(self, limit: int = 50) -> List[CardStats]:
        """Get most played cards."""
        conn = self.connect()
        cursor = conn.cursor(dictionary=True)
        
        try:
            query = """
            SELECT card_name, total_entries, total_decks, total_tournaments, 
                   avg_deck_win_rate, avg_deck_standing, first_seen, last_seen
            FROM card_statistics 
            ORDER BY total_entries DESC 
            LIMIT %s
            """
            cursor.execute(query, (limit,))
            
            results = []
            for row in cursor.fetchall():
                results.append(CardStats(
                    card_name=row['card_name'],
                    total_entries=row['total_entries'],
                    total_decks=row['total_decks'],
                    total_tournaments=row['total_tournaments'],
                    avg_win_rate=row['avg_deck_win_rate'] or 0.0,
                    avg_standing=row['avg_deck_standing'] or 0.0,
                    first_seen=row['first_seen'],
                    last_seen=row['last_seen']
                ))
            
            return results
            
        finally:
            cursor.close()
            conn.close()
    
    def get_player_preferences(self, player_name: str = None, min_usage: int = 2) -> List[PlayerCardPreference]:
        """Get player card preferences."""
        conn = self.connect()
        cursor = conn.cursor(dictionary=True)
        
        try:
            query = """
            SELECT player_name, card_name, times_played, tournaments_played, 
                   avg_performance, last_played
            FROM player_card_preferences 
            WHERE times_played >= %s
            """
            params = [min_usage]
            
            if player_name:
                query += " AND player_name = %s"
                params.append(player_name)
            
            query += " ORDER BY times_played DESC, avg_performance DESC"
            cursor.execute(query, params)
            
            results = []
            for row in cursor.fetchall():
                results.append(PlayerCardPreference(
                    player_name=row['player_name'],
                    card_name=row['card_name'],
                    times_played=row['times_played'],
                    tournaments_played=row['tournaments_played'],
                    avg_performance=row['avg_performance'] or 0.0,
                    last_played=row['last_played']
                ))
            
            return results
            
        finally:
            cursor.close()
            conn.close()
    
    def get_commander_meta(self, limit: int = 50) -> List[CommanderPairing]:
        """Get commander meta breakdown."""
        conn = self.connect()
        cursor = conn.cursor(dictionary=True)
        
        try:
            query = """
            SELECT commander_1, commander_2, tournament_format, deck_count, 
                   avg_win_rate, last_seen
            FROM commander_pairings 
            ORDER BY deck_count DESC 
            LIMIT %s
            """
            cursor.execute(query, (limit,))
            
            results = []
            for row in cursor.fetchall():
                results.append(CommanderPairing(
                    commander_1=row['commander_1'],
                    commander_2=row['commander_2'],
                    deck_count=row['deck_count'],
                    avg_win_rate=row['avg_win_rate'] or 0.0,
                    tournament_format=row['tournament_format'],
                    last_seen=row['last_seen']
                ))
            
            return results
            
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
    
    def _insert_tournament(self, cursor, tournament: Dict):
        """Insert tournament into database."""
        tournament_id = tournament.get('TID')
        start_date = None
        if tournament.get('startDate'):
            start_date = datetime.fromtimestamp(tournament['startDate'])
        
        event_data = tournament.get('eventData', {})
        
        # Check if tournament has any decklists
        has_decklists = any(player.get('decklist') for player in tournament.get('standings', []))
        
        query = """
        INSERT IGNORE INTO tournaments 
        (tournament_id, tournament_name, game, format, start_date, swiss_rounds, 
         top_cut, total_players, location_city, location_state, location_venue, has_decklists)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """
        
        values = (
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
        )
        
        cursor.execute(query, values)
    
    def _insert_player(self, cursor, player_id: str, player_name: str):
        """Insert or update player in database."""
        query = """
        INSERT INTO players (player_id, player_name, last_seen)
        VALUES (%s, %s, CURRENT_TIMESTAMP)
        ON DUPLICATE KEY UPDATE
            player_name = VALUES(player_name),
            total_tournaments = total_tournaments + 1,
            last_seen = CURRENT_TIMESTAMP
        """
        cursor.execute(query, (player_id, player_name))
    
    def _insert_deck(self, cursor, deck: ParsedDeck):
        """Insert deck into database."""
        deck_id = self.generate_deck_id(deck.tournament_id, deck.player_name, deck.player_id)
        
        query = """
        INSERT IGNORE INTO decks 
        (deck_id, tournament_id, player_id, player_name, standing, wins, losses, draws,
         wins_swiss, losses_swiss, wins_bracket, losses_bracket, win_rate, byes,
         decklist_raw, commander_1, commander_2, deck_colors, total_cards)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """
        
        commander_1 = deck.commanders[0] if len(deck.commanders) > 0 else None
        commander_2 = deck.commanders[1] if len(deck.commanders) > 1 else None
        total_cards = sum(entry.quantity for entry in deck.card_entries)
        
        values = (
            deck_id, deck.tournament_id, deck.player_id, deck.player_name,
            deck.standing, deck.wins, deck.losses, deck.draws,
            deck.wins_swiss, deck.losses_swiss, deck.wins_bracket, deck.losses_bracket,
            deck.win_rate, deck.byes, deck.decklist_raw,
            commander_1, commander_2, deck.deck_colors, total_cards
        )
        
        cursor.execute(query, values)
    
    def _insert_card_entries(self, cursor, deck: ParsedDeck) -> int:
        """Insert all card entries for a deck."""
        if not deck.card_entries:
            return 0
            
        deck_id = self.generate_deck_id(deck.tournament_id, deck.player_name, deck.player_id)
        tournament_date = date.today()  # Default to today, should be from tournament data
        
        query = """
        INSERT IGNORE INTO card_entries
        (card_id, card_name, deck_id, tournament_id, player_id, player_name,
         quantity, deck_section, tournament_date, tournament_format,
         deck_standing, deck_win_rate)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """
        
        entries_added = 0
        for entry in deck.card_entries:
            # Generate card_id if not present
            card_id = entry.card_id or self._generate_card_id(entry.card_name)
            
            values = (
                card_id, entry.card_name, deck_id, deck.tournament_id,
                deck.player_id, deck.player_name, entry.quantity, entry.section,
                tournament_date, "EDH",  # TODO: get from tournament data
                deck.standing, deck.win_rate
            )
            
            cursor.execute(query, values)
            entries_added += 1
            
        return entries_added
    
    def _generate_card_id(self, card_name: str) -> str:
        """Generate a card ID from card name (placeholder)."""
        return hashlib.sha256(card_name.encode()).hexdigest()[:16]
    
    def _update_card_statistics(self, cursor):
        """Update the card_statistics table with current data."""
        query = """
        INSERT INTO card_statistics 
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
        ON DUPLICATE KEY UPDATE
            total_entries = VALUES(total_entries),
            total_decks = VALUES(total_decks),
            total_tournaments = VALUES(total_tournaments),
            last_seen = VALUES(last_seen),
            avg_deck_win_rate = VALUES(avg_deck_win_rate),
            avg_deck_standing = VALUES(avg_deck_standing),
            updated_at = CURRENT_TIMESTAMP
        """
        cursor.execute(query)
    
    def _update_commander_pairings(self, cursor):
        """Update commander pairings table with current data."""
        query = """
        INSERT INTO commander_pairings
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
        ON DUPLICATE KEY UPDATE
            deck_count = VALUES(deck_count),
            avg_win_rate = VALUES(avg_win_rate),
            last_seen = VALUES(last_seen)
        """
        cursor.execute(query)