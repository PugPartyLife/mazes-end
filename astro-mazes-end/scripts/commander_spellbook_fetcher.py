#!/usr/bin/env python3
"""
Commander Spellbook Data Fetcher
Fetches combo data from commanderspellbook.com and saves to JSON
"""

import requests
import json
from typing import List, Dict, Optional
import time
import logging
from datetime import datetime
from collections import defaultdict


class CommanderSpellbookFetcher:
    """Fetches and processes combo data from Commander Spellbook API."""
    
    def __init__(self):
        self.base_url = "https://backend.commanderspellbook.com"
        self.session = requests.Session()
        self.logger = logging.getLogger(__name__)
        
        # Cache for avoiding duplicate API calls
        self._raw_combo_cache = {}
    
    def debug_api_response(self, limit: int = 5) -> None:
        """Debug method to examine the actual API response structure."""
        try:
            response = self.session.get(f"{self.base_url}/variants/")
            response.raise_for_status()
            
            data = response.json()
            results = data.get('results', [])
            
            # Check multiple combos to find one with prerequisites/steps
            for i, combo in enumerate(results[:limit]):
                print(f"\n{'='*50}")
                print(f"Combo #{i+1} - ID: {combo.get('id')}")
                
                # Check requires field (the actual prerequisites)
                requires = combo.get('requires', [])
                if requires:
                    print(f"\n  'requires' field found! {len(requires)} requirements")
                    for j, req in enumerate(requires):
                        if isinstance(req, dict) and 'template' in req:
                            template = req['template']
                            print(f"    Requirement {j+1}: {template.get('name', 'Unknown')}")
                
                # Check easyPrerequisites
                easy = combo.get('easyPrerequisites', '')
                if easy:
                    print(f"\n  'easyPrerequisites': {easy}")
                
                # Check description
                desc = combo.get('description', '')
                if desc:
                    print(f"\n  'description' (first 100 chars): {desc[:100]}...")
                
                # Check mana requirements
                mana_needed = combo.get('manaNeeded', '')
                if mana_needed:
                    print(f"\n  'manaNeeded': {mana_needed}")
                
                # Show produces for reference
                produces = combo.get('produces', [])
                if produces:
                    produce_names = []
                    for p in produces:
                        if isinstance(p, dict) and 'feature' in p:
                            produce_names.append(p['feature'].get('name', ''))
                    print(f"\n  Produces: {produce_names}")
                
        except Exception as e:
            print(f"Error debugging API: {e}")
    
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
        
    def fetch_all_combos(self, limit: Optional[int] = None) -> List[Dict]:
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
    
    def process_combo_data(self, raw_combos: List[Dict]) -> Dict:
        """Process raw combo data into a structured format for graph analysis."""
        processed_data = {
            'metadata': {
                'source': 'Commander Spellbook',
                'fetch_date': datetime.now().isoformat(),
                'total_combos': len(raw_combos),
                'version': '1.0'
            },
            'combos': {},
            'cards': {},
            'card_to_combos': {},
            'statistics': {
                'total_unique_cards': 0,
                'color_distribution': {},
                'result_types': {}
            }
        }
        
        unique_cards = set()
        color_counts = {}
        result_types = {}
        
        for combo in raw_combos:
            combo_id = str(combo.get('id', ''))
            if not combo_id:
                continue
            
            # Extract card information
            cards = []
            for card_use in combo.get('uses', []):
                if isinstance(card_use, dict):
                    card_info = card_use.get('card', {})
                    if isinstance(card_info, dict):
                        card_name = card_info.get('name', '')
                        if card_name:
                            card_data = {
                                'name': card_name,
                                'oracle_id': card_info.get('oracle_id', ''),
                                'zone': card_use.get('zone_locations', 'Battlefield'),
                                'must_be_commander': card_use.get('must_be_commander', False),
                                'battlefield_card_state': card_use.get('battlefield_card_state', ''),
                                'graveyard_card_state': card_use.get('graveyard_card_state', ''),
                                'exile_card_state': card_use.get('exile_card_state', ''),
                                'library_card_state': card_use.get('library_card_state', ''),
                                'quantity': card_use.get('quantity', 1)
                            }
                            cards.append(card_data)
                            unique_cards.add(card_name)
                            
                            # Update card_to_combos mapping
                            if card_name not in processed_data['card_to_combos']:
                                processed_data['card_to_combos'][card_name] = []
                            processed_data['card_to_combos'][card_name].append(combo_id)
                            
                            # Store card details
                            if card_name not in processed_data['cards']:
                                processed_data['cards'][card_name] = {
                                    'name': card_name,
                                    'oracle_id': card_info.get('oracle_id', ''),
                                    'combos_count': 0,
                                    'color_identity': card_info.get('color_identity', '')
                                }
                            processed_data['cards'][card_name]['combos_count'] += 1
            
            # Process combo results
            produces = []
            produces_raw = combo.get('produces', [])
            if isinstance(produces_raw, list):
                for result in produces_raw:
                    if isinstance(result, dict) and 'feature' in result:
                        feature = result['feature']
                        if isinstance(feature, dict):
                            result_name = feature.get('name', '')
                            if result_name and result_name.strip():
                                produces.append(result_name)
                                # Track result types
                                result_types[result_name] = result_types.get(result_name, 0) + 1
            
            # Process requirements (the actual prerequisites)
            prerequisites = []
            requires_raw = combo.get('requires', [])
            if isinstance(requires_raw, list):
                for req in requires_raw:
                    if isinstance(req, dict) and 'template' in req:
                        template = req['template']
                        if isinstance(template, dict):
                            req_name = template.get('name', '')
                            if req_name and req_name.strip():
                                prerequisites.append(req_name)
            
            # Process steps from description field
            steps = []
            description = combo.get('description', '')
            if description and isinstance(description, str):
                # Split description into steps (usually separated by periods and newlines)
                # Each sentence typically represents a step
                import re
                # Split on periods followed by newline or capital letter
                potential_steps = re.split(r'\.(?:\n|\s+(?=[A-Z]))', description)
                for step in potential_steps:
                    step = step.strip()
                    if step and len(step) > 5:  # Filter out very short fragments
                        # Clean up the step
                        if not step.endswith('.'):
                            step += '.'
                        steps.append(step)
            
            # Store processed combo
            color_identity = combo.get('identity', '')
            processed_data['combos'][combo_id] = {
                'id': combo_id,
                'cards': cards,
                'card_names': [c['name'] for c in cards],  # For easy access
                'color_identity': color_identity,
                'prerequisites': prerequisites,
                'steps': steps,
                'produces': produces,
                'status': combo.get('status', ''),
                'spoiler': combo.get('spoiler', False),
                'legalities': combo.get('legalities', {}),
                'popularity': combo.get('popularity', 0),
                'mana_needed': combo.get('manaNeeded', ''),
                'mana_value_needed': combo.get('manaValueNeeded', 0),
                'description': combo.get('description', ''),
                'links': {
                    'commanderspellbook': f"https://commanderspellbook.com/combo/{combo_id}/",
                    'api': combo.get('url', '')
                }
            }
            
            # Update color statistics
            color_counts[color_identity] = color_counts.get(color_identity, 0) + 1
        
        # Update statistics
        processed_data['statistics']['total_unique_cards'] = len(unique_cards)
        processed_data['statistics']['color_distribution'] = color_counts
        processed_data['statistics']['result_types'] = dict(sorted(
            result_types.items(), 
            key=lambda x: x[1], 
            reverse=True
        )[:20])  # Top 20 result types
        
        return processed_data
    
    def save_to_json(self, data: Dict, filename: str) -> None:
        """Save processed data to JSON file."""
        with open(filename, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        self.logger.info(f"Data saved to {filename}")
    
    def fetch_and_save(self, output_file: str = "commander_spellbook_data.json", 
                      limit: Optional[int] = None) -> Dict:
        """Fetch combos and save to JSON file."""
        # Fetch raw data
        self.logger.info(f"Fetching combos from Commander Spellbook API...")
        raw_combos = self.fetch_all_combos(limit=limit)
        
        if not raw_combos:
            self.logger.error("No combos fetched")
            return {}
        
        # Process data
        self.logger.info("Processing combo data...")
        processed_data = self.process_combo_data(raw_combos)
        
        # Save to file
        self.save_to_json(processed_data, output_file)
        
        # Print summary
        stats = processed_data['statistics']
        print(f"\nData Summary:")
        print(f"- Total combos: {processed_data['metadata']['total_combos']}")
        print(f"- Unique cards: {stats['total_unique_cards']}")
        print(f"- Color distribution: {len(stats['color_distribution'])} different identities")
        print(f"- Top 5 result types:")
        for result, count in list(stats['result_types'].items())[:5]:
            print(f"  - {result}: {count} combos")
        
        return processed_data
    
    def fetch_combos_for_cards(self, card_names: List[str], 
                              output_file: Optional[str] = None,
                              include_all_related: bool = True) -> Dict:
        """
        Fetch combos that include specific cards.
        
        Args:
            card_names: List of card names to search for
            output_file: Optional filename to save results
            include_all_related: If True, also fetches all combos that share cards 
                                with the initial results (distance 1 combos)
        
        Returns:
            Processed combo data dictionary
        """
        self.logger.info(f"Fetching combos for cards: {', '.join(card_names)}")
        
        # Fetch combos for each card
        all_combos = {}
        combo_ids_for_cards = defaultdict(set)
        
        for card_name in card_names:
            self.logger.info(f"Searching for combos with {card_name}...")
            
            # Search for the card
            search_url = f"{self.base_url}/variants/"
            params = {'q': card_name}
            
            try:
                response = self.session.get(search_url, params=params)
                response.raise_for_status()
                data = response.json()
                
                # Process results
                results = data.get('results', [])
                self.logger.info(f"Found {len(results)} combos for {card_name}")
                
                # Filter for exact matches
                for combo in results:
                    combo_id = str(combo.get('id', ''))
                    
                    # Check if this combo actually contains the card
                    has_card = False
                    for card_use in combo.get('uses', []):
                        if isinstance(card_use, dict):
                            card_info = card_use.get('card', {})
                            if isinstance(card_info, dict):
                                if card_info.get('name', '') == card_name:
                                    has_card = True
                                    break
                    
                    if has_card:
                        all_combos[combo_id] = combo
                        combo_ids_for_cards[card_name].add(combo_id)
                        self._raw_combo_cache[combo_id] = combo
                
            except requests.RequestException as e:
                self.logger.error(f"Error fetching combos for {card_name}: {e}")
        
        # Find combos that contain ALL specified cards
        if len(card_names) > 1:
            common_combo_ids = set.intersection(*[combo_ids_for_cards[card] for card in card_names])
            self.logger.info(f"Found {len(common_combo_ids)} combos containing all specified cards")
        else:
            common_combo_ids = combo_ids_for_cards[card_names[0]] if card_names else set()
        
        # If requested, fetch related combos
        if include_all_related and all_combos:
            self.logger.info("Fetching related combos...")
            related_combos = self._fetch_related_combos(all_combos)
            all_combos.update(related_combos)
        
        # Process the data
        combo_list = list(all_combos.values())
        processed_data = self.process_combo_data(combo_list)
        
        # Add search metadata
        processed_data['metadata']['search_cards'] = card_names
        processed_data['metadata']['combos_with_all_cards'] = list(common_combo_ids)
        processed_data['metadata']['include_related'] = include_all_related
        
        # Save if requested
        if output_file:
            self.save_to_json(processed_data, output_file)
        
        return processed_data
    
    def fetch_combos_for_commander(self, commander_name: str,
                                  output_file: Optional[str] = None,
                                  include_99: bool = True) -> Dict:
        """
        Fetch combos specifically for a commander.
        
        Args:
            commander_name: Name of the commander
            output_file: Optional filename to save results
            include_99: If True, also includes combos that work in the 99
        
        Returns:
            Processed combo data dictionary
        """
        self.logger.info(f"Fetching combos for commander: {commander_name}")
        
        # First get all combos with this card
        data = self.fetch_combos_for_cards([commander_name], include_all_related=False)
        
        if not data.get('combos'):
            return data
        
        # Filter for commander-specific combos
        commander_combos = {}
        in_99_combos = {}
        
        for combo_id, combo in data['combos'].items():
            is_commander_combo = False
            
            # Check if the commander is marked as must_be_commander
            for card_data in combo.get('cards', []):
                if (card_data.get('name') == commander_name and 
                    card_data.get('must_be_commander', False)):
                    is_commander_combo = True
                    break
            
            if is_commander_combo:
                commander_combos[combo_id] = combo
            elif include_99:
                in_99_combos[combo_id] = combo
        
        # Update the data
        data['metadata']['commander'] = commander_name
        data['metadata']['commander_specific_combos'] = len(commander_combos)
        data['metadata']['in_99_combos'] = len(in_99_combos)
        
        if not include_99:
            data['combos'] = commander_combos
            data['metadata']['total_combos'] = len(commander_combos)
        
        # Recalculate statistics
        self._recalculate_statistics(data)
        
        # Save if requested
        if output_file:
            self.save_to_json(data, output_file)
        
        print(f"\nCommander Analysis for {commander_name}:")
        print(f"- Commander-specific combos: {len(commander_combos)}")
        print(f"- Combos that work in the 99: {len(in_99_combos)}")
        
        return data
    
    def fetch_combos_by_color(self, color_identity: str,
                             output_file: Optional[str] = None,
                             limit: Optional[int] = None) -> Dict:
        """
        Fetch combos by color identity.
        
        Args:
            color_identity: Color identity string (e.g., "UB", "WRG")
            output_file: Optional filename to save results
            limit: Maximum number of combos to fetch
        
        Returns:
            Processed combo data dictionary
        """
        self.logger.info(f"Fetching combos for color identity: {color_identity}")
        
        # Normalize color identity
        color_set = set(color_identity.upper())
        
        # Fetch combos
        all_combos = []
        next_url = f"{self.base_url}/variants/"
        page = 1
        
        while next_url and (not limit or len(all_combos) < limit):
            try:
                response = self.session.get(next_url)
                response.raise_for_status()
                data = response.json()
                
                # Filter by color identity
                for combo in data.get('results', []):
                    combo_colors = set(combo.get('identity', ''))
                    
                    # Check if combo colors are subset of requested colors
                    if combo_colors <= color_set:
                        all_combos.append(combo)
                        
                        if limit and len(all_combos) >= limit:
                            break
                
                self.logger.info(f"Page {page}: Found {len(all_combos)} matching combos so far")
                
                # Get next page
                next_url = data.get('next')
                page += 1
                
                if next_url:
                    time.sleep(0.1)
                    
            except requests.RequestException as e:
                self.logger.error(f"Error fetching combos: {e}")
                break
        
        # Process data
        processed_data = self.process_combo_data(all_combos)
        processed_data['metadata']['color_filter'] = color_identity
        
        # Save if requested
        if output_file:
            self.save_to_json(processed_data, output_file)
        
        return processed_data
    
    def fetch_combos_by_result(self, result_keywords: List[str],
                              output_file: Optional[str] = None,
                              limit: Optional[int] = None) -> Dict:
        """
        Fetch combos that produce specific results.
        
        Args:
            result_keywords: Keywords to search for in combo results
            output_file: Optional filename to save results
            limit: Maximum number of combos to fetch
        
        Returns:
            Processed combo data dictionary
        """
        self.logger.info(f"Fetching combos that produce: {', '.join(result_keywords)}")
        
        matching_combos = []
        
        # For each keyword, search for combos
        for keyword in result_keywords:
            next_url = f"{self.base_url}/variants/"
            params = {'q': keyword}
            
            while next_url and (not limit or len(matching_combos) < limit):
                try:
                    response = self.session.get(next_url, params=params if 'variants/' in next_url else None)
                    response.raise_for_status()
                    data = response.json()
                    
                    # Check each combo's results
                    for combo in data.get('results', []):
                        # Check if any result contains the keyword
                        for result in combo.get('produces', []):
                            if keyword.lower() in result.get('name', '').lower():
                                matching_combos.append(combo)
                                break
                        
                        if limit and len(matching_combos) >= limit:
                            break
                    
                    # Get next page
                    next_url = data.get('next')
                    
                    if next_url:
                        time.sleep(0.1)
                        
                except requests.RequestException as e:
                    self.logger.error(f"Error searching for {keyword}: {e}")
                    break
        
        # Remove duplicates
        unique_combos = {}
        for combo in matching_combos:
            combo_id = str(combo.get('id', ''))
            if combo_id:
                unique_combos[combo_id] = combo
        
        # Process data
        processed_data = self.process_combo_data(list(unique_combos.values()))
        processed_data['metadata']['result_filter'] = result_keywords
        
        # Save if requested
        if output_file:
            self.save_to_json(processed_data, output_file)
        
        return processed_data
    
    def _fetch_related_combos(self, initial_combos: Dict[str, Dict]) -> Dict[str, Dict]:
        """Fetch combos that share cards with the initial set."""
        related_combos = {}
        
        # Get all unique cards from initial combos
        all_cards = set()
        for combo in initial_combos.values():
            for card_use in combo.get('uses', []):
                if isinstance(card_use, dict):
                    card_info = card_use.get('card', {})
                    if isinstance(card_info, dict):
                        card_name = card_info.get('name', '')
                        if card_name:
                            all_cards.add(card_name)
        
        # For each card, fetch its combos
        for card in all_cards:
            search_url = f"{self.base_url}/variants/"
            params = {'q': card}
            
            try:
                response = self.session.get(search_url, params=params)
                response.raise_for_status()
                data = response.json()
                
                # Add combos we haven't seen yet
                for combo in data.get('results', []):
                    combo_id = str(combo.get('id', ''))
                    if combo_id and combo_id not in initial_combos and combo_id not in related_combos:
                        related_combos[combo_id] = combo
                        
            except requests.RequestException as e:
                self.logger.error(f"Error fetching related combos for {card}: {e}")
            
            time.sleep(0.1)  # Be nice to the API
        
        self.logger.info(f"Found {len(related_combos)} additional related combos")
        return related_combos
    
    def _recalculate_statistics(self, data: Dict) -> None:
        """Recalculate statistics after filtering combos."""
        stats = data['statistics']
        combos = data['combos']
        
        # Reset counters
        unique_cards = set()
        color_counts = {}
        result_types = {}
        
        # Recalculate from current combos
        for combo in combos.values():
            # Count cards
            for card in combo.get('card_names', []):
                unique_cards.add(card)
            
            # Color distribution
            color = combo.get('color_identity', '')
            color_counts[color] = color_counts.get(color, 0) + 1
            
            # Result types
            for result in combo.get('produces', []):
                result_types[result] = result_types.get(result, 0) + 1
        
        # Update statistics
        stats['total_unique_cards'] = len(unique_cards)
        stats['color_distribution'] = color_counts
        stats['result_types'] = dict(sorted(
            result_types.items(),
            key=lambda x: x[1],
            reverse=True
        )[:20])


if __name__ == "__main__":
    # Set up logging
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    
    # Create fetcher
    fetcher = CommanderSpellbookFetcher()
    
    # Example 1: Fetch all combos (limited)
    print("\n=== Example 1: Fetch first 1000 combos ===")
    fetcher.fetch_and_save(
        output_file="all_combos.json",
        limit=1000
    )
    
    # Example 2: Fetch combos for specific cards
    print("\n=== Example 2: Fetch combos for Isochron Scepter and Dramatic Reversal ===")
    fetcher.fetch_combos_for_cards(
        card_names=["Isochron Scepter", "Dramatic Reversal"],
        output_file="isochron_dramatic_combos.json",
        include_all_related=True
    )
    
    # Example 3: Fetch combos for a commander
    print("\n=== Example 3: Fetch combos for Urza, Lord High Artificer ===")
    fetcher.fetch_combos_for_commander(
        commander_name="Urza, Lord High Artificer",
        output_file="urza_combos.json",
        include_99=True
    )
    
    # Example 4: Fetch combos by color
    print("\n=== Example 4: Fetch Simic (UG) combos ===")
    fetcher.fetch_combos_by_color(
        color_identity="UG",
        output_file="simic_combos.json",
        limit=500
    )
    
    # Example 5: Fetch combos by result
    print("\n=== Example 5: Fetch combos that produce infinite mana ===")
    fetcher.fetch_combos_by_result(
        result_keywords=["Infinite mana"],
        output_file="infinite_mana_combos.json",
        limit=500
    )