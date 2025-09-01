#!/usr/bin/env python3
"""
Moxfield URL parser to extract decklists
Note: This is web scraping and may break if Moxfield changes their structure
"""

import requests
import json
import re
from typing import List, Dict, Optional
from urllib.parse import urlparse
import time


class MoxfieldScraper:
    """Scraper for Moxfield deck URLs."""
    
    def __init__(self, delay: float = 1.0):
        """
        Initialize scraper with rate limiting.
        
        Args:
            delay: Seconds to wait between requests (be respectful)
        """
        self.delay = delay
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'MTG Tournament Analyzer/1.0',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
        })
    
    def is_moxfield_url(self, url: str) -> bool:
        """Check if URL is a Moxfield deck URL."""
        try:
            parsed = urlparse(url.strip())
            return parsed.netloc in ['moxfield.com', 'www.moxfield.com']
        except:
            return False
    
    def extract_deck_id(self, url: str) -> Optional[str]:
        """Extract deck ID from Moxfield URL."""
        # Moxfield URLs: https://www.moxfield.com/decks/DECK_ID
        match = re.search(r'/decks/([a-zA-Z0-9_-]+)', url)
        return match.group(1) if match else None
    
    def scrape_deck(self, url: str) -> Optional[Dict]:
        """
        Scrape a single Moxfield deck.
        
        Args:
            url: Moxfield deck URL
            
        Returns:
            Dictionary with deck data or None if failed
        """
        if not self.is_moxfield_url(url):
            return None
        
        deck_id = self.extract_deck_id(url)
        if not deck_id:
            return None
        
        try:
            # Try the API endpoint first (this may or may not work)
            api_url = f"https://api.moxfield.com/v2/decks/all/{deck_id}"
            
            response = self.session.get(api_url, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                return self.parse_moxfield_json(data)
            else:
                # Fallback to HTML scraping
                return self.scrape_html(url)
                
        except Exception as e:
            print(f"Error scraping {url}: {e}")
            return None
        finally:
            time.sleep(self.delay)  # Rate limiting
    
    def parse_moxfield_json(self, data: Dict) -> Dict:
        """Parse Moxfield API JSON response."""
        result = {
            'name': data.get('name', 'Unknown'),
            'commanders': [],
            'mainboard': [],
            'sideboard': [],
            'url': data.get('publicUrl', ''),
            'format': data.get('format', ''),
            'colors': data.get('colors', [])
        }
        
        # Extract commanders
        commanders = data.get('commanders', {})
        for card_data in commanders.values():
            result['commanders'].append({
                'name': card_data['card']['name'],
                'quantity': card_data['quantity']
            })
        
        # Extract mainboard
        mainboard = data.get('mainboard', {})
        for card_data in mainboard.values():
            result['mainboard'].append({
                'name': card_data['card']['name'],
                'quantity': card_data['quantity']
            })
        
        # Extract sideboard
        sideboard = data.get('sideboard', {})
        for card_data in sideboard.values():
            result['sideboard'].append({
                'name': card_data['card']['name'],
                'quantity': card_data['quantity']
            })
        
        return result
    
    def scrape_html(self, url: str) -> Optional[Dict]:
        """
        Fallback HTML scraping method.
        Note: This is fragile and may break if Moxfield changes their HTML structure.
        """
        try:
            response = self.session.get(url, timeout=10)
            if response.status_code != 200:
                return None
            
            html = response.text
            
            # Look for JSON data embedded in the HTML
            # Moxfield often embeds deck data in script tags
            json_match = re.search(r'window\.INITIAL_STATE\s*=\s*({.*?});', html, re.DOTALL)
            if json_match:
                try:
                    initial_state = json.loads(json_match.group(1))
                    # Navigate the structure to find deck data
                    # This structure may change over time
                    if 'deck' in initial_state:
                        return self.parse_moxfield_json(initial_state['deck'])
                except json.JSONDecodeError:
                    pass
            
            # If JSON parsing fails, try basic HTML parsing
            return self.parse_html_fallback(html)
            
        except Exception as e:
            print(f"Error scraping HTML from {url}: {e}")
            return None
    
    def parse_html_fallback(self, html: str) -> Dict:
        """Basic HTML parsing as last resort."""
        # This is very basic and may not work well
        # You'd need to inspect Moxfield's HTML structure and adjust
        result = {
            'name': 'Unknown',
            'commanders': [],
            'mainboard': [],
            'sideboard': [],
            'url': '',
            'format': '',
            'colors': []
        }
        
        # Try to extract deck name
        name_match = re.search(r'<title>([^<]+) - Moxfield', html)
        if name_match:
            result['name'] = name_match.group(1).strip()
        
        return result
    
    def get_all_card_names(self, deck_data: Dict) -> List[str]:
        """Extract all card names from deck data."""
        cards = []
        
        for commander in deck_data.get('commanders', []):
            cards.append(commander['name'])
        
        for card in deck_data.get('mainboard', []):
            cards.append(card['name'])
        
        for card in deck_data.get('sideboard', []):
            cards.append(card['name'])
        
        return cards


def scrape_moxfield_urls(urls: List[str]) -> Dict:
    """
    Scrape multiple Moxfield URLs and extract card names.
    
    Args:
        urls: List of Moxfield URLs
        
    Returns:
        Dictionary with results
    """
    scraper = MoxfieldScraper(delay=1.0)  # Be respectful with rate limiting
    
    all_cards = set()
    successful_decks = []
    failed_urls = []
    
    print(f"Scraping {len(urls)} Moxfield URLs...")
    
    for i, url in enumerate(urls, 1):
        print(f"  {i}/{len(urls)}: {url}")
        
        deck_data = scraper.scrape_deck(url)
        
        if deck_data:
            cards = scraper.get_all_card_names(deck_data)
            all_cards.update(cards)
            successful_decks.append({
                'url': url,
                'name': deck_data['name'],
                'card_count': len(cards)
            })
            print(f"    Success: {deck_data['name']} ({len(cards)} cards)")
        else:
            failed_urls.append(url)
            print(f"    Failed to scrape")
    
    return {
        'total_unique_cards': len(all_cards),
        'unique_cards': sorted(list(all_cards)),
        'successful_decks': successful_decks,
        'failed_urls': failed_urls,
        'success_rate': len(successful_decks) / len(urls) * 100 if urls else 0
    }


def main():
    """Test the Moxfield scraper."""
    test_urls = [
        "https://moxfield.com/decks/5lAxobmXI0CWAUIwYXA6cA",
        "https://moxfield.com/decks/7u3fNfiBWUKnnmZ5Pwe7uw",
    ]
    
    result = scrape_moxfield_urls(test_urls)
    
    print(f"\nResults:")
    print(f"  Success rate: {result['success_rate']:.1f}%")
    print(f"  Total unique cards: {result['total_unique_cards']}")
    print(f"  Successful decks: {len(result['successful_decks'])}")
    print(f"  Failed URLs: {len(result['failed_urls'])}")
    
    if result['unique_cards']:
        print(f"\nFirst 10 cards:")
        for card in result['unique_cards'][:10]:
            print(f"    {card}")


if __name__ == "__main__":
    main()