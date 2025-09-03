#!/usr/bin/env python3
"""
Commander Spellbook API Client
Fetches combo data for MTG cards from commanderspellbook.com
"""

import requests
import json
from typing import List, Dict, Optional, Set
from dataclasses import dataclass
import time
import logging


@dataclass
class ComboCard:
    """Represents a card in a combo."""
    name: str
    oracle_id: str
    
@dataclass
class Combo:
    """Represents a combo from Commander Spellbook."""
    combo_id: str
    cards: List[ComboCard]
    color_identity: str
    prerequisites: List[str]
    steps: List[str]
    results: List[str]
    
    
class CommanderSpellbookAPI:
    """Client for the Commander Spellbook API."""
    
    def __init__(self):
        self.base_url = "https://backend.commanderspellbook.com"
        self.session = requests.Session()
        self.logger = logging.getLogger(__name__)
        
        # Cache for combos to avoid repeated API calls
        self._combo_cache = {}
        self._card_to_combos = {}  # Map card names to combo IDs
        
    def test_api_structure(self) -> None:
        """Test method to examine the API response structure."""
        try:
            response = self.session.get(f"{self.base_url}/variants/")
            response.raise_for_status()
            
            data = response.json()
            print("API Response Structure:")
            print(f"  Total count: {data.get('count', 'N/A')}")
            print(f"  Results in this page: {len(data.get('results', []))}")
            
            # Examine first result if available
            results = data.get('results', [])
            if results:
                first_combo = results[0]
                print(f"\nFirst combo structure:")
                print(f"  Keys: {list(first_combo.keys())}")
                
                # Check the 'uses' structure
                if 'uses' in first_combo:
                    uses = first_combo['uses']
                    print(f"  'uses' field type: {type(uses)}")
                    if isinstance(uses, list) and uses:
                        print(f"  First 'use' structure:")
                        print(f"    Type: {type(uses[0])}")
                        if isinstance(uses[0], dict):
                            print(f"    Keys: {list(uses[0].keys())}")
                            if 'card' in uses[0]:
                                print(f"    'card' field type: {type(uses[0]['card'])}")
                                if isinstance(uses[0]['card'], dict):
                                    print(f"    Card keys: {list(uses[0]['card'].keys())}")
                
        except Exception as e:
            print(f"Error testing API: {e}")
        
    def get_all_combos(self, limit: Optional[int] = None) -> List[Dict]:
        """Fetch all combos from the API with pagination support."""
        try:
            combos = []
            next_url = f"{self.base_url}/variants/"
            page = 1
            
            while next_url:
                self.logger.info(f"Fetching page {page}...")
                response = self.session.get(next_url)
                response.raise_for_status()
                
                data = response.json()
                
                # Extract results from paginated response
                page_combos = data.get('results', [])
                combos.extend(page_combos)
                
                self.logger.info(f"Page {page}: {len(page_combos)} combos (total: {len(combos)})")
                
                # Cache the combos
                for combo in page_combos:
                    combo_id = str(combo.get('id', ''))
                    self._combo_cache[combo_id] = combo
                    
                    # Map cards to combos
                    for card_use in combo.get('uses', []):
                        if isinstance(card_use, dict):
                            card_info = card_use.get('card', {})
                            if isinstance(card_info, dict):
                                card_name = card_info.get('name', '')
                                if card_name:
                                    if card_name not in self._card_to_combos:
                                        self._card_to_combos[card_name] = []
                                    self._card_to_combos[card_name].append(combo_id)
                
                # Check if we should continue
                if limit and len(combos) >= limit:
                    self.logger.info(f"Reached limit of {limit} combos")
                    break
                
                # Get next page URL
                next_url = data.get('next')
                page += 1
                
                # Small delay to be nice to the API
                if next_url:
                    time.sleep(0.1)
            
            self.logger.info(f"Total combos fetched: {len(combos)}")
            return combos[:limit] if limit else combos
            
        except requests.RequestException as e:
            self.logger.error(f"Error fetching combos: {e}")
            return []
    
    def get_combos_for_card(self, card_name: str) -> List[Dict]:
        """Get all combos that include a specific card."""
        # Ensure cache is populated
        if not self._combo_cache:
            self.get_all_combos()
        
        # Get combo IDs for this card
        combo_ids = self._card_to_combos.get(card_name, [])
        
        # Return the full combo data
        combos = []
        for combo_id in combo_ids:
            if combo_id in self._combo_cache:
                combos.append(self._combo_cache[combo_id])
        
        return combos
    
    def get_combos_for_commander(self, commander_name: str) -> List[Dict]:
        """Get combos specifically for a commander."""
        combos = self.get_combos_for_card(commander_name)
        
        # Filter for combos where the commander is actually listed as a commander
        commander_combos = []
        for combo in combos:
            # Check if this card is marked as a commander in the combo
            for card in combo.get('uses', []):
                if (card.get('card', {}).get('name') == commander_name and 
                    card.get('must_be_commander', False)):
                    commander_combos.append(combo)
                    break
        
        return commander_combos
    
    def get_combos_for_multiple_cards(self, card_names: List[str]) -> List[Dict]:
        """Get combos that include ALL of the specified cards."""
        if not card_names:
            return []
        
        # Get combos for first card
        combos = self.get_combos_for_card(card_names[0])
        
        # Filter for combos that contain all cards
        for card_name in card_names[1:]:
            combos = [
                combo for combo in combos
                if any(
                    card.get('card', {}).get('name') == card_name 
                    for card in combo.get('uses', [])
                )
            ]
        
        return combos
    
    def search_combos(self, 
                     cards: Optional[List[str]] = None,
                     color_identity: Optional[str] = None,
                     result_keywords: Optional[List[str]] = None) -> List[Dict]:
        """Search for combos with various filters."""
        # Start with all combos if cache is empty
        if not self._combo_cache:
            self.get_all_combos()
        
        combos = list(self._combo_cache.values())
        
        # Filter by cards
        if cards:
            for card_name in cards:
                combos = [
                    combo for combo in combos
                    if any(
                        card.get('card', {}).get('name') == card_name 
                        for card in combo.get('uses', [])
                    )
                ]
        
        # Filter by color identity
        if color_identity:
            # Convert to set for comparison
            target_colors = set(color_identity.upper())
            combos = [
                combo for combo in combos
                if set(combo.get('identity', '')) <= target_colors
            ]
        
        # Filter by result keywords
        if result_keywords:
            filtered_combos = []
            for combo in combos:
                results_text = ' '.join([
                    result.get('name', '').lower() 
                    for result in combo.get('produces', [])
                ])
                
                if any(keyword.lower() in results_text for keyword in result_keywords):
                    filtered_combos.append(combo)
            
            combos = filtered_combos
        
        return combos
    
    def format_combo(self, combo: Dict) -> str:
        """Format a combo for display."""
        lines = []
        
        # Combo ID and link
        combo_id = combo.get('id', 'Unknown')
        lines.append(f"Combo #{combo_id}")
        lines.append(f"Link: https://commanderspellbook.com/combo/{combo_id}/")
        lines.append("")
        
        # Cards required
        lines.append("Cards Required:")
        for card in combo.get('uses', []):
            card_info = card.get('card', {})
            name = card_info.get('name', 'Unknown')
            zone = card.get('zone_locations', 'Unknown')
            battlefield_card_state = card.get('battlefield_card_state', '')
            
            card_line = f"  • {name}"
            if zone and zone != 'Battlefield':
                card_line += f" (in {zone})"
            if battlefield_card_state:
                card_line += f" [{battlefield_card_state}]"
            
            lines.append(card_line)
        
        lines.append("")
        
        # Color identity
        identity = combo.get('identity', '')
        if identity:
            lines.append(f"Color Identity: {identity}")
        else:
            lines.append("Color Identity: Colorless")
        
        # Prerequisites
        prerequisites = combo.get('prerequisites', [])
        if prerequisites:
            lines.append("\nPrerequisites:")
            for prereq in prerequisites:
                lines.append(f"  • {prereq.get('name', 'Unknown')}")
        
        # Steps
        steps = combo.get('steps', [])
        if steps:
            lines.append("\nSteps:")
            for i, step in enumerate(steps, 1):
                lines.append(f"  {i}. {step.get('name', 'Unknown')}")
        
        # Results
        results = combo.get('produces', [])
        if results:
            lines.append("\nResults:")
            for result in results:
                lines.append(f"  • {result.get('name', 'Unknown')}")
        
        return '\n'.join(lines)


