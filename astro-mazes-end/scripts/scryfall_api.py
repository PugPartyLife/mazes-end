#!/usr/bin/env python3
"""
Enhanced Scryfall API Client with CLI Support and Bulk Processing
Efficiently fetches card data following Scryfall API best practices.

Usage:
    python scryfall_api.py --input card_names.json --output cards_data.json
    python scryfall_api.py --cards "Lightning Bolt,Counterspell,Sol Ring" 
    python scryfall_api.py --db-path cards.db --input card_names.json
"""

import requests
import json
import sqlite3
import time
import argparse
import sys
import os
from typing import List, Dict, Optional, Tuple
from datetime import datetime
import logging
from threading import Lock


class OptimizedScryfallAPI:
    """
    Optimized Scryfall API client following official best practices:
    - Uses collection endpoint for bulk requests (75 cards per request)
    - Implements proper rate limiting (10 req/sec max)
    - Includes required headers
    - Multi-round retry with Unicode variant handling
    """
    
    def __init__(self, user_agent: str = "MTGTournamentAnalyzer/1.0", db_path: Optional[str] = None):
        """Initialize the optimized Scryfall API client"""
        self.db_path = db_path
        self.base_url = "https://api.scryfall.com"
        
        # Required headers per Scryfall API documentation
        self.headers = {
            "User-Agent": user_agent,
            "Accept": "application/json;q=0.9,*/*;q=0.8",
            "Content-Type": "application/json"
        }
        
        # Rate limiting: 10 requests per second max (100ms between requests)
        self.min_request_interval = 0.1  # 100ms as recommended by Scryfall
        self.last_request_time = 0
        self.rate_limit_lock = Lock()
        
        # Statistics
        self.requests_made = 0
        self.cards_found = 0
        self.cards_not_found = 0
        self.bulk_requests_made = 0
        self.individual_requests_made = 0
        
        # Setup logging
        logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
        self.logger = logging.getLogger(__name__)
        
        print(f"Scryfall API Client initialized")
        print(f"  User-Agent: {user_agent}")
        print(f"  Database: {db_path if db_path else 'JSON output only'}")
        print(f"  Rate Limit: {1/self.min_request_interval} requests/second max")
    
    def _wait_for_rate_limit(self) -> None:
        """Ensure we don't exceed Scryfall's 10 requests/second rate limit"""
        with self.rate_limit_lock:
            current_time = time.time()
            time_since_last = current_time - self.last_request_time
            
            if time_since_last < self.min_request_interval:
                sleep_time = self.min_request_interval - time_since_last
                time.sleep(sleep_time)
            
            self.last_request_time = time.time()
    
    def _make_request(self, method: str, url: str, **kwargs) -> Optional[Dict]:
        """Make a rate-limited request to the Scryfall API"""
        self._wait_for_rate_limit()
        self.requests_made += 1
        
        try:
            if method.upper() == 'POST':
                response = requests.post(url, headers=self.headers, timeout=30, **kwargs)
            else:
                response = requests.get(url, headers=self.headers, timeout=30, **kwargs)
            
            if response.status_code == 200:
                return response.json()
            elif response.status_code == 404:
                return None  # Not found
            elif response.status_code == 429:
                self.logger.warning("Rate limited by Scryfall - waiting longer...")
                time.sleep(1.0)  # Wait 1 second and retry once
                return self._make_request(method, url, **kwargs)
            else:
                self.logger.error(f"Scryfall API error {response.status_code}: {response.text}")
                return None
                
        except requests.RequestException as e:
            self.logger.error(f"Request failed: {e}")
            return None
    
    def fetch_cards_bulk(self, card_names: List[str]) -> Tuple[List[Dict], List[str]]:
        """
        Fetch multiple cards using Scryfall's collection endpoint (up to 75 per request)
        
        Args:
            card_names: List of card names to fetch (max 75)
            
        Returns:
            Tuple of (found_cards, not_found_names)
        """
        if len(card_names) > 75:
            raise ValueError("Scryfall collection endpoint accepts maximum 75 cards per request")
        
        # Build collection request payload
        identifiers = [{"name": name.strip()} for name in card_names]
        payload = {"identifiers": identifiers}
        
        url = f"{self.base_url}/cards/collection"
        self.logger.info(f"Making bulk request for {len(card_names)} cards...")
        
        result = self._make_request('POST', url, json=payload)
        
        if not result:
            return [], card_names  # All failed
        
        self.bulk_requests_made += 1
        found_cards = result.get('data', [])
        not_found = result.get('not_found', [])
        
        # Extract names of cards that weren't found
        not_found_names = [item.get('name', '') for item in not_found if 'name' in item]
        
        self.cards_found += len(found_cards)
        self.cards_not_found += len(not_found_names)
        
        self.logger.info(f"Bulk request complete: {len(found_cards)} found, {len(not_found_names)} not found")
        
        return found_cards, not_found_names
    
    def _generate_name_variants(self, card_name: str) -> List[str]:
        """Generate multiple variants of a card name to try with Scryfall API."""
        variants = [card_name]  # Start with original
        
        # Add cleaned version (readable for DB)
        clean_name = self._clean_card_name_for_storage(card_name)
        if clean_name != card_name:
            variants.append(clean_name)
        
        # Try with different apostrophe variants for API queries
        apostrophe_variants = [
            card_name.replace("'", "\u2019"),  # Right single quotation mark
            card_name.replace("'", "\u2018"),  # Left single quotation mark  
            card_name.replace("'", "\u00B4"),  # Acute accent
            card_name.replace("'", "\u02BC"),  # Modifier letter apostrophe
        ]
        
        # Try with different dash variants
        dash_variants = [
            card_name.replace("-", "\u2013"),  # En dash
            card_name.replace("-", "\u2014"),  # Em dash
        ]
        
        # Try without apostrophes entirely (for possessive names)
        no_apostrophe = card_name.replace("'", "").replace("'", "")
        if no_apostrophe != card_name:
            variants.append(no_apostrophe)
        
        # Add unique variants only
        all_variants = variants + apostrophe_variants + dash_variants
        return list(dict.fromkeys(all_variants))  # Remove duplicates while preserving order
    
    def _clean_card_name_for_storage(self, card_name: str) -> str:
        """Clean card name for readable storage in database."""
        # Convert all apostrophe variants to standard apostrophe
        name = card_name.replace('\u2019', "'")  # Right single quotation mark
        name = name.replace('\u2018', "'")       # Left single quotation mark
        name = name.replace('\u00B4', "'")       # Acute accent
        name = name.replace('\u02BC', "'")       # Modifier letter apostrophe
        name = name.replace('\u00e2\u20ac\u2122', "'")  # Malformed UTF-8
        
        # Convert dash variants to standard dash
        name = name.replace('\u2013', "-")       # En dash
        name = name.replace('\u2014', "-")       # Em dash
        
        # Remove extra whitespace
        name = ' '.join(name.split())
        
        return name.strip()

    def fetch_card_individual(self, card_name: str) -> Optional[Dict]:
        """
        Fetch a single card using fuzzy name matching with multiple name variants
        
        Args:
            card_name: Name of the card to fetch
            
        Returns:
            Card data dictionary or None if not found
        """
        variants = self._generate_name_variants(card_name)
        
        self.logger.debug(f"Trying {len(variants)} variants for: {card_name}")
        
        for i, variant in enumerate(variants):
            url = f"{self.base_url}/cards/named"
            params = {'fuzzy': variant.strip()}
            
            self.logger.debug(f"  Variant {i+1}: '{variant}'")
            
            result = self._make_request('GET', url, params=params)
            
            if result:
                self.individual_requests_made += 1
                self.cards_found += 1
                
                # Always store the clean, readable name in the result
                clean_name = self._clean_card_name_for_storage(card_name)
                result['name'] = clean_name  # Override with clean version
                
                self.logger.debug(f"  Success with variant {i+1}")
                return result
            
            # Small delay between variant attempts
            time.sleep(0.02)
        
        self.cards_not_found += 1
        self.logger.debug(f"  All variants failed for: {card_name}")
        return None
    
    def fetch_all_cards_optimized(self, card_names: List[str]) -> List[Dict]:
        """
        Optimally fetch all cards using multi-round retry strategy with intelligent batching
        
        Args:
            card_names: List of all card names to fetch
            
        Returns:
            List of card data dictionaries for found cards
        """
        all_cards = []
        total_cards = len(card_names)
        remaining_names = card_names.copy()
        
        self.logger.info(f"Starting optimized fetch for {total_cards} cards with multi-round retry...")
        
        # Round 1-3: Bulk requests with batching
        for round_num in range(1, 4):
            if not remaining_names:
                break
                
            self.logger.info(f"Round {round_num}: Processing {len(remaining_names)} cards in bulk...")
            
            chunk_size = 75
            found_this_round = []
            still_not_found = []
            
            # Process in chunks of 75 (Scryfall's bulk limit)
            for i in range(0, len(remaining_names), chunk_size):
                chunk = remaining_names[i:i + chunk_size]
                chunk_num = (i // chunk_size) + 1
                total_chunks = (len(remaining_names) + chunk_size - 1) // chunk_size
                
                self.logger.info(f"  Chunk {chunk_num}/{total_chunks} ({len(chunk)} cards)...")
                
                # Try bulk request
                found_cards, not_found_names = self.fetch_cards_bulk(chunk)
                found_this_round.extend(found_cards)
                still_not_found.extend(not_found_names)
                
                # Small delay between chunks
                time.sleep(0.1)
            
            all_cards.extend(found_this_round)
            remaining_names = still_not_found
            
            self.logger.info(f"Round {round_num} complete: {len(found_this_round)} found, {len(remaining_names)} remaining")
            
            # If we didn't find many new cards this round, break early
            if len(found_this_round) < 5 and round_num > 1:
                self.logger.info(f"Low success rate in round {round_num}, moving to individual requests")
                break
        
        # Final round: Individual fuzzy matching for remaining cards
        if remaining_names:
            self.logger.info(f"Final round: Individual fuzzy matching for {len(remaining_names)} cards...")
            
            found_individual = []
            final_not_found = []
            
            for i, card_name in enumerate(remaining_names, 1):
                if i % 10 == 0:
                    self.logger.info(f"  Individual requests: {i}/{len(remaining_names)}")
                
                individual_result = self.fetch_card_individual(card_name)
                if individual_result:
                    found_individual.append(individual_result)
                else:
                    final_not_found.append(card_name)
                
                # Rate limiting for individual requests
                time.sleep(0.05)
            
            all_cards.extend(found_individual)
            self.logger.info(f"Individual requests complete: {len(found_individual)} found, {len(final_not_found)} permanently not found")
            
            # Store missing cards for later review
            if final_not_found:
                self._save_missing_cards(final_not_found)
        
        processed = len(all_cards)
        self.logger.info(f"Multi-round fetch complete: {processed}/{total_cards} cards found")
        self._print_statistics()
        
        return all_cards
    
    def _save_missing_cards(self, missing_cards: List[str]) -> None:
        """Save missing card names to a JSON file for review."""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"missing_cards_{timestamp}.json"
        
        missing_data = {
            "metadata": {
                "timestamp": datetime.now().isoformat(),
                "total_missing": len(missing_cards),
                "description": "Cards that could not be found in Scryfall after all retry attempts"
            },
            "missing_cards": sorted(missing_cards)
        }
        
        try:
            with open(filename, 'w', encoding='utf-8') as f:
                json.dump(missing_data, f, indent=2, ensure_ascii=False)
            
            print(f"Missing cards saved to: {filename}")
            
        except Exception as e:
            self.logger.error(f"Error saving missing cards file: {e}")
    
    def _print_statistics(self):
        """Print API usage statistics"""
        print(f"\nAPI Usage Statistics:")
        print(f"  Total API requests: {self.requests_made}")
        print(f"  Bulk requests: {self.bulk_requests_made}")
        print(f"  Individual requests: {self.individual_requests_made}")
        print(f"  Cards found: {self.cards_found}")
        print(f"  Cards not found: {self.cards_not_found}")
        if (self.cards_found + self.cards_not_found) > 0:
            print(f"  Success rate: {self.cards_found/(self.cards_found + self.cards_not_found)*100:.1f}%")
    
    def _determine_card_type(self, type_line: str) -> str:
        """Determine primary card type from type line."""
        type_lower = type_line.lower()
        
        if 'legendary' in type_lower and 'creature' in type_lower:
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
    
    def parse_card_data(self, card_data: Dict) -> Dict:
        """Parse Scryfall card data into standardized format matching the database schema"""
        now = datetime.now().isoformat()
        
        # Handle double-faced cards - use front face for most data
        if card_data.get('layout') in ['transform', 'modal_dfc', 'double_faced_token']:
            face_data = card_data.get('card_faces', [{}])[0]
            mana_cost = face_data.get('mana_cost', card_data.get('mana_cost', ''))
            type_line = face_data.get('type_line', card_data.get('type_line', ''))
            oracle_text = face_data.get('oracle_text', card_data.get('oracle_text', ''))
            power = face_data.get('power')
            toughness = face_data.get('toughness')
            flavor_text = face_data.get('flavor_text', card_data.get('flavor_text', ''))
        else:
            mana_cost = card_data.get('mana_cost', '')
            type_line = card_data.get('type_line', '')
            oracle_text = card_data.get('oracle_text', '')
            power = card_data.get('power')
            toughness = card_data.get('toughness')
            flavor_text = card_data.get('flavor_text', '')
        
        return {
            'card_name': card_data['name'],
            'scryfall_id': card_data['id'],
            'mana_cost': mana_cost,
            'cmc': card_data.get('cmc', 0),
            'type_line': type_line,
            'oracle_text': oracle_text,
            'power': power,
            'toughness': toughness,
            
            # Color information (as JSON strings)
            'colors': json.dumps(card_data.get('colors', [])),
            'color_identity': json.dumps(card_data.get('color_identity', [])),
            
            # Multi-face card data (as JSON strings)
            'layout': card_data.get('layout'),
            'card_faces': json.dumps(self._extract_card_faces(card_data)),  # Convert to JSON string
            
            # All image URLs (as JSON string)
            'image_uris': json.dumps(self._get_all_image_urls(card_data)),  # Convert to JSON string
            
            # Additional fields
            'component': card_data.get('component'),
            'rarity': card_data.get('rarity'),
            'flavor_text': flavor_text,
            'artist': card_data.get('artist'),
            
            # Custom card rating metrics (initialize as None - to be populated later)
            'salt': None,           # Salt score (0-4 scale like EDHREC)
            'card_power': None,     # Card power level rating
            'versatility': None,    # How flexible/versatile the card is
            'popularity': None,     # Popularity rating/score
            'price': None,          # General price level (0-5 scale)
            
            # Scryfall URIs
            'scryfall_uri': card_data.get('scryfall_uri'),
            'uri': card_data.get('uri'),
            'rulings_uri': card_data.get('rulings_uri'),
            'prints_search_uri': card_data.get('prints_search_uri'),
            
            # Set information
            'set_code': card_data.get('set'),
            'set_name': card_data.get('set_name'),
            'collector_number': card_data.get('collector_number'),
            
            # Normalized card type
            'card_type': self._determine_card_type(type_line),
            
            # Price information (actual USD price)
            'price_usd': self._get_usd_price(card_data),
            'price_updated': now,
            
            # Timestamps
            'first_seen': now,
            'last_updated': now
        }

    
    def _get_all_image_urls(self, card_data: Dict) -> Dict[str, str]:
        """Extract all available image URLs from Scryfall image data"""
        all_images = {}
        
        # Get image URIs from main card
        image_uris = card_data.get('image_uris', {})
        
        # For double-faced cards, get images from all faces
        if not image_uris and 'card_faces' in card_data:
            # For multi-face cards, we'll store images from all faces
            for i, face in enumerate(card_data['card_faces']):
                face_images = face.get('image_uris', {})
                for size, url in face_images.items():
                    # Prefix with face number for multi-face cards
                    key = f"face_{i}_{size}" if len(card_data['card_faces']) > 1 else size
                    all_images[key] = url
        else:
            # Single-faced card
            all_images = image_uris.copy()
        
        return all_images
    
    def _extract_card_faces(self, card_data: Dict) -> List[Dict]:
        """Extract card faces data for multi-face cards"""
        if 'card_faces' not in card_data:
            return []
        
        faces = []
        for face in card_data['card_faces']:
            face_info = {
                'name': face.get('name', ''),
                'mana_cost': face.get('mana_cost', ''),
                'type_line': face.get('type_line', ''),
                'oracle_text': face.get('oracle_text', ''),
                'power': face.get('power'),
                'toughness': face.get('toughness'),
                'colors': json.dumps(face.get('colors', [])),
                'flavor_text': face.get('flavor_text', ''),
                'image_uris': face.get('image_uris', {})
            }
            faces.append(face_info)
        
        return faces
    
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
    
    def process_cards(self, card_names: List[str], output_format: str = 'json') -> Dict:
        """
        Process a list of card names and return results
        
        Args:
            card_names: List of card names to process
            output_format: 'json' or 'database'
            
        Returns:
            Dictionary with processing results and card data
        """
        # Remove duplicates while preserving order
        unique_names = list(dict.fromkeys(card_names))
        
        print(f"\nProcessing {len(unique_names)} unique cards (from {len(card_names)} total names)...")
        
        # Fetch card data optimally
        raw_cards = self.fetch_all_cards_optimized(unique_names)
        
        # Parse card data
        parsed_cards = []
        for raw_card in raw_cards:
            try:
                parsed_card = self.parse_card_data(raw_card)
                parsed_cards.append(parsed_card)
            except Exception as e:
                self.logger.error(f"Error parsing card {raw_card.get('name', 'unknown')}: {e}")
        
        # Store in database if requested
        if output_format == 'database' and self.db_path:
            self._store_cards_in_database(parsed_cards)
        
        # Create result summary
        found_names = {card['card_name'] for card in parsed_cards}
        not_found_names = [name for name in unique_names if name not in found_names]
        
        result = {
            'metadata': {
                'total_requested': len(card_names),
                'unique_requested': len(unique_names),
                'found_count': len(parsed_cards),
                'not_found_count': len(not_found_names),
                'success_rate': len(parsed_cards) / len(unique_names) * 100 if unique_names else 0,
                'timestamp': datetime.now().isoformat(),
                'api_requests_made': self.requests_made
            },
            'not_found_cards': not_found_names,
            'cards': parsed_cards
        }
        
        return result
    
    def _store_cards_in_database(self, cards: List[Dict]) -> None:
        """Store parsed cards in SQLite database matching the schema exactly"""
        if not self.db_path:
            return
        
        try:
            with sqlite3.connect(self.db_path) as conn:
                for card in cards:
                    sql = """
                    INSERT OR REPLACE INTO cards (
                        card_name, scryfall_id, mana_cost, cmc, type_line, oracle_text,
                        power, toughness, colors, color_identity, layout, card_faces,
                        image_uris, component, rarity, flavor_text, artist,
                        salt, card_power, versatility, popularity, price,
                        set_code, set_name, collector_number,
                        scryfall_uri, uri, rulings_uri, prints_search_uri,
                        card_type, price_usd, price_updated, 
                        first_seen, last_updated
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """
                    
                    conn.execute(sql, (
                        card['card_name'], 
                        card['scryfall_id'], 
                        card['mana_cost'], 
                        card['cmc'], 
                        card['type_line'], 
                        card['oracle_text'],
                        card['power'], 
                        card['toughness'], 
                        card['colors'],  # Already JSON string
                        card['color_identity'],  # Already JSON string
                        card['layout'], 
                        card['card_faces'],  # Already JSON string
                        card['image_uris'],  # Already JSON string
                        card['component'], 
                        card['rarity'],
                        card['flavor_text'], 
                        card['artist'],
                        card['salt'],  # Custom rating metrics (None for now)
                        card['card_power'],
                        card['versatility'],
                        card['popularity'],
                        card['price'],
                        card['set_code'], 
                        card['set_name'],
                        card['collector_number'],
                        card['scryfall_uri'], 
                        card['uri'], 
                        card['rulings_uri'],
                        card['prints_search_uri'],
                        card['card_type'], 
                        card['price_usd'], 
                        card['price_updated'],
                        card['first_seen'], 
                        card['last_updated']
                    ))
                
                conn.commit()
                self.logger.info(f"Stored {len(cards)} cards in database")
                
        except sqlite3.Error as e:
            self.logger.error(f"Database error: {e}")
    
    def read_card_names_from_json(self, json_file: str) -> List[str]:
        """Read card names from JSON file (supports tournament data JSON format)"""
        try:
            with open(json_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            # Handle different JSON formats
            if 'card_names' in data:
                # Format from tournament data pipeline
                return data['card_names']
            elif isinstance(data, list):  # this is what we are doing atm it accepts other data structures from topdeck basically
                # Simple list of card names
                clean_data = []
                filters = ["http://", "https://", "www.", "moxfield"]
                for card in data:
                    card = card.strip()
                    if card.startswith('[') or card.startswith('{') :
                        # self.logger.error(f"Invalid card name entry in list: {card}")
                        self.logger.debug(f"Invalid card name entry in list: {card}")
                        continue
                    clean_data.append(card)
                self.logger.info(f"cleaned {len(clean_data)} card names from list. total entries: {len(data)}")
                return clean_data
            elif 'cards' in data:
                # Existing card data format
                return [card.get('name', card.get('card_name', '')) for card in data['cards']]
            else:
                self.logger.error(f"Unrecognized JSON format in {json_file}")
                return []
                
        except (json.JSONDecodeError, FileNotFoundError, KeyError) as e:
            self.logger.error(f"Error reading {json_file}: {e}")
            return []


def main():
    """CLI interface for the Scryfall API client"""
    parser = argparse.ArgumentParser(
        description="Optimized Scryfall API Client with bulk processing support",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Process card names from tournament data
  python scryfall_api.py --input card_names_20241201_120000.json --output scryfall_data.json
  
  # Process specific cards with database storage
  python scryfall_api.py --cards "Lightning Bolt,Sol Ring,Mana Crypt" --db-path cards.db
  
  # Process from file to database
  python scryfall_api.py --input card_names.json --db-path tournament_cards.db
  
  # JSON output only (no database)
  python scryfall_api.py --input card_names.json --output detailed_cards.json
        """
    )
    
    parser.add_argument('--input', '-i',
                       help='Input JSON file with card names (from tournament data pipeline)')
    
    parser.add_argument('--output', '-o',
                       help='Output JSON file for card data')
    
    parser.add_argument('--cards', '-c',
                       help='Comma-separated list of card names to process')
    
    parser.add_argument('--db-path', '-d',
                       help='SQLite database path for storing results')
    
    parser.add_argument('--user-agent', 
                       default='MTGTournamentAnalyzer/1.0',
                       help='Custom User-Agent header')
    
    parser.add_argument('--verbose', '-v',
                       action='store_true',
                       help='Enable verbose logging')
    
    args = parser.parse_args()
    
    # Validate arguments
    if not any([args.input, args.cards]):
        parser.error("Must specify either --input or --cards")
    
    if not any([args.output, args.db_path]):
        parser.error("Must specify either --output or --db-path")
    
    # Setup logging level
    if args.verbose:
        logging.getLogger().setLevel(logging.DEBUG)
    
    # Initialize API client
    api = OptimizedScryfallAPI(user_agent=args.user_agent, db_path=args.db_path)
    
    # Get card names
    card_names = []
    
    if args.input:
        print(f"Reading card names from {args.input}...")
        card_names = api.read_card_names_from_json(args.input)
        
        if not card_names:
            print(f"Error: No card names found in {args.input}")
            sys.exit(1)
            
        print(f"Loaded {len(card_names)} card names from JSON file")
    
    elif args.cards:
        card_names = [name.strip() for name in args.cards.split(',')]
        print(f"Processing {len(card_names)} card names from command line")
    
    # Process cards
    output_format = 'database' if args.db_path else 'json'
    result = api.process_cards(card_names, output_format)
    
    # Output results
    if args.output:
        with open(args.output, 'w', encoding='utf-8') as f:
            json.dump(result, f, indent=2, ensure_ascii=False)
        
        file_size = os.path.getsize(args.output)
        print(f"\nResults saved to {args.output} ({file_size:,} bytes)")
    
    # Print summary
    metadata = result['metadata']
    print(f"\nProcessing Summary:")
    print(f"  Cards requested: {metadata['total_requested']:,}")
    print(f"  Unique cards: {metadata['unique_requested']:,}")
    print(f"  Cards found: {metadata['found_count']:,}")
    print(f"  Cards not found: {metadata['not_found_count']:,}")
    print(f"  Success rate: {metadata['success_rate']:.1f}%")
    print(f"  API requests made: {metadata['api_requests_made']:,}")
    
    if result['not_found_cards']:
        print(f"\nCards not found ({len(result['not_found_cards'])}):")
        for name in result['not_found_cards'][:10]:  # Show first 10
            print(f"  - {name}")
        if len(result['not_found_cards']) > 10:
            print(f"  ... and {len(result['not_found_cards']) - 10} more")
    
    if args.db_path:
        print(f"\nCard data stored in database: {args.db_path}")
    
    print(f"\nProcessing complete!")


if __name__ == "__main__":
    main()