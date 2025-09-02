#!/usr/bin/env python3
"""
Production Moxfield scraper that reads URLs from file and writes deckObj data to JSON.
Includes proper debouncing, error handling, and cleanup.
"""

import time
import json
import re
import os
from typing import Dict, List, Optional
from urllib.parse import urlparse
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException, WebDriverException
from webdriver_manager.chrome import ChromeDriverManager
import signal
import sys
import atexit

# Optional: Use selenium-stealth to avoid detection
try:
    from selenium_stealth import stealth
    STEALTH_AVAILABLE = True
except ImportError:
    STEALTH_AVAILABLE = False
    print("⚠️  selenium-stealth not installed. Install with: pip install selenium-stealth")


class MoxfieldScraper:
    """
    Production Moxfield scraper with file I/O and proper cleanup.
    """
    
    def __init__(self, username: str = None, password: str = None, headless: bool = True, delay: float = 3.0):
        """
        Initialize Moxfield scraper.
        
        Args:
            username: Moxfield username (optional, for private decks)
            password: Moxfield password (optional, for private decks)
            headless: Run browser in headless mode
            delay: Delay between requests in seconds (increased for production)
        """
        self.username = username
        self.password = password
        self.headless = headless
        self.delay = delay
        self.driver = None
        self.is_logged_in = False
        self.processed_count = 0
        self.start_time = time.time()
        
        # Register cleanup handlers
        atexit.register(self.cleanup)
        signal.signal(signal.SIGINT, self._signal_handler)
        signal.signal(signal.SIGTERM, self._signal_handler)
    
    def _signal_handler(self, signum, frame):
        """Handle interrupt signals gracefully."""
        print(f"\n⚠️  Received signal {signum}, cleaning up...")
        self.cleanup()
        sys.exit(0)
    
    def cleanup(self):
        """Clean up browser resources."""
        if self.driver:
            try:
                print("🧹 Cleaning up browser...")
                self.driver.quit()
            except:
                pass
            self.driver = None
    
    def sanitize_filename(self, text: str) -> str:
        """Convert deck name to safe filename/key."""
        # Remove or replace invalid characters
        sanitized = re.sub(r'[^\w\s-]', '', text)
        sanitized = re.sub(r'\s+', '_', sanitized)
        sanitized = sanitized.strip('_')
        return sanitized.lower()
    
    def read_urls_from_file(self, filepath: str) -> List[str]:
        """Read URLs from text file (one per line)."""
        if not os.path.exists(filepath):
            print(f"❌ File not found: {filepath}")
            return []
        
        urls = []
        try:
            with open(filepath, 'r', encoding='utf-8') as f:
                for line_num, line in enumerate(f, 1):
                    line = line.strip()
                    if line and not line.startswith('#'):  # Skip empty lines and comments
                        if self.is_moxfield_url(line):
                            urls.append(line)
                        else:
                            print(f"⚠️  Skipping invalid URL on line {line_num}: {line}")
            
            print(f"📂 Loaded {len(urls)} valid URLs from {filepath}")
            return urls
            
        except Exception as e:
            print(f"❌ Error reading file {filepath}: {e}")
            return []
    
    def write_results_to_file(self, results: Dict, filepath: str) -> bool:
        """Write scraped results to JSON file."""
        try:
            # Create output directory if it doesn't exist
            os.makedirs(os.path.dirname(filepath) if os.path.dirname(filepath) else '.', exist_ok=True)
            
            # Create structured output
            output = {
                'metadata': {
                    'scraped_at': time.strftime('%Y-%m-%d %H:%M:%S'),
                    'total_decks': len(results['successful_decks']),
                    'total_unique_cards': results['total_unique_cards'],
                    'success_rate': results['success_rate'],
                    'scraping_duration_minutes': round((time.time() - self.start_time) / 60, 2)
                },
                'decks': {},
                'failed_urls': results['failed_urls']
            }
            
            # Add each successful deck with sanitized key
            for deck in results['successful_decks']:
                deck_key = self.sanitize_filename(deck['name'])
                
                # Ensure unique keys
                original_key = deck_key
                counter = 1
                while deck_key in output['decks']:
                    deck_key = f"{original_key}_{counter}"
                    counter += 1
                
                output['decks'][deck_key] = {
                    'name': deck['name'],
                    'url': deck['url'],
                    'card_count': deck['card_count'],
                    'total_cards': deck.get('total_cards', deck['card_count']),
                    'deckObj': deck.get('deckObj', {}),
                    'commanders': deck.get('commanders', []),
                    'mainboard': deck.get('mainboard', []),
                    'sideboard': deck.get('sideboard', [])
                }
            
            with open(filepath, 'w', encoding='utf-8') as f:
                json.dump(output, f, indent=2, ensure_ascii=False)
            
            print(f"💾 Results written to {filepath}")
            return True
            
        except Exception as e:
            print(f"❌ Error writing to file {filepath}: {e}")
            return False
    
    def is_moxfield_url(self, url: str) -> bool:
        """Check if URL is a Moxfield deck URL."""
        try:
            parsed = urlparse(url.strip())
            return parsed.netloc in ['moxfield.com', 'www.moxfield.com']
        except:
            return False
    
    def extract_deck_id(self, url: str) -> Optional[str]:
        """Extract deck ID from Moxfield URL."""
        match = re.search(r'/decks/([a-zA-Z0-9_-]+)', url)
        return match.group(1) if match else None
    
    def _setup_driver(self):
        """Set up Chrome driver with anti-detection measures."""
        chrome_options = Options()
        
        if self.headless:
            chrome_options.add_argument("--headless=new")
        
        # Anti-detection options
        chrome_options.add_argument("--no-sandbox")
        chrome_options.add_argument("--disable-dev-shm-usage")
        chrome_options.add_argument("--disable-blink-features=AutomationControlled")
        chrome_options.add_argument("--disable-extensions")
        chrome_options.add_argument("--disable-plugins")
        chrome_options.add_experimental_option("excludeSwitches", ["enable-automation"])
        chrome_options.add_experimental_option('useAutomationExtension', False)
        chrome_options.add_argument("--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
        
        try:
            service = Service(ChromeDriverManager().install())
            self.driver = webdriver.Chrome(service=service, options=chrome_options)
        except Exception as e:
            print(f"❌ Failed to setup Chrome driver: {e}")
            raise
        
        # Apply stealth settings if available
        if STEALTH_AVAILABLE:
            stealth(self.driver,
                    languages=["en-US", "en"],
                    vendor="Google Inc.",
                    platform="Win32",
                    webgl_vendor="Intel Inc.",
                    renderer="Intel Iris OpenGL Engine",
                    fix_hairline=True)
        
        # Additional anti-detection
        self.driver.execute_script("Object.defineProperty(navigator, 'webdriver', {get: () => undefined})")
        
        print("✅ Chrome driver setup complete")
    
    def login(self) -> bool:
        """Login to Moxfield if credentials provided."""
        if not self.username or not self.password:
            print("No credentials provided, accessing public decks only")
            return True
        
        try:
            print("🔐 Logging into Moxfield...")
            self.driver.get("https://moxfield.com/account/signin")
            time.sleep(3)
            
            username_field = WebDriverWait(self.driver, 15).until(
                EC.presence_of_element_located((By.NAME, "userName"))
            )
            password_field = self.driver.find_element(By.NAME, "password")
            
            # Type credentials slowly
            for char in self.username:
                username_field.send_keys(char)
                time.sleep(0.1)
            
            time.sleep(0.5)
            
            for char in self.password:
                password_field.send_keys(char)
                time.sleep(0.1)
            
            time.sleep(1)
            
            login_button = self.driver.find_element(By.XPATH, "//button[@type='submit']")
            login_button.click()
            
            WebDriverWait(self.driver, 15).until(
                lambda driver: "signin" not in driver.current_url
            )
            
            self.is_logged_in = True
            print("✅ Successfully logged into Moxfield")
            time.sleep(2)
            return True
            
        except Exception as e:
            print(f"❌ Login failed: {e}")
            return False
    
    def scrape_deck(self, url: str) -> Optional[Dict]:
        """
        Scrape a single Moxfield deck.
        
        Args:
            url: Moxfield deck URL
            
        Returns:
            Dictionary with deck data or None if failed
        """
        if not self.is_moxfield_url(url):
            print(f"❌ Not a Moxfield URL: {url}")
            return None
        
        deck_id = self.extract_deck_id(url)
        if not deck_id:
            print(f"❌ Could not extract deck ID from: {url}")
            return None
        
        if not self.driver:
            self._setup_driver()
            if self.username and self.password:
                if not self.login():
                    print("⚠️  Continuing without login")
        
        try:
            print(f"📖 Loading deck: {deck_id}")
            self.driver.get(url)
            
            WebDriverWait(self.driver, 20).until(
                EC.presence_of_element_located((By.TAG_NAME, "body"))
            )
            
            time.sleep(3)  # Wait for dynamic content
            
            # Debug output
            page_source = self.driver.page_source.lower()
            print(f"🔍 Page title: {self.driver.title}")
            print(f"🔍 URL after load: {self.driver.current_url}")
            print(f"🔍 Page source length: {len(page_source)} chars")
            
            # Check for error conditions - but let's be more specific
            if "deck not found" in page_source:
                print("❌ Found 'deck not found' in page source")
                return None
            
            if "404" in self.driver.title.lower():
                print("❌ 404 in page title")
                return None
            
            if "private deck" in page_source and not self.is_logged_in:
                print("❌ Deck is private and no valid login")
                return None
            
            if "cloudflare" in page_source or "checking your browser" in page_source:
                print("❌ Blocked by Cloudflare protection")
                return None
            
            # Extract deck data
            deck_data = self._extract_deck_data()
            
            if deck_data:
                print(f"✅ Successfully scraped: {deck_data.get('name', 'Unknown')} ({deck_data.get('total_cards', 0)} cards)")
                return deck_data
            else:
                print("❌ Failed to extract deck data")
                return None
                
        except TimeoutException:
            print("❌ Page load timeout")
            return None
        except Exception as e:
            print(f"❌ Error: {e}")
            return None
        finally:
            time.sleep(self.delay)
    
    def _extract_deck_data(self) -> Optional[Dict]:
        """Extract deck data from the loaded Moxfield page."""
        try:
            # First, let's extract the deck name from the title we successfully got
            deck_name = "Unknown"
            title = self.driver.title
            if title and "MTG Deck Builder" in title:
                # Extract name from: "Rograkh's Wheelhouse // Commander (...) deck list mtg // Moxfield — MTG Deck Builder"
                name_part = title.split(" // ")[0]
                if name_part:
                    deck_name = name_part.strip()
                    print(f"✅ Extracted deck name: {deck_name}")
            
            # Look for JSON in script tags with more patterns
            script_elements = self.driver.find_elements(By.TAG_NAME, "script")
            print(f"🔍 Found {len(script_elements)} script elements")
            
            for i, script in enumerate(script_elements):
                try:
                    script_content = script.get_attribute("innerHTML")
                    if not script_content or len(script_content) < 100:
                        continue
                    
                    print(f"🔍 Script {i}: {len(script_content)} chars")
                    
                    # More comprehensive patterns for modern Moxfield
                    patterns = [
                        # Next.js patterns
                        (r'window\.__NEXT_DATA__\s*=\s*({.*?})</script>', "__NEXT_DATA__"),
                        (r'"props"\s*:\s*{"pageProps".*?"deck"\s*:\s*({.*?"mainboard".*?})', "pageProps.deck"),
                        
                        # React state patterns  
                        (r'window\.INITIAL_STATE\s*=\s*({.*?});', "INITIAL_STATE"),
                        (r'"initialState"\s*:\s*({.*?"deck".*?})', "initialState"),
                        
                        # Direct deck patterns
                        (r'"deck"\s*:\s*({[^}]*"mainboard"[^}]*})', "direct deck"),
                        (r'deckObj["\']?\s*:\s*({.*?"mainboard".*?})', "deckObj"),
                        
                        # Hydration patterns
                        (r'"hydrationData"[^{]*({.*?"mainboard".*?})', "hydrationData"),
                        (r'__apollo_state__.*?({.*?"mainboard".*?})', "apollo_state"),
                    ]
                    
                    for pattern, pattern_name in patterns:
                        matches = re.finditer(pattern, script_content, re.DOTALL)
                        for match in matches:
                            print(f"🔍 Found potential {pattern_name} match")
                            try:
                                json_str = match.group(1)
                                # Try to fix common JSON issues
                                json_str = self._clean_json_string(json_str)
                                data = json.loads(json_str)
                                
                                deck_data = self._find_deck_in_json(data)
                                if deck_data:
                                    print(f"✅ Successfully extracted from {pattern_name}")
                                    deck_data['name'] = deck_name  # Use the name we got from title
                                    return self._format_deck_data(deck_data)
                                    
                            except (json.JSONDecodeError, KeyError) as e:
                                print(f"⚠️  Failed to parse {pattern_name}: {str(e)[:100]}")
                                continue
                                
                except Exception as e:
                    print(f"⚠️  Error processing script {i}: {e}")
                    continue
            
            # If JSON extraction failed, try to parse visible card elements
            return self._extract_from_dom(deck_name)
            
        except Exception as e:
            print(f"⚠️  Error extracting deck data: {e}")
            return None
    
    def _clean_json_string(self, json_str: str) -> str:
        """Clean up JSON string to fix common parsing issues."""
        # Remove trailing commas
        json_str = re.sub(r',(\s*[}\]])', r'\1', json_str)
        
        # Fix unescaped quotes in strings (basic attempt)
        # This is a simplified fix - more complex cases might need better handling
        
        return json_str
    
    def _extract_from_dom(self, deck_name: str) -> Optional[Dict]:
        """Extract deck data from DOM elements when JSON fails."""
        try:
            print("🔍 Attempting DOM extraction...")
            
            result = {
                'name': deck_name,
                'commanders': [],
                'mainboard': [],
                'sideboard': [],
                'url': self.driver.current_url,
                'format': '',
                'colors': [],
                'total_cards': 0
            }
            
            # Look for card links - this worked!
            try:
                card_links = self.driver.find_elements(By.CSS_SELECTOR, 'a[href*="/cards/"]')
                print(f"🔍 Found {len(card_links)} card links")
                
                processed_cards = set()  # Track to avoid duplicates
                commander_names = set()  # We'll identify commanders from title
                
                # Extract commander names from title for classification
                title = self.driver.title
                if "(" in title and ")" in title:
                    commander_section = title.split("(")[1].split(")")[0]
                    if " and " in commander_section:
                        for cmd in commander_section.split(" and "):
                            commander_names.add(cmd.strip())
                    else:
                        commander_names.add(commander_section.strip())
                
                print(f"🔍 Identified commanders from title: {commander_names}")
                
                for link in card_links:
                    try:
                        card_name = link.text.strip()
                        if not card_name or len(card_name) < 2 or card_name.isdigit():
                            continue
                            
                        if card_name in processed_cards:
                            continue
                            
                        processed_cards.add(card_name)
                        
                        # Try to get quantity from nearby elements
                        quantity = 1
                        try:
                            # Look for quantity in parent or sibling elements
                            parent = link.find_element(By.XPATH, "./..")
                            qty_elements = parent.find_elements(By.CSS_SELECTOR, '[class*="quantity"], [class*="qty"], .number')
                            for qty_elem in qty_elements:
                                qty_text = qty_elem.text.strip()
                                if qty_text.isdigit():
                                    quantity = int(qty_text)
                                    break
                        except:
                            pass
                        
                        # Classify as commander or mainboard
                        if card_name in commander_names:
                            result['commanders'].append({
                                'name': card_name,
                                'quantity': quantity
                            })
                        else:
                            result['mainboard'].append({
                                'name': card_name,
                                'quantity': quantity
                            })
                            
                    except Exception:
                        continue
                
                # Calculate total cards
                total = sum(card['quantity'] for card in result['commanders'])
                total += sum(card['quantity'] for card in result['mainboard'])
                result['total_cards'] = total
                
                # Create deckObj for TopDeck.gg compatibility
                deck_obj = {
                    'Commanders': {},
                    'Mainboard': {},
                    'Sideboard': {}
                }
                
                # Add commanders to deckObj
                for commander in result['commanders']:
                    deck_obj['Commanders'][commander['name']] = {
                        'id': self._generate_card_id(commander['name']),
                        'count': commander['quantity']
                    }
                
                # Add mainboard to deckObj
                for card in result['mainboard']:
                    deck_obj['Mainboard'][card['name']] = {
                        'id': self._generate_card_id(card['name']),
                        'count': card['quantity']
                    }
                
                # Add sideboard to deckObj (if any)
                for card in result['sideboard']:
                    deck_obj['Sideboard'][card['name']] = {
                        'id': self._generate_card_id(card['name']),
                        'count': card['quantity']
                    }
                
                result['deckObj'] = deck_obj
                
                print(f"✅ DOM extraction results:")
                print(f"   Commanders: {len(result['commanders'])}")
                print(f"   Mainboard: {len(result['mainboard'])}")
                print(f"   Total cards: {total}")
                print(f"   deckObj created with {len(deck_obj['Commanders'])} commanders, {len(deck_obj['Mainboard'])} mainboard cards")
                
                return result
                
            except Exception as e:
                print(f"❌ Card link extraction failed: {e}")
                return None
                
        except Exception as e:
            print(f"❌ DOM extraction failed: {e}")
            return None
    
    def _find_deck_in_json(self, data, depth: int = 0) -> Optional[Dict]:
        """Recursively search JSON for deck data."""
        if depth > 6:
            return None
        
        if isinstance(data, dict):
            if self._looks_like_deck(data):
                return data
            
            for key, value in data.items():
                if key in ['deck', 'deckData', 'initialDeck'] and isinstance(value, dict):
                    if self._looks_like_deck(value):
                        return value
                    
                if isinstance(value, (dict, list)):
                    result = self._find_deck_in_json(value, depth + 1)
                    if result:
                        return result
        
        elif isinstance(data, list):
            for item in data:
                if isinstance(item, (dict, list)):
                    result = self._find_deck_in_json(item, depth + 1)
                    if result:
                        return result
        
        return None
    
    def _looks_like_deck(self, data: Dict) -> bool:
        """Check if JSON object looks like deck data."""
        if not isinstance(data, dict):
            return False
        
        has_name = 'name' in data
        has_cards = any(key in data for key in ['mainboard', 'commanders', 'sideboard'])
        
        return has_name and has_cards
    
    def _format_deck_data(self, raw_data: Dict) -> Dict:
        """Format raw deck data into consistent structure with deckObj."""
        result = {
            'name': raw_data.get('name', 'Unknown'),
            'commanders': [],
            'mainboard': [],
            'sideboard': [],
            'url': self.driver.current_url,
            'format': raw_data.get('format', ''),
            'colors': raw_data.get('colors', []),
            'total_cards': 0,
            'deckObj': {}  # Add TopDeck.gg compatible deckObj
        }
        
        # Create deckObj structure
        deck_obj = {
            'Commanders': {},
            'Mainboard': {},
            'Sideboard': {}
        }
        
        # Extract commanders
        commanders = raw_data.get('commanders', {})
        if isinstance(commanders, dict):
            for card_data in commanders.values():
                if isinstance(card_data, dict) and 'card' in card_data:
                    card_name = card_data['card']['name']
                    quantity = card_data.get('quantity', 1)
                    
                    result['commanders'].append({
                        'name': card_name,
                        'quantity': quantity
                    })
                    
                    # Add to deckObj - using placeholder ID since we don't have real card IDs
                    deck_obj['Commanders'][card_name] = {
                        'id': self._generate_card_id(card_name),
                        'count': quantity
                    }
                    
                    result['total_cards'] += quantity
        
        # Extract mainboard
        mainboard = raw_data.get('mainboard', {})
        if isinstance(mainboard, dict):
            for card_data in mainboard.values():
                if isinstance(card_data, dict) and 'card' in card_data:
                    card_name = card_data['card']['name']
                    quantity = card_data.get('quantity', 1)
                    
                    result['mainboard'].append({
                        'name': card_name,
                        'quantity': quantity
                    })
                    
                    # Add to deckObj
                    deck_obj['Mainboard'][card_name] = {
                        'id': self._generate_card_id(card_name),
                        'count': quantity
                    }
                    
                    result['total_cards'] += quantity
        
        # Extract sideboard
        sideboard = raw_data.get('sideboard', {})
        if isinstance(sideboard, dict):
            for card_data in sideboard.values():
                if isinstance(card_data, dict) and 'card' in card_data:
                    card_name = card_data['card']['name']
                    quantity = card_data.get('quantity', 1)
                    
                    result['sideboard'].append({
                        'name': card_name,
                        'quantity': quantity
                    })
                    
                    # Add to deckObj
                    deck_obj['Sideboard'][card_name] = {
                        'id': self._generate_card_id(card_name),
                        'count': quantity
                    }
                    
                    result['total_cards'] += quantity
        
        result['deckObj'] = deck_obj
        return result
    
    def _generate_card_id(self, card_name: str) -> str:
        """Generate a placeholder card ID based on card name."""
        import hashlib
        # Create a consistent hash-based ID for the card name
        # This isn't a real MTG card ID, but provides consistency
        return hashlib.md5(card_name.encode('utf-8')).hexdigest()[:32]
    
    def get_all_card_names(self, deck_data: Dict) -> List[str]:
        """Extract all unique card names from deck data."""
        cards = []
        
        for commander in deck_data.get('commanders', []):
            cards.append(commander['name'])
        
        for card in deck_data.get('mainboard', []):
            cards.append(card['name'])
        
        for card in deck_data.get('sideboard', []):
            cards.append(card['name'])
        
        return cards
    
    def scrape_multiple_urls(self, urls: List[str]) -> Dict:
        """Scrape multiple Moxfield URLs with progress tracking."""
        if not urls:
            return {
                'total_unique_cards': 0,
                'unique_cards': [],
                'successful_decks': [],
                'failed_urls': [],
                'success_rate': 0
            }
        
        # Filter to only Moxfield URLs
        moxfield_urls = [url for url in urls if self.is_moxfield_url(url)]
        
        if len(moxfield_urls) != len(urls):
            print(f"⚠️  Filtered {len(urls) - len(moxfield_urls)} non-Moxfield URLs")
        
        all_cards = set()
        successful_decks = []
        failed_urls = []
        
        print(f"🚀 Scraping {len(moxfield_urls)} Moxfield URLs...")
        print(f"   Delay between requests: {self.delay}s")
        print(f"   Login: {'Yes' if self.username else 'No'}")
        print(f"   Estimated time: {(len(moxfield_urls) * self.delay / 60):.1f} minutes")
        
        try:
            for i, url in enumerate(moxfield_urls, 1):
                print(f"\n--- {i}/{len(moxfield_urls)} ({i/len(moxfield_urls)*100:.1f}%) ---")
                
                deck_data = self.scrape_deck(url)
                
                if deck_data:
                    cards = self.get_all_card_names(deck_data)
                    all_cards.update(cards)
                    
                    # Store complete deck data including deckObj
                    successful_decks.append({
                        'url': url,
                        'name': deck_data['name'],
                        'card_count': len(cards),
                        'total_cards': deck_data.get('total_cards', len(cards)),
                        'deckObj': deck_data.get('deckObj', {}),
                        'commanders': deck_data.get('commanders', []),
                        'mainboard': deck_data.get('mainboard', []),
                        'sideboard': deck_data.get('sideboard', [])
                    })
                    
                    print(f"✅ Success: {deck_data['name']}")
                    print(f"   Cards: {len(cards)} unique, {deck_data.get('total_cards', len(cards))} total")
                else:
                    failed_urls.append(url)
                    print(f"❌ Failed")
                
                self.processed_count = i
                
                # Progress indicator
                elapsed = time.time() - self.start_time
                if i < len(moxfield_urls):
                    eta = (elapsed / i) * (len(moxfield_urls) - i)
                    print(f"📊 Progress: {i}/{len(moxfield_urls)} | Elapsed: {elapsed/60:.1f}m | ETA: {eta/60:.1f}m")
                
                # Respectful delay with occasional longer breaks
                if i < len(moxfield_urls):
                    if i % 10 == 0:  # Longer break every 10 requests
                        print(f"⏸️  Taking extended break after {i} requests...")
                        time.sleep(self.delay * 3)
                    else:
                        time.sleep(self.delay)
        
        except KeyboardInterrupt:
            print(f"\n⚠️  Interrupted by user after {self.processed_count} decks")
        except Exception as e:
            print(f"\n❌ Unexpected error: {e}")
        finally:
            self.cleanup()
        
        return {
            'total_unique_cards': len(all_cards),
            'unique_cards': sorted(list(all_cards)),
            'successful_decks': successful_decks,
            'failed_urls': failed_urls,
            'success_rate': len(successful_decks) / len(moxfield_urls) * 100 if moxfield_urls else 0
        }
    
    def close(self):
        """Close the browser driver."""
        self.cleanup()


def main():
    """Production scraper that reads URLs from file and writes results to JSON."""
    
    # Configuration
    input_file = "moxfield_urls.txt"  # Create this file with one URL per line
    output_file = "scraped_decks.json"
    
    print("🔥 Production Moxfield Scraper")
    print("=" * 50)
    print(f"📂 Input file: {input_file}")
    print(f"💾 Output file: {output_file}")
    
    # Create scraper instance
    # For private decks, add credentials:
    # scraper = MoxfieldScraper(
    #     username="your_username",
    #     password="your_password",
    #     headless=True,
    #     delay=4.0  # Longer delay for production
    # )
    
    scraper = MoxfieldScraper(
        headless=True,
        delay=3.0  # Respectful delay for production
    )
    
    try:
        # Read URLs from file
        urls = scraper.read_urls_from_file(input_file)
        if not urls:
            print("❌ No valid URLs found. Create a file 'moxfield_urls.txt' with one URL per line.")
            return
        
        # Scrape all URLs
        result = scraper.scrape_multiple_urls(urls)
        
        # Write results to file
        success = scraper.write_results_to_file(result, output_file)
        
        # Final summary
        print(f"\n📊 FINAL RESULTS:")
        print(f"   Success rate: {result['success_rate']:.1f}%")
        print(f"   Total decks scraped: {len(result['successful_decks'])}")
        print(f"   Total unique cards: {result['total_unique_cards']}")
        print(f"   Failed URLs: {len(result['failed_urls'])}")
        print(f"   Output written: {'✅' if success else '❌'}")
        
        if result['successful_decks']:
            print(f"\n✅ Successfully scraped decks:")
            for deck in result['successful_decks'][:5]:  # Show first 5
                print(f"     {deck['name']} - {deck['card_count']} cards")
            if len(result['successful_decks']) > 5:
                print(f"     ... and {len(result['successful_decks']) - 5} more")
        
        if result['failed_urls']:
            print(f"\n❌ Failed URLs:")
            for url in result['failed_urls'][:3]:  # Show first 3
                print(f"     {url}")
            if len(result['failed_urls']) > 3:
                print(f"     ... and {len(result['failed_urls']) - 3} more")
        
    except KeyboardInterrupt:
        print("\n⚠️  Interrupted by user")
    except Exception as e:
        print(f"\n❌ Error: {e}")
    finally:
        scraper.cleanup()


if __name__ == "__main__":
    # Create sample input file if it doesn't exist
    sample_input = "moxfield_urls.txt"
    if not os.path.exists(sample_input):
        with open(sample_input, 'w', encoding='utf-8') as f:
            f.write("# Moxfield URLs to scrape (one per line)\n")
            f.write("# Lines starting with # are comments and will be ignored\n")
            f.write("https://moxfield.com/decks/bPwJDfRWYUCXvj-m8FwmiQ\n")
            f.write("# Add more URLs here\n")
        print(f"📝 Created sample input file: {sample_input}")
    
    main()