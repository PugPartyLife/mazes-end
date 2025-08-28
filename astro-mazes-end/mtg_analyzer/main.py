"""
Simple wrapper for MTG tournament card analysis.
Usage: python main.py
"""

from typing import Dict, List
from .database import CardDatabase
from .models import CardStats, PlayerCardPreference, CommanderPairing


class MTGAnalyzer:
    """Simple wrapper for MTG tournament card analysis."""
    
    def __init__(self, db_config: Dict):
        """Initialize with database configuration."""
        self.db = CardDatabase(db_config)
    
    def process_tournaments(self, tournaments: List[Dict]) -> None:
        """Process tournament data into card-centric database."""
        print("Processing tournaments into card database...")
        
        stats = self.db.process_tournaments(tournaments)
        
        print(f"\n✅ Processing Complete!")
        print(f"📊 Tournaments processed: {stats['tournaments_processed']}")
        print(f"🃏 Decks processed: {stats['decks_processed']}")
        print(f"📇 Card entries created: {stats['card_entries_created']}")
        print(f"👥 Players added: {stats['players_added']}")
    
    def show_top_cards(self, limit: int = 20) -> None:
        """Display most popular cards."""
        print(f"\n🎯 TOP {limit} MOST PLAYED CARDS")
        print("=" * 80)
        
        cards = self.db.get_top_cards(limit)
        
        print(f"{'Card Name':<35} {'Entries':<8} {'Decks':<6} {'Tournaments':<12} {'Win Rate'}")
        print("-" * 80)
        
        for card in cards:
            win_rate = f"{card.avg_win_rate:.1%}" if card.avg_win_rate > 0 else "N/A"
            print(f"{card.card_name[:34]:<35} {card.total_entries:<8} {card.total_decks:<6} {card.total_tournaments:<12} {win_rate}")
    
    def show_player_preferences(self, player_name: str = None, limit: int = 20) -> None:
        """Display player card preferences."""
        title = f"CARD PREFERENCES FOR {player_name}" if player_name else f"TOP {limit} PLAYER CARD LOYALTIES"
        print(f"\n👤 {title}")
        print("=" * 80)
        
        prefs = self.db.get_player_preferences(player_name, min_usage=2)[:limit]
        
        if not prefs:
            print("No player preferences found.")
            return
        
        print(f"{'Player':<20} {'Card':<30} {'Times':<6} {'Tournaments':<12} {'Performance'}")
        print("-" * 80)
        
        for pref in prefs:
            performance = f"{pref.avg_performance:.1%}" if pref.avg_performance > 0 else "N/A"
            print(f"{pref.player_name[:19]:<20} {pref.card_name[:29]:<30} {pref.times_played:<6} {pref.tournaments_played:<12} {performance}")
    
    def show_commander_meta(self, limit: int = 20) -> None:
        """Display commander meta breakdown."""
        print(f"\n⚔️  TOP {limit} COMMANDER COMBINATIONS")
        print("=" * 80)
        
        commanders = self.db.get_commander_meta(limit)
        
        print(f"{'Commanders':<50} {'Decks':<6} {'Win Rate':<10} {'Last Seen'}")
        print("-" * 80)
        
        for cmd in commanders:
            commander_names = cmd.commander_1
            if cmd.commander_2:
                commander_names += f" + {cmd.commander_2}"
            
            win_rate = f"{cmd.avg_win_rate:.1%}" if cmd.avg_win_rate > 0 else "N/A"
            last_seen = cmd.last_seen.strftime("%Y-%m-%d") if cmd.last_seen else "Unknown"
            
            print(f"{commander_names[:49]:<50} {cmd.deck_count:<6} {win_rate:<10} {last_seen}")
    
    def run_full_analysis(self, tournaments: List[Dict]) -> None:
        """Run complete analysis pipeline."""
        print("🚀 Starting MTG Tournament Card Analysis")
        print("=" * 80)
        
        # Process tournaments
        self.process_tournaments(tournaments)
        
        # Show analysis
        self.show_top_cards(25)
        self.show_commander_meta(15)
        self.show_player_preferences(limit=15)
        
        print(f"\n✨ Analysis Complete!")
        print("=" * 80)


def create_analyzer(host: str = "localhost", 
                   user: str = "root", 
                   password: str = "", 
                   database: str = "mtg_cards") -> MTGAnalyzer:
    """Create an MTG analyzer with database configuration."""
    db_config = {
        'host': host,
        'user': user,
        'password': password,
        'database': database,
        'charset': 'utf8mb4'
    }
    
    return MTGAnalyzer(db_config)


# Example usage for integration with your TopDeck API
def integrate_with_topdeck_api():
    """
    Add this to your existing topdeck_api.py main() function:
    
    # After getting detailed_tournaments from API:
    if detailed_tournaments:
        from mtg_analyzer import create_analyzer
        
        # Create analyzer
        analyzer = create_analyzer(
            host='localhost',
            user='your_username',
            password='your_password',
            database='mtg_cards'
        )
        
        # Run full analysis
        analyzer.run_full_analysis(detailed_tournaments)
    """
    pass


if __name__ == "__main__":
    print("MTG Tournament Card Analysis")
    print("=" * 40)
    print("This is a wrapper module. To use:")
    print()
    print("1. Create database schema using the SQL file")
    print("2. Import: from mtg_analyzer import create_analyzer")
    print("3. Create analyzer: analyzer = create_analyzer('localhost', 'user', 'pass', 'db')")
    print("4. Run analysis: analyzer.run_full_analysis(tournament_data)")
    print()
    print("Integration example:")
    print("```python")
    print("# In your topdeck_api.py main() function:")
    print("if detailed_tournaments:")
    print("    from mtg_analyzer import create_analyzer")
    print("    ")
    print("    analyzer = create_analyzer(")
    print("        host='localhost',")
    print("        user='your_username', ")
    print("        password='your_password',")
    print("        database='mtg_cards'")
    print("    )")
    print("    ")
    print("    analyzer.run_full_analysis(detailed_tournaments)")
    print("```")