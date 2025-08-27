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
"""

import os
import sys
import time
import argparse
from datetime import datetime
from pathlib import Path

from .topdeck_api import TopdeckAPI, TournamentFilters
from mtg_analyzer.sqlite_main import create_sqlite_analyzer


class TournamentDataPipeline:
    """Complete pipeline from TopDeck API to SQLite analysis."""
    
    def __init__(self, api_key: str, db_path: str = "mtg_tournament_data.db"):
        """Initialize pipeline with API key and database path."""
        self.api = TopdeckAPI(api_key)
        self.analyzer = create_sqlite_analyzer(db_path)
        self.db_path = db_path
        
        print(f"🔧 Pipeline initialized")
        print(f"   Database: {db_path}")
        print(f"   API Rate Limit: {self.api.rate_limit} requests/minute")
    
    def fetch_recent_tournaments(self, 
                                days_back: int = 10,
                                min_players: int = 50, 
                                game: str = "Magic: The Gathering",
                                format_name: str = "EDH") -> list:
        """Fetch recent tournaments from TopDeck API."""
        print(f"\n📡 FETCHING TOURNAMENT DATA")
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
        
        print(f"\n🔍 Searching for tournaments...")
        
        # Fetch tournaments with full data
        tournaments = self.api.get_tournaments(filters)
        
        if not tournaments:
            print("❌ No tournaments found matching criteria")
            return []
        
        print(f"✅ Found {len(tournaments)} tournaments!")
        
        # Display summary of what we found
        total_players = 0
        tournaments_with_decklists = 0
        
        print(f"\n📊 TOURNAMENT SUMMARY")
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
                decklist_indicator = "✅"
            else:
                decklist_indicator = "❌"
            
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
        
        print(f"\n📈 TOTALS:")
        print(f"   Tournaments: {len(tournaments)}")
        print(f"   Total Players: {total_players:,}")
        print(f"   With Decklists: {tournaments_with_decklists}/{len(tournaments)} ({tournaments_with_decklists/len(tournaments):.1%})")
        
        return tournaments
    
    def process_tournaments(self, tournaments: list) -> dict:
        """Process tournaments into SQLite database."""
        if not tournaments:
            print("❌ No tournaments to process")
            return {}
        
        print(f"\n🗄️  PROCESSING INTO DATABASE")
        print("=" * 60)
        
        # Run the analysis pipeline
        result = self.analyzer.run_full_analysis(tournaments)
        
        return result
    
    def run_complete_pipeline(self, 
                            days_back: int = 10,
                            min_players: int = 50,
                            game: str = "Magic: The Gathering", 
                            format_name: str = "EDH") -> dict:
        """Run the complete pipeline from API to database."""
        start_time = time.time()
        
        print("🚀 MTG TOURNAMENT DATA PIPELINE")
        print("=" * 80)
        print(f"Started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        
        try:
            # Step 1: Fetch tournament data
            tournaments = self.fetch_recent_tournaments(
                days_back=days_back,
                min_players=min_players,
                game=game,
                format_name=format_name
            )
            
            if not tournaments:
                print("❌ Pipeline stopped: No tournaments found")
                return {"success": False, "error": "No tournaments found"}
            
            # Step 2: Process into database  
            result = self.process_tournaments(tournaments)
            
            # Step 3: Final summary
            elapsed_time = time.time() - start_time
            
            print(f"\n🎉 PIPELINE COMPLETE!")
            print("=" * 80)
            print(f"⏱️  Total Time: {elapsed_time:.1f} seconds")
            print(f"💾 Database: {self.db_path}")
            print(f"📊 Ready for GraphQL integration!")
            
            # Add timing and success info
            result.update({
                "pipeline_success": True,
                "elapsed_time": elapsed_time,
                "tournaments_fetched": len(tournaments)
            })
            
            return result
            
        except Exception as e:
            print(f"\n❌ Pipeline failed: {e}")
            return {
                "success": False, 
                "error": str(e),
                "elapsed_time": time.time() - start_time
            }
    
    def show_database_info(self):
        """Display information about the created database."""
        if not os.path.exists(self.db_path):
            print("❌ Database not found")
            return
        
        summary = self.analyzer.get_summary()
        
        print(f"\n💾 DATABASE INFO")
        print("=" * 50)
        print(f"📁 File: {self.db_path}")
        print(f"📏 Size: {summary['databaseSize'] / (1024*1024):.2f} MB")
        print(f"🏆 Tournaments: {summary['totalTournaments']:,}")
        print(f"🃏 Decks: {summary['totalDecks']:,}")
        print(f"📇 Card Entries: {summary['totalCardEntries']:,}")
        print(f"🎯 Unique Cards: {summary['uniqueCards']:,}")
        print(f"👥 Players: {summary['uniquePlayers']:,}")
    
    def export_sample_data(self, output_file: str = "sample_data.json"):
        """Export sample data for GraphQL schema development."""
        import json
        
        print(f"\n📤 Exporting sample data to {output_file}...")
        
        sample_data = self.analyzer.export_for_graphql()
        
        # Limit data for sample file
        sample_data['topCards'] = sample_data['topCards'][:20]
        sample_data['commanderMeta'] = sample_data['commanderMeta'][:15] 
        sample_data['trendingCards'] = sample_data['trendingCards'][:15]
        sample_data['playerPreferences'] = sample_data['playerPreferences'][:25]
        
        with open(output_file, 'w') as f:
            json.dump(sample_data, f, indent=2, default=str)
        
        print(f"✅ Sample data exported!")
        print(f"   Use this for GraphQL schema development")


def main():
    """Main function with command line argument support."""
    parser = argparse.ArgumentParser(
        description="MTG Tournament Data Pipeline - TopDeck API to SQLite",
        formatter_class=argparse.RawDescriptionHelpFormatter
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
    
    parser.add_argument('--export-sample', 
                       action='store_true',
                       help='Export sample data for GraphQL development')
    
    parser.add_argument('--info-only', 
                       action='store_true',
                       help='Just show database info, don\'t fetch new data')
    
    args = parser.parse_args()
    
    # Check for API key
    api_key = os.environ.get('TOPDECKGG_API_KEY')
    if not api_key and not args.info_only:
        print("❌ Error: TOPDECKGG_API_KEY environment variable not set!")
        print("Get your API key from: https://topdeck.gg/docs/tournaments-v2")
        print("\nSet it with:")
        print("export TOPDECKGG_API_KEY='your-api-key-here'")
        sys.exit(1)
    
    # Create pipeline
    pipeline = TournamentDataPipeline(api_key, args.db_path)
    
    # Handle info-only mode
    if args.info_only:
        pipeline.show_database_info()
        return
    
    # Run the complete pipeline
    result = pipeline.run_complete_pipeline(
        days_back=args.days,
        min_players=args.min_players,
        game=args.game,
        format_name=args.format
    )
    
    # Show database info
    pipeline.show_database_info()
    
    # Export sample data if requested
    if args.export_sample:
        pipeline.export_sample_data()
    
    # Print final status
    if result.get('pipeline_success'):
        print(f"\n🎉 Success! Database ready at: {args.db_path}")
        print("🔧 Ready for Pothos/Yoga GraphQL integration")
    else:
        print(f"\n❌ Pipeline failed: {result.get('error', 'Unknown error')}")
        sys.exit(1)


if __name__ == "__main__":
    main()