def analyze_deck_combos(api: CommanderSpellbookAPI, 
                        commander: str, 
                        deck_cards: List[str]) -> Dict:
    """Analyze potential combos in a deck."""
    results = {
        'commander': commander,
        'total_cards': len(deck_cards),
        'commander_combos': [],
        'deck_combos': [],
        'combo_pieces': {},
        'missing_pieces': {}
    }
    
    # Get combos for the commander
    commander_combos = api.get_combos_for_commander(commander)
    results['commander_combos'] = commander_combos
    
    print(f"\nFound {len(commander_combos)} combos for {commander}")
    
    # Check which combo pieces are in the deck
    deck_set = set(deck_cards)
    
    for combo in commander_combos:
        combo_cards = set()
        for card in combo.get('uses', []):
            card_name = card.get('card', {}).get('name', '')
            if card_name and card_name != commander:
                combo_cards.add(card_name)
        
        # Check how many pieces we have
        pieces_in_deck = combo_cards.intersection(deck_set)
        missing_pieces = combo_cards - deck_set
        
        if len(pieces_in_deck) > 0:
            combo_id = combo.get('id', 'Unknown')
            results['combo_pieces'][combo_id] = list(pieces_in_deck)
            results['missing_pieces'][combo_id] = list(missing_pieces)
            
            # If we have all pieces, it's a complete combo
            if len(missing_pieces) == 0:
                results['deck_combos'].append(combo)
    
    return results


