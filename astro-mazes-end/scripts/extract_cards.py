#!/usr/bin/env python3
"""
Simple script to extract individual card names from your mixed card_names array
and create a clean JSON list for Scryfall processing.
"""

import json
import re
import sys
import unicodedata
from typing import List, Set


def parse_decklist(decklist_text: str) -> List[str]:
    """Parse a decklist string into individual card names."""
    cards: List[str] = []
    
    # Handle escaped newlines and Unicode issues
    text = decklist_text.replace('\\n', '\n').replace("\\'", "'")
    text = clean_unicode_encoding(text)
    
    for line in text.split('\n'):
        line = line.strip()
        
        # Skip empty lines and headers
        if not line or line.startswith('~~') or (':' in line and len(line) < 20):
            continue
            
        # Remove quantity at start (1 Card Name, 4x Card Name, etc.)
        line = re.sub(r'^\d+x?\s+', '', line)
        
        # Clean up the card name and fix encoding
        if line and not line.isdigit() and len(line) > 1:
            # Strip any surrounding quotes first
            line = line.strip('\'"')
            clean_name = normalize_card_name(line.strip())
            if clean_name:  # Only add non-empty strings
                cards.append(clean_name)
    
    return cards


def extract_card_names_from_mixed_data(card_names_array: List[str]) -> List[str]:
    """
    Takes your mixed card_names array and returns a clean list of individual card names.
    
    Args:
        card_names_array: The array from your JSON file that contains URLs and decklist text
        
    Returns:
        Simple list of unique card names
    """
    all_cards = set()
    
    for entry in card_names_array:
        if not isinstance(entry, str) or not entry.strip():
            continue
            
        entry = entry.strip()
        
        # Skip URLs
        if entry.startswith('http'):
            continue
            
        # If it contains newlines (escaped or literal), it's a decklist - parse it
        if '\n' in entry or '\\n' in entry:
            cards = parse_decklist(entry)
            all_cards.update(cards)
        else:
            # It's probably already a card name
            all_cards.add(entry)
    
    return sorted(list(all_cards))


def normalize_card_name(name: str) -> str:
    """Normalize card name for deduplication."""
    # Clean Unicode encoding issues first
    name = clean_unicode_encoding(name)
    
    # Normalize Unicode (NFC form)
    name = unicodedata.normalize('NFC', name)
    
    # Strip whitespace
    name = name.strip()
    
    return name


def clean_unicode_encoding(text: str) -> str:
    """Fix common Unicode encoding issues in card names."""
    # Fix the common apostrophe encoding issue - convert ALL apostrophe variants to standard '
    text = text.replace('\u00e2\u20ac\u2122', "'")  # Right single quotation mark (encoded)
    text = text.replace('\u00e2\u20ac\u2039', "'")  # Left single quotation mark (encoded)
    text = text.replace('\u2019', "'")              # Right single quotation mark (proper Unicode)
    text = text.replace('\u2018', "'")              # Left single quotation mark (proper Unicode)
    text = text.replace('\u00e2\u20ac\u009c', '"')  # Left double quotation mark
    text = text.replace('\u00e2\u20ac\u009d', '"')  # Right double quotation mark
    
    # Also handle other common issues
    text = text.replace('\u00e2\u20ac\u201d', '—')  # Em dash
    text = text.replace('\u00c3\u00a6', 'æ')        # ae ligature
    
    return text
    """Parse a decklist string into individual card names."""
    cards = []
    
    # Handle escaped newlines
    text = decklist_text.replace('\\n', '\n').replace("\\'", "'")
    
    for line in text.split('\n'):
        line = line.strip()
        
        # Skip empty lines and headers
        if not line or line.startswith('~~') or ':' in line and len(line) < 20:
            continue
            
        # Remove quantity at start (1 Card Name, 4x Card Name, etc.)
        line = re.sub(r'^\d+x?\s+', '', line)
        
        # Clean up the card name
        if line and not line.isdigit() and len(line) > 1:
            cards.append(line.strip())
    
    return cards


def process_file_to_scryfall_format(input_filename: str, output_filename: str = None) -> str:
    """
    Process your mixed card names file into a clean list for Scryfall.
    
    Args:
        input_filename: Your original card names JSON file
        output_filename: Output filename (optional, will auto-generate if not provided)
        
    Returns:
        Output filename that was created
    """
    try:
        # Read input file with explicit UTF-8 encoding
        with open(input_filename, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        print(f"Reading from: {input_filename}")
        original_count = data.get('metadata', {}).get('total_unique_cards', len(data['card_names']))
        print(f"Original file claims: {original_count} cards")
        print(f"Original array length: {len(data['card_names'])}")
        
        # Extract clean card names
        clean_cards = extract_card_names_from_mixed_data(data['card_names'])
        
        # Generate output filename if not provided
        if not output_filename:
            output_filename = input_filename.replace('.json', '_for_scryfall.json')
        
        # Create simple list format for Scryfall with proper encoding
        with open(output_filename, 'w', encoding='utf-8') as f:
            json.dump(clean_cards, f, indent=2, ensure_ascii=False)
        
        print(f"\nProcessing complete!")
        print(f"Extracted {len(clean_cards)} unique card names")
        print(f"Scryfall-ready file saved to: {output_filename}")
        
        # Show sample
        print(f"\nFirst 10 cards:")
        for i, card in enumerate(clean_cards[:10]):
            print(f"  {i+1}. {card}")
            
        if len(clean_cards) > 10:
            print(f"  ... and {len(clean_cards) - 10} more")
            
        return output_filename
        
    except FileNotFoundError:
        print(f"Error: File '{input_filename}' not found")
        sys.exit(1)
    except Exception as e:
        print(f"Error processing file: {e}")
        sys.exit(1)


def main():
    """CLI interface for processing card names files."""
    if len(sys.argv) < 2:
        print("Usage: python extract_cards.py <input_file.json> [output_file.json]")
        print("Example: python extract_cards.py card_names.json scryfall_cards.json")
        sys.exit(1)
    
    input_file = sys.argv[1]
    output_file = sys.argv[2] if len(sys.argv) > 2 else None
    
    result_file = process_file_to_scryfall_format(input_file, output_file)
    
    print(f"\nReady for Scryfall processing:")
    print(f"python scryfall_api.py --input {result_file} --output scryfall_results.json")


if __name__ == "__main__":
    main()