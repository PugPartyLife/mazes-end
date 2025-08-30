import requests
import json
import sqlite3
import time
from typing import List, Dict, Optional, Tuple
from datetime import datetime
import logging

class ScryfallCardParser:
    """
    Parser to fetch card data from Scryfall API and populate MTG cards table
    """
    
    def __init__(self, db_path: Optional[str] = None, rate_limit_delay: float = 0.1):
        """
        Initialize parser with optional database connection
        
        Args:
            db_path: Path to SQLite database (optional - if None, only JSON output)
            rate_limit_delay: Delay between API requests (Scryfall allows 10 req/sec)
        """
        self.db_path = db_path
        self.rate_limit_delay = rate_limit_delay
        self.base_url = "https://api.scryfall.com/cards/named"
        
        # Setup logging
        logging.basicConfig(level=logging.INFO)
        self.logger = logging.getLogger(__name__)
        
    def fetch_card_data(self, card_name: str) -> Optional[Dict]:
        """
        Fetch card data from Scryfall API using fuzzy name matching
        
        Args:
            card_name: Name of the card to fetch
            
        Returns:
            Dictionary with card data or None if not found
        """
        try:
            params = {'fuzzy': card_name}
            response = requests.get(self.base_url, params=params, timeout=10)
            
            if response.status_code == 200:
                return response.json()
            elif response.status_code == 404:
                self.logger.warning(f"Card not found: {card_name}")
                return None
            else:
                self.logger.error(f"API error for {card_name}: {response.status_code}")
                return None
                
        except requests.RequestException as e:
            self.logger.error(f"Request failed for {card_name}: {e}")
            return None
        except json.JSONDecodeError as e:
            self.logger.error(f"JSON decode error for {card_name}: {e}")
            return None
    
    def parse_card_data(self, card_data: Dict) -> Dict:
        """
        Parse Scryfall card data into format matching our database schema
        
        Args:
            card_data: Raw card data from Scryfall API
            
        Returns:
            Dictionary with parsed card data for database insertion
        """
        # Get current timestamp
        now = datetime.now().isoformat()
        
        # Handle double-faced cards - use front face for most data
        if card_data.get('layout') in ['transform', 'modal_dfc', 'double_faced_token']:
            face_data = card_data.get('card_faces', [{}])[0]
            mana_cost = face_data.get('mana_cost', card_data.get('mana_cost', ''))
            type_line = face_data.get('type_line', card_data.get('type_line', ''))
            oracle_text = face_data.get('oracle_text', card_data.get('oracle_text', ''))
            power = face_data.get('power')
            toughness = face_data.get('toughness')
        else:
            mana_cost = card_data.get('mana_cost', '')
            type_line = card_data.get('type_line', '')
            oracle_text = card_data.get('oracle_text', '')
            power = card_data.get('power')
            toughness = card_data.get('toughness')
        
        # Determine card type booleans
        type_lower = type_line.lower()
        
        # Handle flavor text for double-faced cards
        if card_data.get('layout') in ['transform', 'modal_dfc', 'double_faced_token']:
            face_data = card_data.get('card_faces', [{}])[0]
            flavor_text = face_data.get('flavor_text', card_data.get('flavor_text', ''))
        else:
            flavor_text = card_data.get('flavor_text', '')
        
        parsed_data = {
            'card_name': card_data['name'],
            'mana_cost': mana_cost,
            'cmc': card_data.get('cmc', 0),
            'type_line': type_line,
            'oracle_text': oracle_text,
            'power': power,
            'toughness': toughness,
            
            # Color information - store as JSON strings
            'colors': json.dumps(card_data.get('colors', [])),
            'color_identity': json.dumps(card_data.get('color_identity', [])),
            
            # New fields
            'component': card_data.get('component'),  # e.g., "token", "meld_part", etc.
            'rarity': card_data.get('rarity'),  # e.g., "common", "uncommon", "rare", "mythic"
            'flavor_text': flavor_text,
            'image_small': self._get_smallest_image_url(card_data),
            
            # Card type flags
            'is_commander': 'legendary' in type_lower and 'creature' in type_lower,
            'is_basic_land': card_data.get('type_line', '').startswith('Basic Land'),
            'is_artifact': 'artifact' in type_lower,
            'is_creature': 'creature' in type_lower,
            'is_instant': 'instant' in type_lower,
            'is_sorcery': 'sorcery' in type_lower,
            'is_enchantment': 'enchantment' in type_lower,
            'is_planeswalker': 'planeswalker' in type_lower,
            
            # Price information
            'price_usd': self._get_usd_price(card_data),
            'price_updated': now,
            
            # Timestamps
            'first_seen': now,
            'last_updated': now
        }
        
        return parsed_data
    
    def _get_smallest_image_url(self, card_data: Dict) -> Optional[str]:
        """Extract the smallest available image URL from Scryfall image data"""
        image_uris = card_data.get('image_uris', {})
        
        # For double-faced cards, get image from first face
        if not image_uris and 'card_faces' in card_data:
            face_data = card_data.get('card_faces', [{}])[0]
            image_uris = face_data.get('image_uris', {})
        
        # Priority order for smallest images (Scryfall sizes)
        size_priority = ['small', 'normal', 'large', 'png', 'art_crop', 'border_crop']
        
        for size in size_priority:
            if size in image_uris:
                return image_uris[size]
        
        return None
    
    def _get_usd_price(self, card_data: Dict) -> Optional[float]:
        """Extract USD price from Scryfall price data"""
        prices = card_data.get('prices', {})
        usd_price = prices.get('usd')
        
        if usd_price and usd_price != 'null':
            try:
                return float(usd_price)
            except (ValueError, TypeError):
                pass
        
        return None
    
    def insert_card(self, card_data: Dict) -> bool:
        """
        Insert parsed card data into database
        
        Args:
            card_data: Parsed card data dictionary
            
        Returns:
            True if successful, False otherwise
        """
        if not self.db_path:
            self.logger.warning("No database path provided - skipping database insert")
            return True
            
        try:
            with sqlite3.connect(self.db_path) as conn:
                # Use INSERT OR REPLACE to handle duplicates
                sql = """
                INSERT OR REPLACE INTO cards (
                    card_name, mana_cost, cmc, type_line, oracle_text,
                    power, toughness, colors, color_identity,
                    component, rarity, flavor_text, image_small,
                    is_commander, is_basic_land, is_artifact, is_creature,
                    is_instant, is_sorcery, is_enchantment, is_planeswalker,
                    price_usd, price_updated, first_seen, last_updated
                ) VALUES (
                    ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 
                    COALESCE((SELECT first_seen FROM cards WHERE card_name = ?), ?), ?
                )
                """
                
                conn.execute(sql, (
                    card_data['card_name'], card_data['mana_cost'], card_data['cmc'],
                    card_data['type_line'], card_data['oracle_text'],
                    card_data['power'], card_data['toughness'], 
                    card_data['colors'], card_data['color_identity'],
                    card_data['component'], card_data['rarity'], 
                    card_data['flavor_text'], card_data['image_small'],
                    card_data['is_commander'], card_data['is_basic_land'],
                    card_data['is_artifact'], card_data['is_creature'],
                    card_data['is_instant'], card_data['is_sorcery'],
                    card_data['is_enchantment'], card_data['is_planeswalker'],
                    card_data['price_usd'], card_data['price_updated'],
                    card_data['card_name'], card_data['first_seen'], card_data['last_updated']
                ))
                
                conn.commit()
                return True
                
        except sqlite3.Error as e:
            self.logger.error(f"Database error inserting {card_data['card_name']}: {e}")
            return False
    
    def parse_card_list(self, card_names: List[str], return_json: bool = False) -> Tuple[List[str], List[str], Optional[List[Dict]]]:
        """
        Parse a list of card names and populate the database or return JSON
        
        Args:
            card_names: List of card names to fetch and parse
            return_json: If True, returns parsed data as JSON instead of writing to DB
            
        Returns:
            Tuple of (successful_cards, failed_cards, json_data)
            json_data is only populated when return_json=True
        """
        successful = []
        failed = []
        json_results = [] if return_json else None
        
        self.logger.info(f"Starting to parse {len(card_names)} cards...")
        
        for i, card_name in enumerate(card_names, 1):
            self.logger.info(f"Processing {i}/{len(card_names)}: {card_name}")
            
            # Fetch card data from Scryfall
            raw_data = self.fetch_card_data(card_name)
            
            if raw_data is None:
                failed.append(card_name)
                continue
            
            # Parse the data
            try:
                parsed_data = self.parse_card_data(raw_data)
                
                if return_json:
                    # Just add to JSON results
                    json_results.append(parsed_data)
                    successful.append(card_name)
                    self.logger.info(f"✓ Successfully parsed: {parsed_data['card_name']}")
                else:
                    # Insert into database
                    if self.insert_card(parsed_data):
                        successful.append(card_name)
                        self.logger.info(f"✓ Successfully added: {parsed_data['card_name']}")
                    else:
                        failed.append(card_name)
                    
            except Exception as e:
                self.logger.error(f"Error parsing {card_name}: {e}")
                failed.append(card_name)
            
            # Rate limiting
            time.sleep(self.rate_limit_delay)
        
        self.logger.info(f"Completed! Success: {len(successful)}, Failed: {len(failed)}")
        return successful, failed, json_results
    
    def get_cards_json(self, card_names: List[str]) -> Dict:
        """
        Convenience method to get cards as JSON with nice formatting
        
        Args:
            card_names: List of card names to fetch
            
        Returns:
            Dictionary with results and metadata
        """
        successful, failed, card_data = self.parse_card_list(card_names, return_json=True)
        
        return {
            'success_count': len(successful),
            'failed_count': len(failed),
            'failed_cards': failed,
            'cards': card_data,
            'timestamp': datetime.now().isoformat()
        }
    
    def update_card_prices(self, card_names: Optional[List[str]] = None) -> int:
        """
        Update prices for existing cards in database
        
        Args:
            card_names: Optional list of specific cards to update. If None, updates all cards.
            
        Returns:
            Number of cards successfully updated
        """
        if not self.db_path:
            self.logger.error("Cannot update prices without database path")
            return 0
            
        try:
            with sqlite3.connect(self.db_path) as conn:
                if card_names:
                    # Update specific cards
                    placeholders = ','.join(['?' for _ in card_names])
                    query = f"SELECT card_name FROM cards WHERE card_name IN ({placeholders})"
                    cursor = conn.execute(query, card_names)
                else:
                    # Update all cards
                    cursor = conn.execute("SELECT card_name FROM cards")
                
                existing_cards = [row[0] for row in cursor.fetchall()]
        
        except sqlite3.Error as e:
            self.logger.error(f"Database error getting card list: {e}")
            return 0
        
        updated_count = 0
        self.logger.info(f"Updating prices for {len(existing_cards)} cards...")
        
        for card_name in existing_cards:
            raw_data = self.fetch_card_data(card_name)
            
            if raw_data:
                price_usd = self._get_usd_price(raw_data)
                now = datetime.now().isoformat()
                
                try:
                    with sqlite3.connect(self.db_path) as conn:
                        conn.execute(
                            "UPDATE cards SET price_usd = ?, price_updated = ? WHERE card_name = ?",
                            (price_usd, now, card_name)
                        )
                        conn.commit()
                        updated_count += 1
                        
                except sqlite3.Error as e:
                    self.logger.error(f"Error updating price for {card_name}: {e}")
            
            time.sleep(self.rate_limit_delay)
        
        self.logger.info(f"Updated prices for {updated_count} cards")
        return updated_count


