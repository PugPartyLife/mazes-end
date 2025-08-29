# MTG Tournament Analysis

Simple Python tool to fetch Magic: The Gathering tournament data from TopDeck.gg and analyze it in SQLite.

## What it does

1. Hits the TopDeck.gg API to get recent tournament data
2. Parses decklists to extract individual cards
3. Stores everything in SQLite for analysis
4. Shows card usage statistics and trends

## Quick Start

### 1. Get API Key
Get your API key from [TopDeck.gg](https://topdeck.gg/docs/tournaments-v2)

```bash
export TOPDECKGG_API_KEY="your-api-key-here"
```

### 2. Install Requirements
```bash
pip install requests
```

### 3. Run Analysis
```bash
python scripts/run_analysis.py
```

## Project Structure

```
your-project/
├── scripts/
│   ├── topdeck_api.py          # TopDeck API client
│   └── run_analysis.py         # Main pipeline script
└── mtg_analyzer/
    ├── __init__.py
    ├── models.py               # Data structures
    ├── parser.py               # Decklist parsing
    ├── sqlite_database.py      # Database operations
    ├── sqlite_main.py          # Main analyzer
    └── schema.sql              # Database schema
```

## Usage

### Basic Usage
```bash
# Last 10 days, EDH, 50+ players (default)
python scripts/run_analysis.py

# Custom parameters
python scripts/run_analysis.py --days 30 --min-players 100 --format Modern

# Different database file
python scripts/run_analysis.py --db-path my_tournaments.db
```

### Programmatic Usage
```python
from mtg_analyzer.sqlite_main import create_sqlite_analyzer

# Create analyzer
analyzer = create_sqlite_analyzer("my_database.db")

# Get your tournament data (from TopDeck API)
tournaments = your_tournament_data

# Process into database
result = analyzer.run_full_analysis(tournaments)

# Get results
top_cards = analyzer.get_top_cards(25)
commander_meta = analyzer.get_commander_meta(15)
trending = analyzer.get_trending_cards(30)
```

## Database Output

Creates SQLite database with these tables:
- **tournaments** - Tournament info
- **players** - Player data  
- **decks** - Individual deck submissions
- **card_entries** - Every card in every deck (main table)
- **card_statistics** - Aggregated usage stats

## GraphQL Ready

All data is returned in GraphQL-friendly format:

```javascript
// Example data structure
{
  "topCards": [
    {
      "cardName": "Sol Ring",
      "totalEntries": 247,
      "totalDecks": 156,
      "avgWinRate": 0.67
    }
  ],
  "commanderMeta": [
    {
      "commander1": "Thrasios, Triton Hero",
      "commander2": "Tymna the Weaver", 
      "deckCount": 23,
      "avgWinRate": 0.71
    }
  ]
}
```

## Command Line Options

```bash
python scripts/run_analysis.py --help

Options:
  --days N              Days back to search (default: 10)
  --min-players N       Minimum players per tournament (default: 50) 
  --format FORMAT       Tournament format (default: EDH)
  --game GAME           Game name (default: Magic: The Gathering)
  --db-path PATH        Database file path
  --export FILE         Export sample JSON for GraphQL
  --info-only           Show database info without fetching
  --report              Show detailed analysis report
```

## What You Get

- **Card Usage Trends** - Which cards are popular/declining
- **Performance Data** - Win rates by card
- **Commander Meta** - Most played commander combinations  
- **Player Analysis** - Individual player card preferences
- **Time Series Data** - Usage over time for trend analysis

Perfect for feeding into GraphQL APIs or building MTG analytics dashboards.

## Files

- `scripts/topdeck_api.py` - Your working TopDeck API client with rate limiting
- `scripts/run_analysis.py` - Main script that ties everything together
- `mtg_analyzer/` - Core library for parsing and database operations
- Creates `mtg_tournament_data.db` SQLite file with all the data