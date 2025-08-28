-- SQLite Schema for MTG Tournament Card Analysis
-- Optimized for Pothos/Yoga GraphQL integration

PRAGMA foreign_keys = ON;
PRAGMA journal_mode = WAL;

-- Core Cards table - canonical card information
CREATE TABLE IF NOT EXISTS cards (
    card_id TEXT PRIMARY KEY,
    card_name TEXT NOT NULL,
    mana_cost TEXT,
    cmc INTEGER,
    type_line TEXT,
    oracle_text TEXT,
    power TEXT,
    toughness TEXT,
    colors TEXT, -- JSON array of colors
    color_identity TEXT, -- JSON array of color identity
    rarity TEXT,
    set_code TEXT,
    collector_number TEXT,
    legalities TEXT, -- JSON object of format legalities
    price_usd REAL,
    image_uri TEXT,
    scryfall_uri TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_cards_name ON cards(card_name);
CREATE INDEX IF NOT EXISTS idx_cards_cmc ON cards(cmc);
CREATE INDEX IF NOT EXISTS idx_cards_rarity ON cards(rarity);
CREATE INDEX IF NOT EXISTS idx_cards_type_line ON cards(type_line);

-- Players table - basic player information
CREATE TABLE IF NOT EXISTS players (
    player_id TEXT PRIMARY KEY,
    player_name TEXT NOT NULL,
    discord_username TEXT,
    discord_id TEXT,
    total_tournaments INTEGER DEFAULT 0,
    first_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_seen DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_players_name ON players(player_name);
CREATE INDEX IF NOT EXISTS idx_players_discord_id ON players(discord_id);

-- Tournaments table - minimal tournament tracking
CREATE TABLE IF NOT EXISTS tournaments (
    tournament_id TEXT PRIMARY KEY,
    tournament_name TEXT,
    game TEXT,
    format TEXT,
    start_date DATETIME,
    swiss_rounds INTEGER,
    top_cut INTEGER,
    total_players INTEGER,
    location_city TEXT,
    location_state TEXT,
    location_venue TEXT,
    has_decklists BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_tournaments_format ON tournaments(format);
CREATE INDEX IF NOT EXISTS idx_tournaments_start_date ON tournaments(start_date);
CREATE INDEX IF NOT EXISTS idx_tournaments_total_players ON tournaments(total_players);
CREATE INDEX IF NOT EXISTS idx_tournaments_has_decklists ON tournaments(has_decklists);

-- Decks table - each unique deck submission
CREATE TABLE IF NOT EXISTS decks (
    deck_id TEXT PRIMARY KEY,
    tournament_id TEXT NOT NULL,
    player_id TEXT,
    player_name TEXT NOT NULL,
    standing INTEGER,
    wins INTEGER DEFAULT 0,
    losses INTEGER DEFAULT 0,
    draws INTEGER DEFAULT 0,
    wins_swiss INTEGER DEFAULT 0,
    losses_swiss INTEGER DEFAULT 0,
    wins_bracket INTEGER DEFAULT 0,
    losses_bracket INTEGER DEFAULT 0,
    win_rate REAL DEFAULT 0.0,
    byes INTEGER DEFAULT 0,
    decklist_raw TEXT,
    commander_1 TEXT,
    commander_2 TEXT,
    deck_colors TEXT,
    total_cards INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (tournament_id) REFERENCES tournaments(tournament_id) ON DELETE CASCADE,
    FOREIGN KEY (player_id) REFERENCES players(player_id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_decks_tournament ON decks(tournament_id);
CREATE INDEX IF NOT EXISTS idx_decks_player ON decks(player_id);
CREATE INDEX IF NOT EXISTS idx_decks_commander_1 ON decks(commander_1);
CREATE INDEX IF NOT EXISTS idx_decks_commander_2 ON decks(commander_2);
CREATE INDEX IF NOT EXISTS idx_decks_colors ON decks(deck_colors);
CREATE INDEX IF NOT EXISTS idx_decks_standing ON decks(standing);
CREATE INDEX IF NOT EXISTS idx_decks_win_rate ON decks(win_rate);

-- Card Entries table - CORE TABLE tracking every card in every deck
CREATE TABLE IF NOT EXISTS card_entries (
    entry_id INTEGER PRIMARY KEY AUTOINCREMENT,
    card_id TEXT NOT NULL,
    card_name TEXT NOT NULL,
    deck_id TEXT NOT NULL,
    tournament_id TEXT NOT NULL,
    player_id TEXT,
    player_name TEXT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    deck_section TEXT NOT NULL,
    tournament_date DATE NOT NULL,
    tournament_format TEXT NOT NULL,
    deck_standing INTEGER,
    deck_win_rate REAL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (card_id) REFERENCES cards(card_id) ON DELETE CASCADE,
    FOREIGN KEY (deck_id) REFERENCES decks(deck_id) ON DELETE CASCADE,
    FOREIGN KEY (tournament_id) REFERENCES tournaments(tournament_id) ON DELETE CASCADE,
    FOREIGN KEY (player_id) REFERENCES players(player_id) ON DELETE SET NULL
);

-- Performance indexes for card analysis
CREATE INDEX IF NOT EXISTS idx_card_entries_card_time ON card_entries(card_id, tournament_date);
CREATE INDEX IF NOT EXISTS idx_card_entries_card_format ON card_entries(card_id, tournament_format);
CREATE INDEX IF NOT EXISTS idx_card_entries_card_section ON card_entries(card_id, deck_section);
CREATE INDEX IF NOT EXISTS idx_card_entries_card_performance ON card_entries(card_id, deck_win_rate);
CREATE INDEX IF NOT EXISTS idx_card_entries_tournament_date ON card_entries(tournament_date);
CREATE INDEX IF NOT EXISTS idx_card_entries_player_card ON card_entries(player_id, card_id);
CREATE INDEX IF NOT EXISTS idx_card_entries_deck_section ON card_entries(deck_id, deck_section);

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_card_entries_card_format_time ON card_entries(card_id, tournament_format, tournament_date);
CREATE INDEX IF NOT EXISTS idx_card_entries_card_section_performance ON card_entries(card_id, deck_section, deck_win_rate);

-- Unique constraint for card entries
CREATE UNIQUE INDEX IF NOT EXISTS idx_card_entries_unique ON card_entries(card_id, deck_id, deck_section);

-- Card Statistics table - aggregated card usage stats
CREATE TABLE IF NOT EXISTS card_statistics (
    card_id TEXT PRIMARY KEY,
    card_name TEXT NOT NULL,
    
    -- Overall usage stats
    total_entries INTEGER DEFAULT 0,
    total_decks INTEGER DEFAULT 0,
    total_tournaments INTEGER DEFAULT 0,
    first_seen DATE,
    last_seen DATE,
    
    -- Performance stats
    avg_deck_win_rate REAL DEFAULT 0.0,
    avg_deck_standing REAL DEFAULT 0.0,
    top_8_appearances INTEGER DEFAULT 0,
    top_16_appearances INTEGER DEFAULT 0,
    
    -- Format breakdown (JSON for flexibility)
    format_stats TEXT, -- JSON: {"EDH": {"entries": 150, "decks": 75}, "Standard": {...}}
    
    -- Time-based stats
    entries_last_30_days INTEGER DEFAULT 0,
    entries_last_90_days INTEGER DEFAULT 0,
    trend_direction TEXT CHECK(trend_direction IN ('rising', 'stable', 'falling')),
    
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (card_id) REFERENCES cards(card_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_card_statistics_total_entries ON card_statistics(total_entries DESC);
CREATE INDEX IF NOT EXISTS idx_card_statistics_win_rate ON card_statistics(avg_deck_win_rate DESC);
CREATE INDEX IF NOT EXISTS idx_card_statistics_last_seen ON card_statistics(last_seen DESC);
CREATE INDEX IF NOT EXISTS idx_card_statistics_trend ON card_statistics(trend_direction, entries_last_30_days DESC);

-- Commander Pairings table - track which commanders are played together
CREATE TABLE IF NOT EXISTS commander_pairings (
    pairing_id INTEGER PRIMARY KEY AUTOINCREMENT,
    commander_1 TEXT NOT NULL,
    commander_2 TEXT,
    tournament_format TEXT NOT NULL,
    deck_count INTEGER DEFAULT 1,
    avg_win_rate REAL DEFAULT 0.0,
    last_seen DATE NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_commander_pairings_commander_1 ON commander_pairings(commander_1);
CREATE INDEX IF NOT EXISTS idx_commander_pairings_commander_2 ON commander_pairings(commander_2);
CREATE INDEX IF NOT EXISTS idx_commander_pairings_format ON commander_pairings(tournament_format);
CREATE INDEX IF NOT EXISTS idx_commander_pairings_deck_count ON commander_pairings(deck_count DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_commander_pairings_unique ON commander_pairings(commander_1, commander_2, tournament_format);

-- Views for common GraphQL queries

-- Card popularity over time (GraphQL-friendly)
CREATE VIEW IF NOT EXISTS card_popularity_by_month AS
SELECT 
    card_id,
    card_name,
    strftime('%Y-%m', tournament_date) as month,
    COUNT(*) as entries,
    COUNT(DISTINCT deck_id) as unique_decks,
    COUNT(DISTINCT tournament_id) as tournaments,
    AVG(deck_win_rate) as avg_win_rate
FROM card_entries
GROUP BY card_id, card_name, strftime('%Y-%m', tournament_date);

-- Top cards by format (perfect for GraphQL resolvers)
CREATE VIEW IF NOT EXISTS top_cards_by_format AS
SELECT 
    tournament_format,
    card_name,
    card_id,
    COUNT(*) as total_entries,
    COUNT(DISTINCT deck_id) as unique_decks,
    COUNT(DISTINCT tournament_id) as tournaments,
    AVG(deck_win_rate) as avg_win_rate,
    AVG(deck_standing) as avg_standing
FROM card_entries
GROUP BY tournament_format, card_id, card_name
HAVING COUNT(*) >= 5
ORDER BY tournament_format, total_entries DESC;

-- Rising cards (trending analysis)
CREATE VIEW IF NOT EXISTS rising_cards AS
SELECT 
    ce.card_id,
    ce.card_name,
    COUNT(CASE WHEN ce.tournament_date >= date('now', '-30 days') THEN 1 END) as entries_last_30,
    COUNT(CASE WHEN ce.tournament_date >= date('now', '-60 days') 
               AND ce.tournament_date < date('now', '-30 days') THEN 1 END) as entries_prev_30,
    ROUND(
        CAST(COUNT(CASE WHEN ce.tournament_date >= date('now', '-30 days') THEN 1 END) - 
         COUNT(CASE WHEN ce.tournament_date >= date('now', '-60 days') 
                    AND ce.tournament_date < date('now', '-30 days') THEN 1 END) AS REAL) /
        MAX(COUNT(CASE WHEN ce.tournament_date >= date('now', '-60 days') 
                       AND ce.tournament_date < date('now', '-30 days') THEN 1 END), 1) * 100, 2
    ) as growth_rate_percent
FROM card_entries ce
GROUP BY ce.card_id, ce.card_name
HAVING entries_last_30 >= 5
ORDER BY growth_rate_percent DESC;

-- Player card preferences (GraphQL resolver ready)
CREATE VIEW IF NOT EXISTS player_card_preferences AS
SELECT 
    ce.player_id,
    ce.player_name,
    ce.card_id,
    ce.card_name,
    COUNT(*) as times_played,
    COUNT(DISTINCT ce.tournament_id) as tournaments_played,
    AVG(ce.deck_win_rate) as avg_performance,
    MAX(ce.tournament_date) as last_played
FROM card_entries ce
WHERE ce.player_id IS NOT NULL
GROUP BY ce.player_id, ce.player_name, ce.card_id, ce.card_name
HAVING times_played >= 2
ORDER BY ce.player_id, times_played DESC;

-- Commander meta breakdown (great for GraphQL)
CREATE VIEW IF NOT EXISTS commander_meta AS
SELECT 
    ce.tournament_format,
    d.commander_1,
    d.commander_2,
    COUNT(DISTINCT d.deck_id) as deck_count,
    AVG(d.win_rate) as avg_win_rate,
    COUNT(CASE WHEN d.standing <= 8 THEN 1 END) as top_8_count,
    MAX(ce.tournament_date) as last_seen
FROM decks d
JOIN card_entries ce ON d.deck_id = ce.deck_id
GROUP BY ce.tournament_format, d.commander_1, d.commander_2
HAVING deck_count >= 3
ORDER BY ce.tournament_format, deck_count DESC;