# Example usage
def main():
    # Test JSON output (no database required)
    parser = ScryfallCardParser()  # No database path
    
    # Example card list
    card_names = [
        'Lightning Bolt',
        'Sol Ring',
        'Pithing Needle',
        'Krenko, Mob Boss'
    ]
    
    # Get JSON output
    result = parser.get_cards_json(card_names)
    
    # Pretty print the results
    print("\n" + "="*60)
    print("CARD DATA RESULTS")
    print("="*60)
    print(f"Success: {result['success_count']}, Failed: {result['failed_count']}")
    
    if result['failed_cards']:
        print(f"Failed cards: {result['failed_cards']}")
    
    print("\nCard Details:")
    print("-" * 40)
    
    for card in result['cards']:
        print(f"\n🃏 {card['card_name']} ({card['rarity']})")
        print(f"   Type: {card['type_line']}")
        print(f"   Mana Cost: {card['mana_cost']} (CMC: {card['cmc']})")
        print(f"   Color Identity: {card['color_identity']}")
        
        # Show component if it exists (for tokens, etc.)
        if card['component']:
            print(f"   Component: {card['component']}")
        
        # Show power/toughness for creatures
        if card['power'] and card['toughness']:
            print(f"   Power/Toughness: {card['power']}/{card['toughness']}")
        
        # Show oracle text (truncated for readability)
        if card['oracle_text']:
            oracle_preview = card['oracle_text'][:150] + "..." if len(card['oracle_text']) > 150 else card['oracle_text']
            print(f"   Oracle Text: {oracle_preview}")
        
        # Show flavor text if available
        if card['flavor_text']:
            flavor_preview = card['flavor_text'][:100] + "..." if len(card['flavor_text']) > 100 else card['flavor_text']
            print(f"   Flavor: \"{flavor_preview}\"")
        
        # Show image URL
        if card['image_small']:
            print(f"   Image: {card['image_small']}")
        
        if card['price_usd']:
            print(f"   Price: ${card['price_usd']}")
        if card['is_commander']:
            print("   ⭐ Can be a commander!")
    
    # Example: Save to file
    with open('card_data.json', 'w') as f:
        json.dump(result, f, indent=2)
    print(f"\n💾 Full data saved to card_data.json")


def test_database_mode():
    """Example of using with database"""
    parser = ScryfallCardParser('tournament_data.db')
    
    card_names = ['Lightning Bolt', 'Counterspell']
    successful, failed, _ = parser.parse_card_list(card_names)
    
    print(f"Database mode - Success: {len(successful)}, Failed: {len(failed)}")


if __name__ == "__main__":
    main()