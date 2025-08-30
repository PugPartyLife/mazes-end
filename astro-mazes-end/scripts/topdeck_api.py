"""Topdeck.gg API client for fetching tournament data.

This module provides a Python wrapper for the Topdeck.gg API, allowing you to
fetch tournament data, standings, and decklists from Magic: The Gathering
and other trading card game tournaments.

Example:
    Basic usage:
        >>> api = TopdeckAPI("your_api_key")
        >>> tournaments = api.get_tournaments()
        >>> ids = api.get_tournament_ids()

    Filtered usage:
        >>> filters = TournamentFilters(
        ...     game="Magic: The Gathering",
        ...     format="EDH",
        ...     participant_min=100
        ... )
        >>> mtg_tournaments = api.get_tournaments(filters)
        
    JSON Output:
        >>> tournaments = api.get_tournaments(filters)
        >>> write_tournaments_to_json(tournaments, "tournaments.json")
        >>> card_names = extract_all_card_names(tournaments)
        >>> write_card_names_to_json(card_names, "card_names.json")
"""

import os
import json
import time
from dataclasses import asdict, dataclass
from typing import Dict, List, Optional, Set
from threading import Lock
from datetime import datetime, timedelta
import re

import requests


@dataclass
class TournamentFilters:
    """Configuration for tournament API requests.
    
    Attributes:
        last: Number of recent tournaments to fetch (default: 30)
        start: Unix timestamp for earliest start date
        end: Unix timestamp for latest end date
        participantMin: Minimum number of participants required
        participantMax: Maximum number of participants required
        game: Game name filter (case sensitive, e.g., "Magic: The Gathering") - REQUIRED
        format: Format filter (case sensitive, e.g., "EDH", "Standard") - REQUIRED
        columns: List of data columns to return in response
        rounds: Include round details (boolean or list)
        tables: Table details to include
        players: Player details to include
    """

    game: str  # Required field
    format: str  # Required field
    last: Optional[int] = 30
    start: Optional[int] = None
    end: Optional[int] = None
    participantMin: Optional[int] = None
    participantMax: Optional[int] = None
    columns: Optional[List[str]] = None
    rounds: Optional[bool] = None
    tables: Optional[List[str]] = None
    players: Optional[List[str]] = None


