#!/usr/bin/env python3
"""
Enhanced Scryfall API Client with CLI Support and Bulk Processing
Efficiently fetches card data following Scryfall API best practices.

Usage:
    python scryfall_api.py --input card_names.json --output cards_data.json
    python scryfall_api.py --cards "Lightning Bolt,Counterspell,Sol Ring" 
    python scryfall_api.py --db-path cards.db --input card_names.json
    python scryfall_api.py --bulk-download  # Download complete Scryfall dataset
"""

import requests
import json
import sqlite3
import time
import argparse
import sys
import os
from typing import List, Dict, Optional, Tuple, Set
from datetime import datetime
import logging
from threading import Lock


class OptimizedScryfallAPI:
    """
    Optimized Scryfall API client following official best practices:
    - Uses collection endpoint for bulk requests (75 cards per request)
    - Implements proper rate limiting (10 req/sec max)
    - Includes required headers
    - Fallback to individual requests for failed lookups
    """
    
    def __init__(self, user_agent: str = "MTGTournamentAnalyzer/1.0", db_path: Optional[str] = None):
        """
        Initialize the optimized Scryfall API client
        
        Args:
            user_agent: Custom User-Agent header as required by Scryfall API
            db_path: Optional SQLite database path for storing results
        """
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
    
    def fetch_card_individual(self, card_name: str) -> Optional[Dict]:
        """
        Fetch a single card using fuzzy name matching (fallback for failed bulk requests)
        
        Args:
            card_name: Name of the card to fetch
            
        Returns:
            Card data dictionary or None if not found
        """
        url = f"{self.base_url}/cards/named"
        params = {'fuzzy': card_name.strip()}
        
        self.logger.debug(f"Individual request for: {card_name}")
        
        result = self._make_request('GET', url, params=params)
        
        if result:
            self.individual_requests_made += 1
            self.cards_found += 1
            return result
        else:
            self.cards_not_found += 1
            return None
    
    def fetch_all_cards_optimized(self, card_names: List[str]) -> List[Dict]:
        """
        Optimally fetch all cards using bulk requests with individual fallbacks
        
        Args:
            card_names: List of all card names to fetch
            
        Returns:
            List of card data dictionaries for found cards
        """
        all_cards = []
        total_cards = len(card_names)
        processed = 0
        
        self.logger.info(f"Starting optimized fetch for {total_cards} cards...")
        
        # Process in chunks of 75 (Scryfall's bulk limit)
        chunk_size = 75
        
        for i in range(0, len(card_names), chunk_size):
            chunk = card_names[i:i + chunk_size]
            chunk_num = (i // chunk_size) + 1
            total_chunks = (len(card_names) + chunk_size - 1) // chunk_size
            
            self.logger.info(f"Processing chunk {chunk_num}/{total_chunks} ({len(chunk)} cards)...")
            
            # Try bulk request first
            found_cards, not_found_names = self.fetch_cards_bulk(chunk)
            all_cards.extend(found_cards)
            processed += len(found_cards)
            
            # Fallback to individual requests for cards not found in bulk
            if not_found_names:
                self.logger.info(f"Retrying {len(not_found_names)} cards individually...")
                
                for card_name in not_found_names:
                    individual_result = self.fetch_card_individual(card_name)
                    if individual_result:
                        all_cards.append(individual_result)
                        processed += 1
                    
                    # Small delay between individual requests
                    time.sleep(0.05)
        
        self.logger.info(f"Fetch complete: {processed}/{total_cards} cards found")
        self._print_statistics()
        
        return all_cards
    
    def _print_statistics(self):
        """Print API usage statistics"""
        print(f"\nAPI Usage Statistics:")
        print(f"  Total API requests: {self.requests_made}")
        print(f"  Bulk requests: {self.bulk_requests_made}")
        print(f"  Individual requests: {self.individual_requests_made}")
        print(f"  Cards found: {self.cards_found}")
        print(f"  Cards not found: {self.cards_not_found}")
        print(f"  Success rate: {self.cards_found/(self.cards_found + self.cards_not_found)*100:.1f}%")
    
    def parse_card_data(self, card_data: Dict) -> Dict:
        """Parse Scryfall card data into standardized format"""
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
        
        # Determine card type booleans
        type_lower = type_line.lower()
        
        return {
            'card_name': card_data['name'],
            'scryfall_id': card_data['id'],
            'mana_cost': mana_cost,
            'cmc': card_data.get('cmc', 0),
            'type_line': type_line,
            'oracle_text': oracle_text,
            'power': power,
            'toughness': toughness,
            
            # Color information
            'colors': json.dumps(card_data.get('colors', [])),
            'color_identity': json.dumps(card_data.get('color_identity', [])),
            
            # Multi-face card data
            'layout': card_data.get('layout'),
            'card_faces': self._extract_card_faces(card_data),
            
            # All image URLs
            'image_uris': self._get_all_image_urls(card_data),
            
            # Additional fields
            'component': card_data.get('component'),
            'rarity': card_data.get('rarity'),
            'flavor_text': flavor_text,
            'artist': card_data.get('artist'),
            
            # Scryfall URIs
            'scryfall_uri': card_data.get('scryfall_uri'),
            'uri': card_data.get('uri'),
            'rulings_uri': card_data.get('rulings_uri'),
            'prints_search_uri': card_data.get('prints_search_uri'),
            
            # Card type flags
            'is_commander': 'legendary' in type_lower and 'creature' in type_lower,
            'is_basic_land': 'Basic Land' in card_data.get('type_line', ''),
            'is_artifact': 'artifact' in type_lower,
            'is_creature': 'creature' in type_lower,
            'is_instant': 'instant' in type_lower,
            'is_sorcery': 'sorcery' in type_lower,
            'is_enchantment': 'enchantment' in type_lower,
            'is_planeswalker': 'planeswalker' in type_lower,
            
            # Price information
            'price_usd': self._get_usd_price(card_data),
            'price_updated': now,
            
            # Set information
            'set_code': card_data.get('set'),
            'set_name': card_data.get('set_name'),
            'collector_number': card_data.get('collector_number'),
            
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
        """Store parsed cards in SQLite database"""
        if not self.db_path:
            return
        
        try:
            with sqlite3.connect(self.db_path) as conn:
                for card in cards:
                    sql = """
                    INSERT OR REPLACE INTO cards (
                        card_name, scryfall_id, mana_cost, cmc, type_line, oracle_text,
                        power, toughness, colors, color_identity, component, rarity, 
                        flavor_text, image_small, scryfall_uri, is_commander, is_basic_land, 
                        is_artifact, is_creature, is_instant, is_sorcery, is_enchantment, 
                        is_planeswalker, price_usd, price_updated, set_code, set_name, 
                        collector_number, first_seen, last_updated
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """
                    
                    conn.execute(sql, (
                        card['card_name'], card['scryfall_id'], card['mana_cost'], 
                        card['cmc'], card['type_line'], card['oracle_text'],
                        card['power'], card['toughness'], card['colors'], 
                        card['color_identity'], card['component'], card['rarity'],
                        card['flavor_text'], card['image_small'], card['scryfall_uri'],
                        card['is_commander'], card['is_basic_land'], card['is_artifact'],
                        card['is_creature'], card['is_instant'], card['is_sorcery'],
                        card['is_enchantment'], card['is_planeswalker'],
                        card['price_usd'], card['price_updated'], card['set_code'],
                        card['set_name'], card['collector_number'], 
                        card['first_seen'], card['last_updated']
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
            elif isinstance(data, list):
                # Simple list of card names
                return data
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