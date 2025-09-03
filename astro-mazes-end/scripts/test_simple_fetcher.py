#!/usr/bin/env python3
"""
Simple example: Fetch combo data and save to JSON
"""

from commander_spellbook_fetcher import CommanderSpellbookFetcher
import logging
import sys

# Set up logging
logging.basicConfig(level=logging.INFO)

# Create fetcher
fetcher = CommanderSpellbookFetcher()

# Example 1: Fetch combos for specific cards
fetcher.fetch_combos_for_cards(
    card_names=["Thassa's Oracle", "Demonic Consultation", "Tainted Pact"],
    output_file="thoracle_combos.json"
)

# Example 2: Fetch combos for a commander  
fetcher.fetch_combos_for_commander(
    commander_name="Kinnan, Bonder Prodigy",
    output_file="kinnan_combos.json"
)

# Example 3: Fetch ALL combos
fetcher.fetch_and_save(
    output_file="combo_data.json",
    limit=None
)

print("\n✓ JSON files created successfully!")