class TopdeckAPI:
    """Wrapper for Topdeck.gg API with rate limiting.
    
    This class provides methods to interact with the Topdeck.gg API for
    fetching tournament data, standings, and detailed tournament information.
    Includes automatic rate limiting to respect the 200 requests/minute limit.
    
    Attributes:
        api_key: The API key for authentication
        base_url: Base URL for the API endpoints
        headers: HTTP headers for API requests
        rate_limit: Maximum requests per minute (default: 200)
        request_times: List of recent request timestamps for rate limiting
        _lock: Thread lock for rate limiting thread safety
    """

    def __init__(self, api_key: str, rate_limit: int = 200) -> None:
        """Initialize the TopdeckAPI client with rate limiting.
        
        Args:
            api_key: API key obtained from Topdeck.gg for authentication
            rate_limit: Maximum requests per minute (default: 200)
            
        Raises:
            ValueError: If api_key is empty or None
        """
        if not api_key:
            raise ValueError("API key cannot be empty")
            
        self.api_key = api_key
        self.base_url = "https://topdeck.gg/api/v2/tournaments"
        self.headers = {
            "Accept": "application/json",
            "Content-Type": "application/json",
            "Authorization": api_key,
        }
        self.rate_limit = rate_limit
        self.request_times: List[datetime] = []
        self._lock = Lock()

    def _wait_for_rate_limit(self) -> None:
        """Wait if necessary to respect rate limiting.
        
        Maintains a sliding window of request timestamps and sleeps
        if we would exceed the rate limit with the next request.
        """
        with self._lock:
            now = datetime.now()
            
            # Remove requests older than 1 minute
            cutoff = now - timedelta(minutes=1)
            self.request_times = [t for t in self.request_times if t > cutoff]
            
            # If we're at the limit, wait until we can make another request
            if len(self.request_times) >= self.rate_limit:
                # Calculate how long to wait until the oldest request expires
                oldest_request = min(self.request_times)
                wait_until = oldest_request + timedelta(minutes=1, seconds=1)
                wait_time = (wait_until - now).total_seconds()
                
                if wait_time > 0:
                    print(f"Rate limit reached. Waiting {wait_time:.1f} seconds...")
                    time.sleep(wait_time)
                    
                    # Clean up expired requests again after waiting
                    now = datetime.now()
                    cutoff = now - timedelta(minutes=1)
                    self.request_times = [t for t in self.request_times if t > cutoff]
            
            # Record this request
            self.request_times.append(now)

    def _make_request(self, payload: Dict, max_retries: int = 3) -> List[Dict]:
        """Make a rate-limited API request with retry logic.
        
        Args:
            payload: JSON payload for the API request
            max_retries: Maximum number of retry attempts (default: 3)
            
        Returns:
            List of tournament dictionaries from API response
            
        Raises:
            requests.RequestException: If all retry attempts fail
        """
        for attempt in range(max_retries + 1):
            self._wait_for_rate_limit()
            
            try:
                response = requests.post(
                    self.base_url, headers=self.headers, json=payload, timeout=30
                )
                
                if response.status_code == 429:  # Rate limit exceeded
                    print(f"Rate limited by server on attempt {attempt + 1}")
                    if attempt < max_retries:
                        # Exponential backoff: wait 2^attempt * 30 seconds
                        wait_time = (2 ** attempt) * 30
                        print(f"Waiting {wait_time} seconds before retry...")
                        time.sleep(wait_time)
                        continue
                
                response.raise_for_status()
                return response.json()
                
            except requests.exceptions.RequestException as e:
                print(f"API request failed on attempt {attempt + 1}: {e}")
                if hasattr(e, "response") and e.response is not None:
                    print(f"Response status: {e.response.status_code}")
                    print(f"Response content: {e.response.text}")
                
                if attempt < max_retries:
                    wait_time = (2 ** attempt) * 5  # 5, 10, 20 seconds
                    print(f"Retrying in {wait_time} seconds...")
                    time.sleep(wait_time)
                else:
                    print("Max retries exceeded")
                    return []
        
        return []

    def get_tournaments(self, filters: Optional[TournamentFilters] = None) -> List[Dict]:
        """Get tournaments from Topdeck API with rate limiting.
        
        Fetches tournament data from the API with optional filtering parameters.
        Returns a list of tournament dictionaries containing tournament metadata,
        standings, and other relevant information. Automatically handles rate limiting.
        
        Args:
            filters: TournamentFilters object with query parameters.
                    If None, uses default parameters.
                    
        Returns:
            List of tournament dictionaries. Each dictionary contains:
            - TID: Tournament ID string
            - tournamentName: Human-readable tournament name
            - swissNum: Number of swiss rounds
            - topCut: Top cut size (8, 16, etc.)
            - dateCreated: Unix timestamp of creation
            - standings: List of player standings (if requested)
            
        Raises:
            requests.RequestException: If the API request fails after retries
            
        Example:
            >>> api = TopdeckAPI("your_key")
            >>> tournaments = api.get_tournaments()
            >>> print(f"Found {len(tournaments)} tournaments")
        """
        if filters is None:
            filters = TournamentFilters()

        # Convert dataclass to dict and remove None values
        payload = {k: v for k, v in asdict(filters).items() if v is not None}

        # Set default columns if not specified
        if "columns" not in payload:
            payload["columns"] = ["name", "wins", "draws", "losses"]

        print(f"Making request with payload: {json.dumps(payload, indent=2)}")
        
        return self._make_request(payload)

    def get_tournament_ids(
        self, filters: Optional[TournamentFilters] = None
    ) -> List[str]:
        """Get just the tournament IDs.
        
        Convenience method that fetches tournaments and extracts only the
        tournament ID (TID) values, useful when you only need to identify
        tournaments without full metadata.
        
        Args:
            filters: TournamentFilters object with query parameters.
                    If None, uses default parameters.
                    
        Returns:
            List of tournament ID strings. Each ID can be used with
            get_tournament_details() to fetch full tournament data.
            
        Example:
            >>> api = TopdeckAPI("your_key")
            >>> ids = api.get_tournament_ids(TournamentFilters(last=10))
            >>> print(f"Recent tournament IDs: {ids}")
        """
        tournaments = self.get_tournaments(filters)
        return [
            tournament.get("TID", "")
            for tournament in tournaments
            if "TID" in tournament
        ]

    def get_tournament_details(self, tournament_id: str) -> Dict:
        """Get detailed info for a specific tournament with rate limiting.
        
        Fetches comprehensive data for a single tournament by its ID,
        including full standings, decklists (if available), and detailed
        player statistics. Automatically handles rate limiting.
        
        Args:
            tournament_id: The TID (Tournament ID) of the tournament to fetch.
                          This should be obtained from get_tournament_ids() or
                          get_tournaments().
                          
        Returns:
            Dictionary containing detailed tournament information:
            - Tournament metadata (name, format, dates, etc.)
            - Complete standings with player details
            - Decklists (if available and authorized)
            - Round-by-round results
            - Win rates and statistics
            
            Returns empty dict if tournament not found or request fails.
            
        Raises:
            ValueError: If tournament_id is empty or None
            requests.RequestException: If the API request fails after retries
            
        Example:
            >>> api = TopdeckAPI("your_key")
            >>> details = api.get_tournament_details("PuntCity2")
            >>> if details:
            ...     print(f"Tournament: {details['tournamentName']}")
            ...     print(f"Players: {len(details.get('standings', []))}")
        """
        if not tournament_id:
            raise ValueError("Tournament ID cannot be empty")

        filters = TournamentFilters(
            game="Magic: The Gathering",
            format="EDH",
            columns=["name", "decklist", "wins", "draws", "losses"]
        )
        payload = asdict(filters)
        payload["id"] = tournament_id  # Add specific tournament ID

        result = self._make_request(payload)
        return result[0] if result else {}

    def get_mtg_tournaments(
        self,
        format_name: str = "EDH",
        min_players: int = 50,
        last_n: int = 20,
    ) -> List[Dict]:
        """Get Magic: The Gathering tournaments with common filters.
        
        Convenience method specifically for MTG tournaments with sensible
        defaults for competitive play analysis.
        
        Args:
            format_name: MTG format name (EDH, Standard, Modern, etc.)
            min_players: Minimum number of participants (default: 50)
            last_n: Number of recent tournaments to fetch (default: 20)
            
        Returns:
            List of MTG tournament dictionaries matching the criteria
            
        Example:
            >>> api = TopdeckAPI("your_key")
            >>> cedh_tournaments = api.get_mtg_tournaments("EDH", min_players=100)
            >>> modern_tournaments = api.get_mtg_tournaments("Modern", min_players=64)
        """
        filters = TournamentFilters(
            game="Magic: The Gathering",
            format=format_name,
            last=last_n,
            participantMin=min_players,
            columns=["name", "decklist", "wins", "draws", "winRate"],
        )
        return self.get_tournaments(filters)

    def get_multiple_tournament_details(
        self, tournament_ids: List[str], batch_size: int = 50
    ) -> Dict[str, Dict]:
        """Get detailed info for multiple tournaments efficiently.
        
        Fetches detailed data for multiple tournaments with automatic batching
        and rate limiting. More efficient than calling get_tournament_details()
        repeatedly when you need data for many tournaments.
        
        Args:
            tournament_ids: List of tournament IDs to fetch
            batch_size: Number of tournaments to request per API call (default: 50)
                       Topdeck API supports multiple IDs in a single request
                       
        Returns:
            Dictionary mapping tournament ID to tournament details.
            Failed requests return empty dict for that tournament ID.
            
        Example:
            >>> api = TopdeckAPI("your_key")
            >>> ids = ["tournament1", "tournament2", "tournament3"]
            >>> details_map = api.get_multiple_tournament_details(ids)
            >>> for tid, details in details_map.items():
            ...     if details:
            ...         print(f"{tid}: {details['tournamentName']}")
        """
        results = {}
        
        # Process tournaments in batches to avoid overwhelming the API
        for i in range(0, len(tournament_ids), batch_size):
            batch_ids = tournament_ids[i:i + batch_size]
            
            print(f"Fetching batch {i//batch_size + 1}: {len(batch_ids)} tournaments")
            
            filters = TournamentFilters(
                game="Magic: The Gathering",
                format="EDH",
                columns=["name", "decklist", "wins", "draws", "losses", "winRate"]
            )
            payload = asdict(filters)
            payload["id"] = batch_ids  # API supports array of IDs
            
            batch_results = self._make_request(payload)
            
            # Map results back to tournament IDs
            for tournament in batch_results:
                tid = tournament.get("TID")
                if tid:
                    results[tid] = tournament
            
            # Add empty results for tournaments that weren't returned
            for tid in batch_ids:
                if tid not in results:
                    results[tid] = {}
        
        return results

    def get_rate_limit_status(self) -> Dict[str, any]:
        """Get current rate limiting status.
        
        Returns information about current API usage and rate limiting state,
        useful for monitoring and debugging rate limit issues.
        
        Returns:
            Dictionary containing:
            - requests_in_last_minute: Number of requests made in last minute
            - rate_limit: Maximum requests per minute
            - remaining_requests: Requests remaining before hitting limit
            - time_until_reset: Seconds until oldest request expires
            
        Example:
            >>> api = TopdeckAPI("your_key")
            >>> status = api.get_rate_limit_status()
            >>> print(f"Used: {status['requests_in_last_minute']}/{status['rate_limit']}")
        """
        with self._lock:
            now = datetime.now()
            cutoff = now - timedelta(minutes=1)
            
            # Clean up old requests
            self.request_times = [t for t in self.request_times if t > cutoff]
            
            requests_in_last_minute = len(self.request_times)
            remaining_requests = max(0, self.rate_limit - requests_in_last_minute)
            
            # Calculate time until reset (when oldest request expires)
            time_until_reset = 0
            if self.request_times:
                oldest_request = min(self.request_times)
                reset_time = oldest_request + timedelta(minutes=1)
                time_until_reset = max(0, (reset_time - now).total_seconds())
            
            return {
                "requests_in_last_minute": requests_in_last_minute,
                "rate_limit": self.rate_limit,
                "remaining_requests": remaining_requests,
                "time_until_reset": time_until_reset,
            }


