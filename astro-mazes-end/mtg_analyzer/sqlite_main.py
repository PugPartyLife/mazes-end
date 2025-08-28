"""
SQLite-based MTG Tournament Analysis Wrapper
Perfect for Pothos/Yoga GraphQL integration and local development.
"""

import os
import json
from typing import Dict, List, Any, Optional
from .sqlite_database import SQLiteCardDatabase


class SQLiteMTGAnalyzer:
    """SQLite-based MTG tournament card analysis wrapper."""
    
    def __init__(self, db_path: str = "mtg_cards.db"):
        """Initialize with SQLite database path."""
        self.db = SQLiteCardDatabase(db_path)
        self.db_path = db_path
    
    def process_tournaments(self, tournaments: List[Dict]) -> Dict[str, Any]:
        """Process tournament data into SQLite database."""
        print("🚀 Processing tournaments into SQLite database...")
        
        stats = self.db.process_tournaments(tournaments)
        
        result = {
            'success': True,
            'stats': stats,
            'database_path': self.db_path,
            'database_size_mb': round(os.path.getsize(self.db_path) / (1024*1024), 2) if os.path.exists(self.db_path) else 0
        }
        
        print(f"\n✅ Processing Complete!")
        print(f"📊 Tournaments: {stats['tournaments_processed']}")
        print(f"🃏 Decks: {stats['decks_processed']}")
        print(f"📇 Card entries: {stats['card_entries_created']}")
        print(f"💾 Database: {result['database_size_mb']} MB")
        
        return result
    
    def get_summary(self) -> Dict[str, Any]:
        """Get database summary (perfect for GraphQL root query)."""
        return self.db.get_tournaments_summary()
    
    def get_top_cards(self, limit: int = 20, format_filter: str = None) -> List[Dict[str, Any]]:
        """Get most popular cards (GraphQL-ready)."""
        return self.db.get_top_cards(limit, format_filter)
    
    def get_player_preferences(self, player_name: str = None, limit: int = 20) -> List[Dict[str, Any]]:
        """Get player card preferences (GraphQL-ready)."""
        return self.db.get_player_card_preferences(player_name, min_usage=2, limit=limit)
    
    def get_commander_meta(self, limit: int = 15, format_filter: str = "EDH") -> List[Dict[str, Any]]:
        """Get commander meta breakdown (GraphQL-ready)."""
        return self.db.get_commander_meta(limit, format_filter)
    
    def get_trending_cards(self, days: int = 30, limit: int = 20) -> List[Dict[str, Any]]:
        """Get trending cards (GraphQL-ready)."""
        return self.db.get_card_trends(days, limit)
    
    def show_summary(self):
        """Display database summary."""
        summary = self.get_summary()
        
        print(f"\n📊 DATABASE SUMMARY")
        print("=" * 50)
        print(f"📁 Database: {summary['databasePath']}")
        print(f"💾 Size: {summary['databaseSize'] / (1024*1024):.2f} MB")
        print(f"🏆 Tournaments: {summary['totalTournaments']:,}")
        print(f"🃏 Decks: {summary['totalDecks']:,}")
        print(f"📇 Card Entries: {summary['totalCardEntries']:,}")
        print(f"🎯 Unique Cards: {summary['uniqueCards']:,}")
        print(f"👥 Players: {summary['uniquePlayers']:,}")
        print(f"📅 Latest: {summary['latestTournament']}")
    
    def show_top_cards(self, limit: int = 20):
        """Display most popular cards."""
        print(f"\n🎯 TOP {limit} MOST PLAYED CARDS")
        print("=" * 80)
        
        cards = self.get_top_cards(limit)
        
        print(f"{'Card Name':<35} {'Entries':<8} {'Decks':<6} {'Tournaments':<12} {'Win Rate'}")
        print("-" * 80)
        
        for card in cards:
            win_rate = f"{card['avgWinRate']:.1%}" if card['avgWinRate'] > 0 else "N/A"
            print(f"{card['cardName'][:34]:<35} {card['totalEntries']:<8} {card['totalDecks']:<6} {card['totalTournaments']:<12} {win_rate}")
    
    def show_commander_meta(self, limit: int = 15):
        """Display commander meta."""
        print(f"\n⚔️  TOP {limit} COMMANDER COMBINATIONS")
        print("=" * 80)
        
        commanders = self.get_commander_meta(limit)
        
        print(f"{'Commanders':<50} {'Decks':<6} {'Win Rate':<10} {'Top 8s'}")
        print("-" * 80)
        
        for cmd in commanders:
            commander_names = cmd['commander1']
            if cmd['commander2']:
                commander_names += f" + {cmd['commander2']}"
            
            win_rate = f"{cmd['avgWinRate']:.1%}" if cmd['avgWinRate'] > 0 else "N/A"
            
            print(f"{commander_names[:49]:<50} {cmd['deckCount']:<6} {win_rate:<10} {cmd['top8Count']}")
    
    def show_trending_cards(self, days: int = 30, limit: int = 15):
        """Display trending cards."""
        print(f"\n📈 TRENDING CARDS (Last {days} days)")
        print("=" * 70)
        
        trending = self.get_trending_cards(days, limit)
        
        print(f"{'Card Name':<35} {'Recent':<8} {'Previous':<9} {'Growth'}")
        print("-" * 70)
        
        for card in trending:
            growth = f"{card['growthRate']:+.1f}%" if card['growthRate'] != 0 else "New"
            print(f"{card['cardName'][:34]:<35} {card['entriesRecent']:<8} {card['entriesPrevious']:<9} {growth}")
    
    def show_player_preferences(self, player_name: str = None, limit: int = 15):
        """Display player card preferences."""
        title = f"CARD PREFERENCES - {player_name}" if player_name else f"TOP PLAYER CARD LOYALTIES"
        print(f"\n👤 {title}")
        print("=" * 80)
        
        prefs = self.get_player_preferences(player_name, limit)
        
        if not prefs:
            print("No player preferences found.")
            return
        
        print(f"{'Player':<20} {'Card':<30} {'Times':<6} {'Tournaments':<12} {'Win Rate'}")
        print("-" * 80)
        
        for pref in prefs:
            performance = f"{pref['avgPerformance']:.1%}" if pref['avgPerformance'] > 0 else "N/A"
            print(f"{pref['playerName'][:19]:<20} {pref['cardName'][:29]:<30} {pref['timesPlayed']:<6} {pref['tournamentsPlayed']:<12} {performance}")
    
    def run_full_analysis(self, tournaments: List[Dict]):
        """Run complete analysis pipeline."""
        print("🚀 MTG Tournament Card Analysis (SQLite)")
        print("=" * 80)
        
        # Process tournaments
        result = self.process_tournaments(tournaments)
        
        # Show analysis
        self.show_summary()
        self.show_top_cards(25)
        self.show_commander_meta(15)
        self.show_trending_cards(30, 15)
        self.show_player_preferences(limit=15)
        
        print(f"\n✨ Analysis Complete!")
        print(f"🔧 Ready for GraphQL integration with Pothos/Yoga")
        print("=" * 80)
        
        return result
    
    def export_for_graphql(self) -> Dict[str, Any]:
        """Export data in GraphQL-friendly format."""
        return {
            'summary': self.get_summary(),
            'topCards': self.get_top_cards(50),
            'commanderMeta': self.get_commander_meta(30),
            'trendingCards': self.get_trending_cards(30, 30),
            'playerPreferences': self.get_player_preferences(limit=100)
        }
    
    def create_sample_queries(self) -> Dict[str, str]:
        """Generate sample GraphQL queries for this data."""
        return {
            'summary': '''
            query GetSummary {
              summary {
                totalTournaments
                totalDecks
                totalCardEntries
                uniqueCards
                uniquePlayers
                latestTournament
              }
            }
            ''',
            'topCards': '''
            query GetTopCards($limit: Int = 20, $format: String) {
              topCards(limit: $limit, format: $format) {
                cardName
                totalEntries
                totalDecks
                avgWinRate
                firstSeen
                lastSeen
              }
            }
            ''',
            'commanderMeta': '''
            query GetCommanderMeta($limit: Int = 15) {
              commanderMeta(limit: $limit) {
                commander1
                commander2
                deckCount
                avgWinRate
                top8Count
                lastSeen
              }
            }
            ''',
            'playerPreferences': '''
            query GetPlayerPreferences($playerName: String, $limit: Int = 20) {
              playerPreferences(playerName: $playerName, limit: $limit) {
                playerName
                cardName
                timesPlayed
                avgPerformance
                lastPlayed
              }
            }
            ''',
            'trendingCards': '''
            query GetTrendingCards($days: Int = 30, $limit: Int = 20) {
              trendingCards(days: $days, limit: $limit) {
                cardName
                entriesRecent
                growthRate
                totalEntries
              }
            }
            '''
        }


