"""
Decklist parser for converting TopDeck tournament data into structured card entries.
"""

import re
from typing import Dict, List, Optional
from .models import CardEntry


class DecklistParser:
    """Parses decklists from TopDeck format into structured card data."""
    
    def __init__(self):
        self.section_patterns = [
            r'~~Commanders?~~',
            r'~~Mainboard~~', 
            r'~~Sideboard~~',
            r'~~Maybeboard~~',
            r'~~Command Zone~~',
            r'~~Deck~~'
        ]
    
    def parse_decklist_text(self, decklist: str) -> List[CardEntry]:
        """Parse a text decklist into card entries."""
        if not decklist or not isinstance(decklist, str):
            return []
            
        entries = []
        current_section = "Mainboard"  # Default section
        
        lines = decklist.split('\n')
        for line in lines:
            line = line.strip()
            if not line:
                continue
                
            # Check for section headers
            section_match = None
            for pattern in self.section_patterns:
                if re.match(pattern, line, re.IGNORECASE):
                    section_match = line.replace('~~', '').strip()
                    break
                    
            if section_match:
                current_section = self._normalize_section_name(section_match)
                continue
                
            # Parse card line: "quantity card name"
            card_entry = self._parse_card_line(line, current_section)
            if card_entry:
                entries.append(card_entry)
                
        return entries
    
    def parse_deck_object(self, deck_obj: Dict) -> List[CardEntry]:
        """Parse a structured deck object into card entries."""
        if not deck_obj or not isinstance(deck_obj, dict):
            return []
            
        entries = []
        for section_name, cards in deck_obj.items():
            normalized_section = self._normalize_section_name(section_name)
            
            if isinstance(cards, dict):
                for card_name, card_data in cards.items():
                    if isinstance(card_data, dict):
                        quantity = card_data.get('count', 1)
                        card_id = card_data.get('id')
                    else:
                        quantity = card_data if isinstance(card_data, int) else 1
                        card_id = None
                        
                    entries.append(CardEntry(
                        card_name=card_name,
                        card_id=card_id,
                        quantity=quantity,
                        section=normalized_section
                    ))
                    
        return entries
    
    def extract_commanders(self, card_entries: List[CardEntry]) -> List[str]:
        """Extract commander names from card entries."""
        commanders = []
        for entry in card_entries:
            if entry.section == 'Commanders':
                commanders.append(entry.card_name)
        return commanders
    
    def determine_deck_colors(self, commanders: List[str], card_entries: List[CardEntry]) -> str:
        """Determine deck color identity (placeholder - would need card database)."""
        # This is a simplified version - in practice you'd look up each card's color identity
        # For now, return empty string to be filled in later
        return ""
    
    def _normalize_section_name(self, section: str) -> str:
        """Normalize section names to standard values."""
        section_lower = section.lower()
        if 'commander' in section_lower or 'command' in section_lower:
            return 'Commanders'
        elif 'sideboard' in section_lower:
            return 'Sideboard'  
        elif 'maybeboard' in section_lower or 'maybe' in section_lower:
            return 'Maybeboard'
        else:
            return 'Mainboard'
    
    def _parse_card_line(self, line: str, section: str) -> Optional[CardEntry]:
        """Parse a single line like '1 Lightning Bolt' into a CardEntry."""
        # Match patterns like "1 Card Name" or "2x Card Name"
        patterns = [
            r'^(\d+)x?\s+(.+)$',  # "1 Lightning Bolt" or "1x Lightning Bolt"
            r'^(\d+)\s*(.+)$',    # "1Lightning Bolt" (no space)
        ]
        
        for pattern in patterns:
            match = re.match(pattern, line.strip())
            if match:
                quantity = int(match.group(1))
                card_name = match.group(2).strip()
                
                # Clean up card name
                card_name = re.sub(r'\s+', ' ', card_name)  # Normalize whitespace
                card_name = card_name.strip()
                
                if card_name:
                    return CardEntry(
                        card_name=card_name,
                        card_id=None,  # Will be filled in later
                        quantity=quantity,
                        section=section
                    )
        
        return None