def write_tournaments_to_json(tournaments: List[Dict], filename: str = "tournaments.json", indent: int = 2) -> None:
    """Write tournament objects to JSON file.
    
    Saves the complete tournament data structure to a JSON file for later processing.
    This includes all tournament metadata, player standings, decklists, and statistics.
    
    Args:
        tournaments: List of tournament dictionaries from get_tournaments()
        filename: Output JSON filename (default: "tournaments.json")
        indent: JSON indentation level for pretty printing (default: 2)
        
    Example:
        >>> tournaments = api.get_tournaments()
        >>> write_tournaments_to_json(tournaments, "my_tournaments.json")
        >>> print(f"Saved {len(tournaments)} tournaments to my_tournaments.json")
    """
    if not tournaments:
        print("No tournaments to write to JSON.")
        return
    
    try:
        # Add metadata to the JSON output
        output_data = {
            "metadata": {
                "export_timestamp": int(time.time()),
                "export_date": time.strftime("%Y-%m-%d %H:%M:%S UTC", time.gmtime()),
                "tournament_count": len(tournaments),
                "total_players": sum(len(t.get("standings", [])) for t in tournaments),
                "tournaments_with_decklists": sum(1 for t in tournaments if any(p.get("decklist") for p in t.get("standings", [])))
            },
            "tournaments": tournaments
        }
        
        with open(filename, 'w', encoding='utf-8') as f:
            json.dump(output_data, f, indent=indent, ensure_ascii=False)
        
        print(f"Successfully wrote {len(tournaments)} tournaments to {filename}")
        print(f"File size: {os.path.getsize(filename):,} bytes")
        
    except (IOError, OSError) as e:
        print(f"Error writing tournaments to JSON file {filename}: {e}")
    except Exception as e:
        print(f"Unexpected error writing JSON file {filename}: {e}")