def create_sqlite_analyzer(db_path: str = "mtg_cards.db") -> SQLiteMTGAnalyzer:
    """Create SQLite MTG analyzer."""
    return SQLiteMTGAnalyzer(db_path)


def integrate_with_topdeck_api_example():
    """Example integration with your existing TopDeck API."""
    example_code = '''
# Add this to your topdeck_api.py main() function:

if detailed_tournaments:
    from mtg_analyzer.sqlite_main import create_sqlite_analyzer
    
    # Create SQLite analyzer
    analyzer = create_sqlite_analyzer("mtg_tournament_data.db")
    
    # Run full analysis
    result = analyzer.run_full_analysis(detailed_tournaments)
    
    # Export data for GraphQL
    graphql_data = analyzer.export_for_graphql()
    
    # Save GraphQL schema examples
    queries = analyzer.create_sample_queries()
    with open("sample_graphql_queries.txt", "w") as f:
        for query_name, query in queries.items():
            f.write(f"# {query_name}\\n{query}\\n\\n")
    
    print("🔧 Database ready for Pothos/Yoga GraphQL integration!")
    print("📝 Sample queries saved to sample_graphql_queries.txt")
'''
    print("INTEGRATION EXAMPLE:")
    print("=" * 50)
    print(example_code)


if __name__ == "__main__":
    print("SQLite MTG Tournament Analysis")
    print("=" * 40)
    print("Perfect for Pothos/Yoga GraphQL integration!")
    print()
    integrate_with_topdeck_api_example()