# Example usage
if __name__ == "__main__":
    # Set up logging
    logging.basicConfig(level=logging.INFO)
    
    # Initialize API client
    api = CommanderSpellbookAPI()
    
    # First, load some combos (limit to 100 for testing)
    print("=== Loading combos from Commander Spellbook ===")
    api.get_all_combos(limit=100)
    
    # Example 1: Get combos for a specific card
    print("\n=== Combos for Dramatic Reversal ===")
    dramatic_combos = api.get_combos_for_card("Dramatic Reversal")
    print(f"Found {len(dramatic_combos)} combos")
    
    if dramatic_combos:
        print("\nFirst combo:")
        print(api.format_combo(dramatic_combos[0]))
    
    # Example 2: Find combos with multiple cards
    print("\n=== Combos with both Isochron Scepter and Dramatic Reversal ===")
    iso_dramatic = api.get_combos_for_multiple_cards(["Isochron Scepter", "Dramatic Reversal"])
    print(f"Found {len(iso_dramatic)} combos")
    
    # Example 3: Search for infinite mana combos in Simic colors
    print("\n=== Infinite mana combos in Simic (UG) ===")
    simic_mana = api.search_combos(
        color_identity="UG",
        result_keywords=["Infinite mana"]
    )
    print(f"Found {len(simic_mana)} combos")
    
    # Example 4: Analyze a sample deck
    print("\n=== Analyzing sample Urza deck ===")
    sample_commander = "Urza, Lord High Artificer"
    sample_cards = [
        "Sol Ring", "Mana Crypt", "Isochron Scepter", 
        "Dramatic Reversal", "Mana Vault", "Grim Monolith",
        "Power Artifact", "Basalt Monolith"
    ]
    
    analysis = analyze_deck_combos(api, sample_commander, sample_cards)
    
    print(f"\nComplete combos in deck: {len(analysis['deck_combos'])}")
    print(f"Partial combos: {len(analysis['combo_pieces'])}")
    
    for combo_id, pieces in analysis['combo_pieces'].items():
        missing = analysis['missing_pieces'][combo_id]
        print(f"\nCombo #{combo_id}:")
        print(f"  Have: {', '.join(pieces)}")
        print(f"  Need: {', '.join(missing) if missing else 'Complete!'}")