def parse_decklist_text(decklist_text: str) -> List[str]:
    """Parse decklist text and extract card names.
    
    Handles various decklist formats commonly found in tournament data.
    Extracts card names while ignoring quantities, categories, and formatting.
    
    Args:
        decklist_text: Raw decklist text from tournament data
        
    Returns:
        List of card names found in the decklist
        
    Example:
        >>> decklist = "1 Lightning Bolt\\n4 Counterspell\\n1 Black Lotus"
        >>> cards = parse_decklist_text(decklist)
        >>> print(cards)  # ['Lightning Bolt', 'Counterspell', 'Black Lotus']
    """
    if not decklist_text or not isinstance(decklist_text, str):
        return []
    
    card_names = []
    
    # Split by lines and process each line
    lines = decklist_text.strip().split('\n')
    
    for line in lines:
        line = line.strip()
        if not line:
            continue
            
        # Skip common category headers
        if line.lower() in ['commander:', 'commanders:', 'companion:', 'sideboard:', 'maindeck:', 'deck:']:
            continue
            
        # Skip lines that are just categories or separators
        if line.startswith('//') or line.startswith('#') or line == '---':
            continue
            
        # Remove leading quantity (e.g., "4 Lightning Bolt" -> "Lightning Bolt")
        # Handle formats like: "1 Card Name", "4x Card Name", "1  Card Name (Set) 123"
        quantity_pattern = r'^\s*\d+x?\s+'
        card_line = re.sub(quantity_pattern, '', line)
        
        if not card_line:
            continue
            
        # Remove set codes and collector numbers (e.g., "(M21) 123" or "[M21]")
        # This handles formats like "Lightning Bolt (M21) 123" or "Lightning Bolt [M21]"
        set_pattern = r'\s*[\(\[][\w\d]+[\)\]]\s*\d*\s*$'
        card_name = re.sub(set_pattern, '', card_line)
        
        # Remove trailing collector numbers (e.g., "Lightning Bolt 123")
        collector_pattern = r'\s+\d+\s*$'
        card_name = re.sub(collector_pattern, '', card_name)
        
        # Clean up any remaining whitespace
        card_name = card_name.strip()
        
        # Skip empty results or lines that are just numbers/symbols
        if card_name and not card_name.isdigit() and len(card_name) > 1:
            card_names.append(card_name)
    
    return card_names


