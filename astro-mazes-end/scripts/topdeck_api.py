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
"""

import os
import json
import time
from dataclasses import asdict, dataclass
from typing import Dict, List, Optional
from threading import Lock
from datetime import datetime, timedelta

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
    """Main function for testing the API with rate limiting.
    
    Demonstrates various API usage patterns including basic tournament
    fetching, filtering, detailed data retrieval, and rate limiting features.
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

    print("=== Topdeck API Tournament Fetcher - Last 10 Days, Min 50 Participants ===")
    print("API Rate Limit: 200 requests per minute\n")

    # Get recent tournaments with minimum 50 participants
    # Note: We need to specify game and format as they are required by the API
    print("Fetching recent tournaments with minimum 50 participants...")
    print("Using Magic: The Gathering EDH as example (game and format are required)")
    
    # Calculate 10 days ago as Unix timestamp
    import time
    ten_days_ago = int(time.time()) - (30 * 24 * 60 * 60)
    
    filters = TournamentFilters(
        game="Magic: The Gathering",
        format="EDH",
        start=ten_days_ago,  # Tournaments from 10 days ago
        participantMin=50
    )
    tournament_ids = api.get_tournament_ids(filters)
    
    print(f"\nFound {len(tournament_ids)} tournament IDs:")
    for i, tid in enumerate(tournament_ids, 1):
        print(f"{i:3d}. {tid}")
    
    # Now get detailed data for each tournament including all players
    if tournament_ids:
        print(f"\nFetching detailed data for all {len(tournament_ids)} tournaments...")
        
        # Get detailed tournament data with all player information
        detailed_filters = TournamentFilters(
            game="Magic: The Gathering",
            format="EDH",
            start=ten_days_ago,
            participantMin=50,
            columns=[
                "name", "decklist", "wins", "draws", "losses", 
                "winsSwiss", "winsBracket", "lossesSwiss", "lossesBracket",
                "winRate", "winRateSwiss", "winRateBracket", "byes", "id"
            ]
        )
        
        detailed_tournaments = api.get_tournaments(detailed_filters)
        
        print(f"\nDetailed Tournament Data:")
        print("=" * 100)
        
        for i, tournament in enumerate(detailed_tournaments, 1):
            tid = tournament.get("TID", "Unknown")
            name = tournament.get("tournamentName", "Unknown")
            game = tournament.get("game", "Unknown")
            format_name = tournament.get("format", "Unknown")
            swiss_rounds = tournament.get("swissNum", 0)
            top_cut = tournament.get("topCut", 0)
            start_date = tournament.get("startDate", 0)
            
            # Convert Unix timestamp to readable date
            if start_date:
                date_str = time.strftime("%Y-%m-%d %H:%M:%S", time.localtime(start_date))
            else:
                date_str = "Unknown"
            
            # Get standings (players)
            standings = tournament.get("standings", [])
            player_count = len(standings)
            
            print(f"\n{i:2d}. Tournament ID: {tid}")
            print(f"    Name: {name}")
            print(f"    Game: {game}")
            print(f"    Format: {format_name}")
            print(f"    Date: {date_str}")
            print(f"    Swiss Rounds: {swiss_rounds}")
            print(f"    Top Cut: {top_cut}")
            print(f"    Total Players: {player_count}")
            
            # Event location data if available
            if "eventData" in tournament and tournament["eventData"]:
                event_data = tournament["eventData"]
                city = event_data.get("city", "")
                state = event_data.get("state", "")
                location = event_data.get("location", "")
                if city or state or location:
                    location_str = f"{location}, {city}, {state}".strip(", ")
                    print(f"    Location: {location_str}")
            
            # Display player data
            if standings:
                print(f"\n    Players:")
                print(f"    {'Pos':<4} {'Name':<25} {'Record':<12} {'Win%':<6} {'Byes':<4} {'Has Deck'}")
                print(f"    {'-'*4} {'-'*25} {'-'*12} {'-'*6} {'-'*4} {'-'*8}")
                
                for pos, player in enumerate(standings, 1):
                    player_name = player.get("name", "Unknown")[:24]  # Truncate long names
                    wins = player.get("wins", 0)
                    losses = player.get("losses", 0) 
                    draws = player.get("draws", 0)
                    win_rate = player.get("winRate", 0)
                    byes = player.get("byes", 0)
                    has_decklist = "Yes" if player.get("decklist") else "No"
                    player_id = player.get("id", "Unknown")
                    
                    # Format win rate as percentage
                    win_rate_pct = f"{win_rate:.1%}" if isinstance(win_rate, (int, float)) else "N/A"
                    
                    record_str = f"{wins}-{losses}-{draws}"
                    
                    print(f"    {pos:<4} {player_name:<25} {record_str:<12} {win_rate_pct:<6} {byes:<4} {has_decklist}")
                
                # Show some statistics
                total_games = sum(p.get("wins", 0) + p.get("losses", 0) + p.get("draws", 0) for p in standings)
                players_with_decks = sum(1 for p in standings if p.get("decklist"))
                avg_win_rate = sum(p.get("winRate", 0) for p in standings if isinstance(p.get("winRate"), (int, float))) / len([p for p in standings if isinstance(p.get("winRate"), (int, float))]) if standings else 0
                
                print(f"\n    Tournament Statistics:")
                print(f"      Total Games Played: {total_games}")
                print(f"      Players with Decklists: {players_with_decks}/{player_count} ({players_with_decks/player_count:.1%})")
                print(f"      Average Win Rate: {avg_win_rate:.1%}")
                
        print(f"\n{'='*100}")
        print(f"Summary: Processed {len(detailed_tournaments)} tournaments with detailed player data")
        
        # Overall statistics across all tournaments
        total_players = sum(len(t.get("standings", [])) for t in detailed_tournaments)
        total_tournaments_with_decklists = sum(1 for t in detailed_tournaments if any(p.get("decklist") for p in t.get("standings", [])))
        
        print(f"Total players across all tournaments: {total_players}")
        print(f"Tournaments with at least one decklist: {total_tournaments_with_decklists}/{len(detailed_tournaments)}")
        
        # Find tournaments with NO decklists at all
        tournaments_with_no_decklists = []
        for tournament in detailed_tournaments:
            standings = tournament.get("standings", [])
            has_any_decklist = any(player.get("decklist") for player in standings)
            if not has_any_decklist and standings:  # Only include if there are players but no decklists
                tournaments_with_no_decklists.append(tournament)
        
        # Display tournaments with no decklists
        print(f"\n{'='*100}")
        print(f"TOURNAMENTS WITH NO DECKLISTS ({len(tournaments_with_no_decklists)} found):")
        print(f"{'='*100}")
        
        if tournaments_with_no_decklists:
            for i, tournament in enumerate(tournaments_with_no_decklists, 1):
                tid = tournament.get("TID", "Unknown")
                name = tournament.get("tournamentName", "Unknown")
                start_date = tournament.get("startDate", 0)
                player_count = len(tournament.get("standings", []))
                top_cut = tournament.get("topCut", 0)
                
                # Convert Unix timestamp to readable date
                if start_date:
                    date_str = time.strftime("%Y-%m-%d", time.localtime(start_date))
                else:
                    date_str = "Unknown"
                
                print(f"{i:2d}. {tid}")
                print(f"    Name: {name}")
                print(f"    Date: {date_str}")
                print(f"    Players: {player_count}")
                print(f"    Top Cut: {top_cut}")
                print(f"    Decklists: 0/{player_count} (0%)")
                print()
                
            print(f"Total tournaments with no decklists: {len(tournaments_with_no_decklists)}")
            print(f"Percentage of tournaments with no decklists: {len(tournaments_with_no_decklists)/len(detailed_tournaments):.1%}")
        else:
            print("All tournaments have at least one decklist!")
            
    else:
        print("No tournaments found matching the criteria.")

    # # Test 1: Get recent tournaments
    # print("1. Getting last 10 tournaments...")
    # recent_filters = TournamentFilters(last=10, game="Magic: The Gathering", format="EDH")
    # recent_tournaments = api.get_tournaments(recent_filters)
    # print_tournaments(recent_tournaments)

    # # Test 2: Get tournament IDs only
    # print("2. Getting tournament IDs only...")
    # tournament_ids = api.get_tournament_ids(recent_filters)
    # print(f"Tournament IDs: {tournament_ids}")

    # # Test 3: Filter by game and format using convenience method
    # print("\n3. Getting Magic: The Gathering EDH tournaments...")
    # mtg_tournaments = api.get_mtg_tournaments(
    #     format_name="EDH", min_players=50, last_n=20
    # )
    # print_tournaments(mtg_tournaments)

    # # Test 4: Get details for first tournament (if any found)
    # if tournament_ids:
    #     print(f"\n4. Getting details for tournament: {tournament_ids[0]}")
    #     details = api.get_tournament_details(tournament_ids[0])
    #     print_tournament_details(details)

    # # Test 5: Demonstrate error handling
    # print("\n5. Testing error handling with invalid tournament ID...")
    # try:
    #     invalid_details = api.get_tournament_details("invalid_id_12345")
    #     if not invalid_details:
    #         print("Correctly handled invalid tournament ID")
    # except ValueError as e:
    #     print(f"Caught expected error: {e}")

    # # Test 6: Demonstrate rate limiting features
    # demonstrate_rate_limiting(api)
    
    # # Test 7: Bulk tournament analysis
    # bulk_tournament_analysis(api, "EDH")


if __name__ == "__main__":
    main()
