#!/usr/bin/env python3
"""
Complete MTG Tournament Data Pipeline
Fetches data from TopDeck API and creates SQLite database for analysis.

Usage:
    python run_analysis.py
    
Environment Variables:
    TOPDECKGG_API_KEY - Your TopDeck.gg API key
    
Optional Arguments:
    --db-path     - SQLite database file path (default: mtg_tournament_data.db)
    --days        - Days back to fetch tournaments (default: 10)
    --min-players - Minimum players per tournament (default: 50)
    --format      - Tournament format (default: EDH)
    --game        - Game name (default: Magic: The Gathering)
    --json-output - Save tournament data and card names to JSON files
    --json-only   - Only save JSON files, skip database processing
"""

import os
import sys
import time
import argparse
from datetime import datetime
from pathlib import Path

from .topdeck_api import (
    TopdeckAPI, 
    TournamentFilters, 
    save_tournament_data_with_cards,
    write_tournaments_to_json,
    extract_all_card_names,
    write_card_names_to_json
)
from mtg_analyzer.sqlite_main import create_sqlite_analyzer


class TournamentDataPipeline:
    """Complete pipeline from TopDeck API to SQLite analysis and JSON output."""
    
    def __init__(self, api_key: str, db_path: str = "mtg_tournament_data.db"):
        """Initialize pipeline with API key and database path."""
        self.api = TopdeckAPI(api_key)
        self.analyzer = create_sqlite_analyzer(db_path) if db_path else None
        self.db_path = db_path
        
        print(f"Pipeline initialized")
        if self.db_path:
            print(f"   Database: {db_path}")
        print(f"   API Rate Limit: {self.api.rate_limit} requests/minute")
    
    def fetch_recent_tournaments(self, 
                                days_back: int = 10,
                                min_players: int = 50, 
                                game: str = "Magic: The Gathering",
                                format_name: str = "EDH") -> list:
        """Fetch recent tournaments from TopDeck API."""
        print(f"\nFETCHING TOURNAMENT DATA")
        print("=" * 60)
        print(f"Game: {game}")
        print(f"Format: {format_name}")  
        print(f"Time Range: Last {days_back} days")
        print(f"Min Players: {min_players}")
        
        # Calculate timestamp for days back
        days_ago_timestamp = int(time.time()) - (days_back * 24 * 60 * 60)
        
        # Create filters for the API request
        filters = TournamentFilters(
            game=game,
            format=format_name,
            start=days_ago_timestamp,
            participantMin=min_players,
            columns=[
                "name", "decklist", "wins", "draws", "losses", 
                "winsSwiss", "winsBracket", "lossesSwiss", "lossesBracket",
                "winRate", "winRateSwiss", "winRateBracket", "byes", "id"
            ]
        )
        
        print(f"\nSearching for tournaments...")
        
        # Fetch tournaments with full data
        tournaments = self.api.get_tournaments(filters)
        
        if not tournaments:
            print("No tournaments found matching criteria")
            return []
        
        print(f"Found {len(tournaments)} tournaments!")
        
        # Display summary of what we found
        total_players = 0
        tournaments_with_decklists = 0
        
        print(f"\nTOURNAMENT SUMMARY")
        print("-" * 60)
        
        for i, tournament in enumerate(tournaments, 1):
            tid = tournament.get('TID', 'Unknown')
            name = tournament.get('tournamentName', 'Unknown')
            start_date = tournament.get('startDate', 0)
            standings = tournament.get('standings', [])
            player_count = len(standings)
            total_players += player_count
            
            # Check for decklists
            has_decklists = any(player.get('decklist') for player in standings)
            if has_decklists:
                tournaments_with_decklists += 1
                decklist_indicator = "Yes"
            else:
                decklist_indicator = "No"
            
            # Format date
            if start_date:
                date_str = time.strftime("%Y-%m-%d", time.localtime(start_date))
            else:
                date_str = "Unknown"
            
            print(f"{i:2d}. {tid} | {date_str} | {player_count:3d} players | {decklist_indicator} decklists")
            if len(name) > 50:
                print(f"    {name[:50]}...")
            else:
                print(f"    {name}")
        
        print(f"\nTOTALS:")
        print(f"   Tournaments: {len(tournaments)}")
        print(f"   Total Players: {total_players:,}")
        print(f"   With Decklists: {tournaments_with_decklists}/{len(tournaments)} ({tournaments_with_decklists/len(tournaments):.1%})")
        
        return tournaments
    
    def save_json_output(self, tournaments: list, base_filename: str = None) -> tuple:
        """Save tournament data and card names to JSON files."""
        if not tournaments:
            print("No tournaments to save to JSON")
            return None, None
        
        print(f"\nSAVING JSON OUTPUT")
        print("=" * 60)
        
        # Generate base filename if not provided
        if not base_filename:
            timestamp = time.strftime("%Y%m%d_%H%M%S")
            game = tournaments[0].get('game', 'unknown').replace(' ', '_').lower()
            format_name = tournaments[0].get('format', 'unknown').lower()
            base_filename = f"{game}_{format_name}_{timestamp}"
        
        # Save both tournament data and card names
        tournaments_file, cards_file = save_tournament_data_with_cards(tournaments, base_filename)
        
        print(f"JSON files created:")
        print(f"   Tournaments: {tournaments_file}")
        print(f"   Card Names: {cards_file}")
        
        return tournaments_file, cards_file
    
    def process_tournaments(self, tournaments: list) -> dict:
        """Process tournaments into SQLite database."""
        if not tournaments:
            print("No tournaments to process")
            return {}
        
        if not self.analyzer:
            print("No database analyzer configured - skipping database processing")
            return {"database_skipped": True}
        
        print(f"\nPROCESSING INTO DATABASE")
        print("=" * 60)
        
        # Run the analysis pipeline
        result = self.analyzer.run_full_analysis(tournaments)
        
        return result
    
    def run_complete_pipeline(self, 
                            days_back: int = 10,
                            min_players: int = 50,
                            game: str = "Magic: The Gathering", 
                            format_name: str = "EDH",
                            json_output: bool = False,
                            json_only: bool = False,
                            json_filename: str = None) -> dict:
        """Run the complete pipeline from API to database and/or JSON."""
        start_time = time.time()
        
        print("MTG TOURNAMENT DATA PIPELINE")
        print("=" * 80)
        print(f"Started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        
        if json_only:
            print("Mode: JSON output only (no database)")
        elif json_output:
            print("Mode: Database + JSON output")
        else:
            print("Mode: Database only")
        
        try:
            # Step 1: Fetch tournament data
            tournaments = self.fetch_recent_tournaments(
                days_back=days_back,
                min_players=min_players,
                game=game,
                format_name=format_name
            )
            
            if not tournaments:
                print("Pipeline stopped: No tournaments found")
                return {"success": False, "error": "No tournaments found"}
            
            result = {"tournaments_fetched": len(tournaments)}
            
            # Step 2: Save JSON output if requested
            if json_output or json_only:
                tournaments_file, cards_file = self.save_json_output(tournaments, json_filename)
                result.update({
                    "tournaments_json": tournaments_file,
                    "cards_json": cards_file
                })
            
            # Step 3: Process into database (unless json_only mode)
            if not json_only:
                db_result = self.process_tournaments(tournaments)
                result.update(db_result)
            
            # Step 4: Final summary
            elapsed_time = time.time() - start_time
            
            print(f"\nPIPELINE COMPLETE!")
            print("=" * 80)
            print(f"Total Time: {elapsed_time:.1f} seconds")
            
            if not json_only and self.db_path:
                print(f"Database: {self.db_path}")
            
            if json_output or json_only:
                print(f"JSON Output: Tournament data and card names saved")
                if result.get('cards_json'):
                    print(f"Card names file ready for Scryfall processing: {result['cards_json']}")
            
            if not json_only:
                print(f"Ready for GraphQL integration!")
            
            # Add timing and success info
            result.update({
                "pipeline_success": True,
                "elapsed_time": elapsed_time,
                "mode": "json_only" if json_only else ("database_and_json" if json_output else "database_only")
            })
            
            return result
            
        except Exception as e:
            print(f"\nPipeline failed: {e}")
            return {
                "success": False, 
                "error": str(e),
                "elapsed_time": time.time() - start_time
            }
    
    def show_database_info(self):
        """Display information about the created database."""
        if not self.db_path or not os.path.exists(self.db_path):
            print("Database not found or not configured")
            return
        
        summary = self.analyzer.get_summary()
        
        print(f"\nDATABASE INFO")
        print("=" * 50)
        print(f"File: {self.db_path}")
        print(f"Size: {summary['databaseSize'] / (1024*1024):.2f} MB")
        print(f"Tournaments: {summary['totalTournaments']:,}")
        print(f"Decks: {summary['totalDecks']:,}")
        print(f"Card Entries: {summary['totalCardEntries']:,}")
        print(f"Unique Cards: {summary['uniqueCards']:,}")
        print(f"Players: {summary['uniquePlayers']:,}")
    
    def export_sample_data(self, output_file: str = "sample_data.json"):
        """Export sample data for GraphQL schema development."""
        import json
        
        if not self.analyzer:
            print("No database configured - cannot export sample data")
            return
        
        print(f"\nExporting sample data to {output_file}...")
        
        sample_data = self.analyzer.export_for_graphql()
        
        # Limit data for sample file
        sample_data['topCards'] = sample_data['topCards'][:20]
        sample_data['commanderMeta'] = sample_data['commanderMeta'][:15] 
        sample_data['trendingCards'] = sample_data['trendingCards'][:15]
        sample_data['playerPreferences'] = sample_data['playerPreferences'][:25]
        
        with open(output_file, 'w') as f:
            json.dump(sample_data, f, indent=2, default=str)
        
        print(f"Sample data exported!")
        print(f"   Use this for GraphQL schema development")


def main():
    """Main function with command line argument support."""
    parser = argparse.ArgumentParser(
        description="MTG Tournament Data Pipeline - TopDeck API to SQLite and/or JSON",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Standard database processing
  python run_analysis.py --days 7 --min-players 100
  
  # Save JSON output alongside database
  python run_analysis.py --json-output --days 14
  
  # Only save JSON files (no database)
  python run_analysis.py --json-only --days 30 --min-players 25
  
  # Custom JSON filename
  python run_analysis.py --json-only --json-filename cedh_analysis_2024
        """
    )
    
    parser.add_argument('--db-path', 
                       default='mtg_tournament_data.db',
                       help='SQLite database file path')
    
    parser.add_argument('--days', 
                       type=int, 
                       default=10,
                       help='Days back to fetch tournaments')
    
    parser.add_argument('--min-players', 
                       type=int, 
                       default=50,
                       help='Minimum players per tournament')
    
    parser.add_argument('--format', 
                       default='EDH',
                       help='Tournament format')
    
    parser.add_argument('--game', 
                       default='Magic: The Gathering',
                       help='Game name')
    
    parser.add_argument('--json-output', 
                       action='store_true',
                       help='Save tournament data and card names to JSON files (in addition to database)')
    
    parser.add_argument('--json-only', 
                       action='store_true',
                       help='Only save JSON files, skip database processing entirely')
    
    parser.add_argument('--json-filename', 
                       help='Base filename for JSON output (timestamp will be added)')
    
    parser.add_argument('--export-sample', 
                       action='store_true',
                       help='Export sample data for GraphQL development')
    
    parser.add_argument('--info-only', 
                       action='store_true',
                       help='Just show database info, don\'t fetch new data')
    
    args = parser.parse_args()
    
    # Validate arguments
    if args.json_only and args.export_sample:
        print("Error: Cannot export sample data in json-only mode (requires database)")
        sys.exit(1)
    
    # Check for API key
    api_key = os.environ.get('TOPDECKGG_API_KEY')
    if not api_key and not args.info_only:
        print("Error: TOPDECKGG_API_KEY environment variable not set!")
        print("Get your API key from: https://topdeck.gg/docs/tournaments-v2")
        print("\nSet it with:")
        print("export TOPDECKGG_API_KEY='your-api-key-here'")
        sys.exit(1)
    
    # Create pipeline (skip database setup if json-only mode)
    db_path = None if args.json_only else args.db_path
    pipeline = TournamentDataPipeline(api_key, db_path)
    
    # Handle info-only mode
    if args.info_only:
        pipeline.show_database_info()
        return
    
    # Run the complete pipeline
    result = pipeline.run_complete_pipeline(
        days_back=args.days,
        min_players=args.min_players,
        game=args.game,
        format_name=args.format,
        json_output=args.json_output,
        json_only=args.json_only,
        json_filename=args.json_filename
    )
    
    # Show database info (unless json-only mode)
    if not args.json_only:
        pipeline.show_database_info()
    
    # Export sample data if requested
    if args.export_sample and not args.json_only:
        pipeline.export_sample_data()
    
    # Print final status
    if result.get('pipeline_success'):
        mode = result.get('mode', 'unknown')
        
        if mode == 'json_only':
            print(f"\nSuccess! JSON files created:")
            if result.get('tournaments_json'):
                print(f"  Tournaments: {result['tournaments_json']}")
            if result.get('cards_json'):
                print(f"  Card Names: {result['cards_json']}")
            print("\nCard names file is ready for Scryfall API processing!")
        else:
            print(f"\nSuccess! Database ready at: {args.db_path}")
            if args.json_output:
                print("JSON files also created for additional processing")
            print("Ready for Pothos/Yoga GraphQL integration")
    else:
        print(f"\nPipeline failed: {result.get('error', 'Unknown error')}")
        sys.exit(1)


if __name__ == "__main__":
    main()