def extract_all_card_names(tournaments: List[Dict]) -> Set[str]:
    """Extract all unique card names from tournament decklists.
    
    Processes all decklists from all tournaments and extracts unique card names
    for Scryfall API processing. Handles various decklist formats and removes
    duplicates.
    
    Args:
        tournaments: List of tournament dictionaries from get_tournaments()
        
    Returns:
        Set of unique card names found across all tournaments
        
    Example:
        >>> tournaments = api.get_tournaments()
        >>> card_names = extract_all_card_names(tournaments)
        >>> print(f"Found {len(card_names)} unique cards")
    """
    all_card_names = set()
    
    print("Extracting card names from tournament decklists...")
    
    total_decklists = 0
    tournaments_processed = 0
    
    for tournament in tournaments:
        standings = tournament.get("standings", [])
        tournament_cards = set()
        
        for player in standings:
            decklist = player.get("decklist")
            if decklist:
                total_decklists += 1
                card_names = parse_decklist_text(decklist)
                tournament_cards.update(card_names)
                all_card_names.update(card_names)
        
        if tournament_cards:
            tournaments_processed += 1
            tid = tournament.get("TID", "Unknown")
            print(f"  {tid}: {len(tournament_cards)} unique cards from {len([p for p in standings if p.get('decklist')])} decklists")
    
    print(f"\nCard extraction complete:")
    print(f"  Tournaments processed: {tournaments_processed}/{len(tournaments)}")
    print(f"  Total decklists processed: {total_decklists}")
    print(f"  Total unique card names found: {len(all_card_names)}")
    
    return all_card_names


