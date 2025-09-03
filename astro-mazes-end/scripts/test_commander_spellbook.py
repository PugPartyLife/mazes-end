#!/usr/bin/env python3
"""
Test the updated Commander Spellbook API client
"""

import logging
from commander_spellbook_api import CommanderSpellbookAPI

# Set up logging
logging.basicConfig(level=logging.INFO)

# Initialize API client
api = CommanderSpellbookAPI()

# First, test the API structure
print("=== Testing API Structure ===")
api.test_api_structure()

# Load a small number of combos first
print("\n=== Loading first 50 combos ===")
combos = api.get_all_combos(limit=50)
print(f"Loaded {len(combos)} combos")

# Now test searching for specific cards
print("\n=== Testing card search ===")
test_cards = ["Dramatic Reversal", "Isochron Scepter", "Sol Ring"]

for card in test_cards:
    combos = api.get_combos_for_card(card)
    print(f"{card}: {len(combos)} combos")
    
    if combos and len(combos) > 0:
        # Show first combo
        combo = combos[0]
        print(f"  Example combo ID: {combo.get('id')}")
        # Try to get card names from the combo
        card_names = []
        print(f"  full object: {combo}")
        for use in combo.get('uses', []):
            if isinstance(use, dict) and 'card' in use:
                card_data = use['card']
                if isinstance(card_data, dict) and 'name' in card_data:
                    card_names.append(card_data['name'])
        print(f"  Cards in combo: {', '.join(card_names)}")

print("\nTest complete!")