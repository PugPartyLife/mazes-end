#!/usr/bin/env python3
"""
Debug script to examine the actual Commander Spellbook API response
"""

from commander_spellbook_fetcher import CommanderSpellbookFetcher
import logging

# Set up logging
logging.basicConfig(level=logging.INFO)

# Create fetcher
fetcher = CommanderSpellbookFetcher()

# Debug the API response structure
print("=== Debugging API Response Structure ===\n")
fetcher.debug_api_response()

# Also try the old test method
print("\n\n=== Old Test Method ===\n")
fetcher.test_api_structure()