def write_card_names_to_json(card_names: Set[str], filename: str = "card_names.json", indent: int = 2) -> None:
    """Write unique card names to JSON file for Scryfall processing.
    
    Creates a JSON file containing all unique card names found in tournament data,
    formatted for easy processing by Scryfall API scripts.
    
    Args:
        card_names: Set of unique card names from extract_all_card_names()
        filename: Output JSON filename (default: "card_names.json") 
        indent: JSON indentation level for pretty printing (default: 2)
        
    Example:
        >>> card_names = extract_all_card_names(tournaments)
        >>> write_card_names_to_json(card_names, "cards_for_scryfall.json")
    """
    if not card_names:
        print("No card names to write to JSON.")
        return
    
    try:
        # Sort card names for consistent output
        sorted_card_names = sorted(list(card_names))
        
        # Create output structure with metadata
        output_data = {
            "metadata": {
                "export_timestamp": int(time.time()),
                "export_date": time.strftime("%Y-%m-%d %H:%M:%S UTC", time.gmtime()),
                "total_unique_cards": len(sorted_card_names),
                "description": "Unique card names extracted from tournament decklists for Scryfall API processing"
            },
            "card_names": sorted_card_names
        }
        
        with open(filename, 'w', encoding='utf-8') as f:
            json.dump(output_data, f, indent=indent, ensure_ascii=False)
        
        print(f"Successfully wrote {len(sorted_card_names)} unique card names to {filename}")
        print(f"File size: {os.path.getsize(filename):,} bytes")
        
        # Show a sample of card names
        if sorted_card_names:
            print(f"Sample card names: {sorted_card_names[:5]}")
        
    except (IOError, OSError) as e:
        print(f"Error writing card names to JSON file {filename}: {e}")
    except Exception as e:
        print(f"Unexpected error writing JSON file {filename}: {e}")


def save_tournament_data_with_cards(tournaments: List[Dict], base_filename: str = "tournament_data") -> tuple[str, str]:
    """Save both tournament data and card names to JSON files.
    
    Convenience function that saves complete tournament data and extracted card names
    to separate JSON files with consistent naming and timestamps.
    
    Args:
        tournaments: List of tournament dictionaries from get_tournaments()
        base_filename: Base filename for output files (default: "tournament_data")
        
    Returns:
        Tuple of (tournaments_filename, card_names_filename) for the created files
        
    Example:
        >>> tournaments = api.get_tournaments()
        >>> t_file, c_file = save_tournament_data_with_cards(tournaments, "mtg_edh_data")
        >>> print(f"Saved tournaments to {t_file} and cards to {c_file}")
    """
    timestamp = time.strftime("%Y%m%d_%H%M%S")
    tournaments_file = f"{base_filename}_{timestamp}.json"
    cards_file = f"{base_filename}_cards_{timestamp}.json"
    
    print(f"Saving tournament data with timestamp {timestamp}...")
    
    # Save tournament data
    write_tournaments_to_json(tournaments, tournaments_file)
    
    # Extract and save card names
    card_names = extract_all_card_names(tournaments)
    write_card_names_to_json(card_names, cards_file)
    
    return tournaments_file, cards_file


def print_tournaments(tournaments: List[Dict]) -> None:
    """Pretty print tournament information.
    
    Displays tournament data in a readable format with key information
    like tournament ID, name, format details, and participant counts.
    
    Args:
        tournaments: List of tournament dictionaries from get_tournaments()
        
    Example:
        >>> tournaments = api.get_tournaments()
        >>> print_tournaments(tournaments)
    """
    if not tournaments:
        print("No tournaments found.")
        return

    print(f"\nFound {len(tournaments)} tournaments:")
    print("-" * 80)

    for i, tournament in enumerate(tournaments, 1):
        tid = tournament.get("TID", "Unknown")
        name = tournament.get("tournamentName", "Unknown")
        swiss_rounds = tournament.get("swissNum", "Unknown")
        top_cut = tournament.get("topCut", "Unknown")
        date_created = tournament.get("dateCreated", 0)

        # Convert Unix timestamp to readable date
        if date_created:
            date_str = time.strftime(
                "%Y-%m-%d %H:%M:%S", time.localtime(date_created)
            )
        else:
            date_str = "Unknown"

        print(f"{i:2d}. ID: {tid}")
        print(f"    Name: {name}")
        print(f"    Swiss Rounds: {swiss_rounds}, Top Cut: {top_cut}")
        print(f"    Date: {date_str}")

        if "standings" in tournament:
            standings_count = len(tournament["standings"])
            print(f"    Players: {standings_count}")

        print()


def print_tournament_details(details: Dict) -> None:
    """Print detailed tournament information.
    
    Displays comprehensive tournament data including standings,
    player statistics, and win rates in a formatted output.
    
    Args:
        details: Tournament details dictionary from get_tournament_details()
        
    Example:
        >>> details = api.get_tournament_details("tournament_id")
        >>> print_tournament_details(details)
    """
    if not details:
        print("No tournament details found.")
        return

    print(f"Tournament: {details.get('tournamentName', 'Unknown')}")
    print(f"Game: {details.get('game', 'Unknown')}")
    print(f"Format: {details.get('format', 'Unknown')}")

    if "dateCreated" in details:
        date_str = time.strftime(
            "%Y-%m-%d %H:%M:%S", time.localtime(details["dateCreated"])
        )
        print(f"Date: {date_str}")

    if "standings" in details:
        standings = details["standings"]
        print(f"Number of players: {len(standings)}")
        print("\nTop 5 players:")
        print("-" * 60)

        for i, player in enumerate(standings[:5], 1):
            name = player.get("name", "Unknown")
            wins = player.get("wins", 0)
            losses = player.get("losses", 0)
            draws = player.get("draws", 0)
            win_rate = player.get("winRate", 0)

            print(f"{i:2d}. {name}")
            print(f"    Record: {wins}-{losses}-{draws} ({win_rate:.1%})")

            if "decklist" in player and player["decklist"]:
                decklist = player["decklist"]
                if isinstance(decklist, str) and len(decklist) > 50:
                    print(f"    Decklist: {decklist[:47]}...")
                else:
                    print(f"    Decklist: {decklist}")
            print()


def demonstrate_rate_limiting(api: TopdeckAPI) -> None:
    """Demonstrate rate limiting features."""
    print("\n6. Demonstrating rate limiting...")
    status = api.get_rate_limit_status()
    print(f"Current rate limit status:")
    print(f"  Requests in last minute: {status['requests_in_last_minute']}")
    print(f"  Rate limit: {status['rate_limit']}")
    print(f"  Remaining requests: {status['remaining_requests']}")
    print(f"  Time until reset: {status['time_until_reset']:.1f} seconds")


def bulk_tournament_analysis(api: TopdeckAPI, format_name: str) -> None:
    """Demonstrate bulk tournament fetching."""
    print(f"\n7. Bulk analysis for {format_name} format...")
    
    # Get tournament IDs first
    filters = TournamentFilters(
        game="Magic: The Gathering", 
        format=format_name, 
        participant_min=50,
        last=50
    )
    tournament_ids = api.get_tournament_ids(filters)
    
    if tournament_ids:
        print(f"Found {len(tournament_ids)} tournament IDs for bulk analysis")
        
        # Get details for first 5 tournaments
        sample_ids = tournament_ids[:5]
        details_map = api.get_multiple_tournament_details(sample_ids)
        
        print(f"Successfully fetched details for {len(details_map)} tournaments")
        for tid, details in details_map.items():
            if details:
                name = details.get('tournamentName', 'Unknown')
                players = len(details.get('standings', []))
                print(f"  {tid}: {name} ({players} players)")


def main() -> None:
    """Main function for testing the API with rate limiting and JSON output.
    
    Demonstrates various API usage patterns including basic tournament
    fetching, filtering, detailed data retrieval, rate limiting features,
    and JSON output functionality for tournament data and card extraction.
    Replace the TOPDECKGG_API_KEY variable with your actual key to test.
    """
    # TODO: Replace with your actual API key
    if 'TOPDECKGG_API_KEY' in os.environ:
        api_key = os.environ['TOPDECKGG_API_KEY']
    else:
        print("TOPDECKGG_API_KEY not found in environment")
        print("Please set your API key in the TOPDECKGG_API_KEY environment variable!")
        print("You can get an API key from: https://topdeck.gg/docs/tournaments-v2")
        print("\nNote: The API has a rate limit of 200 requests per minute.")    
        return

    # Initialize API client with rate limiting
    api = TopdeckAPI(api_key=api_key)

    print("=== Topdeck API Tournament Fetcher with JSON Output ===")
    print("API Rate Limit: 200 requests per minute\n")

    # Get recent tournaments with minimum 50 participants
    print("Fetching recent tournaments with minimum 50 participants...")
    print("Using Magic: The Gathering EDH as example (game and format are required)")
    
    # Calculate 30 days ago as Unix timestamp for more data
    import time
    thirty_days_ago = int(time.time()) - (30 * 24 * 60 * 60)
    
    filters = TournamentFilters(
        game="Magic: The Gathering",
        format="EDH",
        start=thirty_days_ago,  # Tournaments from 30 days ago
        participantMin=50,
        columns=[
            "name", "decklist", "wins", "draws", "losses", 
            "winsSwiss", "winsBracket", "lossesSwiss", "lossesBracket",
            "winRate", "winRateSwiss", "winRateBracket", "byes", "id"
        ]
    )
    
    tournaments = api.get_tournaments(filters)
    
    if tournaments:
        print(f"\nFound {len(tournaments)} tournaments with detailed data")
        
        # Save tournament data and card names to JSON files
        print("\n" + "="*80)
        print("SAVING DATA TO JSON FILES")
        print("="*80)
        
        tournaments_file, cards_file = save_tournament_data_with_cards(tournaments, "mtg_edh_tournaments")
        
        print(f"\nJSON files created:")
        print(f"  Tournaments: {tournaments_file}")
        print(f"  Card Names: {cards_file}")
        
        # Display summary statistics
        print(f"\n" + "="*80)
        print("TOURNAMENT SUMMARY")
        print("="*80)
        
        total_players = sum(len(t.get("standings", [])) for t in tournaments)
        total_decklists = sum(len([p for p in t.get("standings", []) if p.get("decklist")]) for t in tournaments)
        tournaments_with_decklists = sum(1 for t in tournaments if any(p.get("decklist") for p in t.get("standings", [])))
        
        print(f"Total tournaments: {len(tournaments)}")
        print(f"Total players: {total_players:,}")
        print(f"Total decklists: {total_decklists:,}")
        print(f"Tournaments with decklists: {tournaments_with_decklists}/{len(tournaments)} ({tournaments_with_decklists/len(tournaments):.1%})")
        
        # Show sample tournament info
        print(f"\nSample tournaments:")
        for i, tournament in enumerate(tournaments[:3], 1):
            tid = tournament.get("TID", "Unknown")
            name = tournament.get("tournamentName", "Unknown")
            start_date = tournament.get("startDate", 0)
            players = len(tournament.get("standings", []))
            
            if start_date:
                date_str = time.strftime("%Y-%m-%d", time.localtime(start_date))
            else:
                date_str = "Unknown"
                
            print(f"  {i}. {tid} - {name}")
            print(f"     Date: {date_str}, Players: {players}")
        
        if len(tournaments) > 3:
            print(f"     ... and {len(tournaments) - 3} more tournaments")
            
        print(f"\n" + "="*80)
        print("JSON OUTPUT COMPLETE")
        print("="*80)
        print(f"You can now process the card names file '{cards_file}' with your Scryfall API script.")
        print(f"The tournaments file '{tournaments_file}' contains all tournament data for database loading.")
        
    else:
        print("No tournaments found matching the criteria.")


if __name__ == "__main__":
    main()