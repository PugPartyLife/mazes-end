-- Card-Centric Database Schema for MTG Tournament Analysis
-- Focus on tracking card usage across tournaments with relationships to players and decks

-- Core Cards table - canonical card information
CREATE TABLE cards (
    card_id VARCHAR(255) PRIMARY KEY,  -- Scryfall/TopDeck card ID
    card_name VARCHAR(255) NOT NULL,
    mana_cost VARCHAR(50),
    cmc INTEGER,
    type_line TEXT,
    oracle_text TEXT,
    power VARCHAR(10),
    toughness VARCHAR(10),
    colors TEXT,  -- JSON array of colors
    color_identity TEXT,  -- JSON array of color identity
    rarity VARCHAR(20),
    set_code VARCHAR(10),
    collector_number VARCHAR(20),
    legalities TEXT,  -- JSON object of format legalities
    price_usd DECIMAL(10,2),
    image_uri TEXT,
    scryfall_uri TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_card_name (card_name),
    INDEX idx_cmc (cmc),
    INDEX idx_colors (colors(50)),
    INDEX idx_rarity (rarity),
    INDEX idx_type_line (type_line(100))
);

-- Players table - basic player information
CREATE TABLE players (
    player_id VARCHAR(255) PRIMARY KEY,  -- TopDeck player ID
    player_name VARCHAR(255) NOT NULL,
    discord_username VARCHAR(255),
    discord_id VARCHAR(255),
    total_tournaments INTEGER DEFAULT 0,
    first_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_player_name (player_name),
    INDEX idx_discord_id (discord_id)
);

-- Tournaments table - minimal tournament tracking
CREATE TABLE tournaments (
    tournament_id VARCHAR(255) PRIMARY KEY,  -- TopDeck TID
    tournament_name TEXT,
    game VARCHAR(100),
    format VARCHAR(100),
    start_date TIMESTAMP,
    swiss_rounds INTEGER,
    top_cut INTEGER,
    total_players INTEGER,
    location_city VARCHAR(255),
    location_state VARCHAR(255),
    location_venue VARCHAR(255),
    has_decklists BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_format (format),
    INDEX idx_start_date (start_date),
    INDEX idx_total_players (total_players),
    INDEX idx_has_decklists (has_decklists)
);

-- Decks table - each unique deck submission
CREATE TABLE decks (
    deck_id VARCHAR(255) PRIMARY KEY,  -- Generated: tournament_id + player_id hash
    tournament_id VARCHAR(255) NOT NULL,
    player_id VARCHAR(255),
    player_name VARCHAR(255) NOT NULL,  -- Denormalized for performance
    standing INTEGER,
    wins INTEGER DEFAULT 0,
    losses INTEGER DEFAULT 0,
    draws INTEGER DEFAULT 0,
    wins_swiss INTEGER DEFAULT 0,
    losses_swiss INTEGER DEFAULT 0,
    wins_bracket INTEGER DEFAULT 0,
    losses_bracket INTEGER DEFAULT 0,
    win_rate DECIMAL(5,4),
    byes INTEGER DEFAULT 0,
    decklist_raw TEXT,  -- Raw decklist string
    commander_1 VARCHAR(255),  -- Card name of primary commander
    commander_2 VARCHAR(255),  -- Card name of secondary commander (partner/companion)
    deck_colors VARCHAR(20),  -- WUBRG color identity
    total_cards INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (tournament_id) REFERENCES tournaments(tournament_id) ON DELETE CASCADE,
    FOREIGN KEY (player_id) REFERENCES players(player_id) ON DELETE SET NULL,
    
    INDEX idx_tournament (tournament_id),
    INDEX idx_player (player_id),
    INDEX idx_commander_1 (commander_1),
    INDEX idx_commander_2 (commander_2),
    INDEX idx_deck_colors (deck_colors),
    INDEX idx_standing (standing),
    INDEX idx_win_rate (win_rate)
);

-- Card Entries table - CORE TABLE tracking every card in every deck
CREATE TABLE card_entries (
    entry_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    card_id VARCHAR(255) NOT NULL,
    card_name VARCHAR(255) NOT NULL,  -- Denormalized for performance
    deck_id VARCHAR(255) NOT NULL,
    tournament_id VARCHAR(255) NOT NULL,  -- Denormalized for time-based queries
    player_id VARCHAR(255),  -- Denormalized for player-based queries
    player_name VARCHAR(255) NOT NULL,  -- Denormalized for performance
    quantity INTEGER NOT NULL DEFAULT 1,
    deck_section VARCHAR(50) NOT NULL,  -- 'Commanders', 'Mainboard', 'Sideboard', etc.
    tournament_date DATE NOT NULL,  -- Denormalized for time-based analysis
    tournament_format VARCHAR(100) NOT NULL,  -- Denormalized for format analysis
    deck_standing INTEGER,  -- How this deck placed
    deck_win_rate DECIMAL(5,4),  -- How this deck performed
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (card_id) REFERENCES cards(card_id) ON DELETE CASCADE,
    FOREIGN KEY (deck_id) REFERENCES decks(deck_id) ON DELETE CASCADE,
    FOREIGN KEY (tournament_id) REFERENCES tournaments(tournament_id) ON DELETE CASCADE,
    FOREIGN KEY (player_id) REFERENCES players(player_id) ON DELETE SET NULL,
    
    -- Performance indexes for card analysis
    INDEX idx_card_time (card_id, tournament_date),
    INDEX idx_card_format (card_id, tournament_format),
    INDEX idx_card_section (card_id, deck_section),
    INDEX idx_card_performance (card_id, deck_win_rate),
    INDEX idx_tournament_date (tournament_date),
    INDEX idx_player_card (player_id, card_id),
    INDEX idx_deck_section (deck_id, deck_section),
    
    -- Composite indexes for common queries
    INDEX idx_card_format_time (card_id, tournament_format, tournament_date),
    INDEX idx_card_section_performance (card_id, deck_section, deck_win_rate),
    
    UNIQUE KEY unique_card_deck_section (card_id, deck_id, deck_section)
);

-- Card Statistics table - aggregated card usage stats (updated via triggers/jobs)
CREATE TABLE card_statistics (
    card_id VARCHAR(255) PRIMARY KEY,
    card_name VARCHAR(255) NOT NULL,
    
    -- Overall usage stats
    total_entries INTEGER DEFAULT 0,
    total_decks INTEGER DEFAULT 0,
    total_tournaments INTEGER DEFAULT 0,
    first_seen DATE,
    last_seen DATE,
    
    -- Performance stats
    avg_deck_win_rate DECIMAL(5,4),
    avg_deck_standing DECIMAL(8,2),
    top_8_appearances INTEGER DEFAULT 0,
    top_16_appearances INTEGER DEFAULT 0,
    
    -- Format breakdown (JSON for flexibility)
    format_stats JSON,  -- {"EDH": {"entries": 150, "decks": 75}, "Standard": {...}}
    
    -- Time-based stats
    entries_last_30_days INTEGER DEFAULT 0,
    entries_last_90_days INTEGER DEFAULT 0,
    trend_direction ENUM('rising', 'stable', 'falling'),
    
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (card_id) REFERENCES cards(card_id) ON DELETE CASCADE,
    
    INDEX idx_total_entries (total_entries DESC),
    INDEX idx_win_rate (avg_deck_win_rate DESC),
    INDEX idx_last_seen (last_seen DESC),
    INDEX idx_trend (trend_direction, entries_last_30_days DESC)
);

-- Commander Pairings table - track which commanders are played together
CREATE TABLE commander_pairings (
    pairing_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    commander_1 VARCHAR(255) NOT NULL,
    commander_2 VARCHAR(255),  -- NULL for single commander decks
    tournament_format VARCHAR(100) NOT NULL,
    deck_count INTEGER DEFAULT 1,
    avg_win_rate DECIMAL(5,4),
    last_seen DATE NOT NULL,
    
    INDEX idx_commander_1 (commander_1),
    INDEX idx_commander_2 (commander_2),
    INDEX idx_format (tournament_format),
    INDEX idx_deck_count (deck_count DESC),
    
    UNIQUE KEY unique_pairing_format (commander_1, commander_2, tournament_format)
);

-- Views for common queries

-- Card popularity over time
CREATE VIEW card_popularity_by_month AS
SELECT 
    card_id,
    card_name,
    DATE_FORMAT(tournament_date, '%Y-%m') as month,
    COUNT(*) as entries,
    COUNT(DISTINCT deck_id) as unique_decks,
    COUNT(DISTINCT tournament_id) as tournaments,
    AVG(deck_win_rate) as avg_win_rate
FROM card_entries
GROUP BY card_id, card_name, DATE_FORMAT(tournament_date, '%Y-%m');

-- Top cards by format
CREATE VIEW top_cards_by_format AS
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
HAVING COUNT(*) >= 5  -- Only cards with meaningful sample size
ORDER BY tournament_format, total_entries DESC;

-- Rising cards (trending up in usage)
CREATE VIEW rising_cards AS
SELECT 
    ce.card_id,
    ce.card_name,
    COUNT(CASE WHEN ce.tournament_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY) THEN 1 END) as entries_last_30,
    COUNT(CASE WHEN ce.tournament_date >= DATE_SUB(CURDATE(), INTERVAL 60 DAY) 
               AND ce.tournament_date < DATE_SUB(CURDATE(), INTERVAL 30 DAY) THEN 1 END) as entries_prev_30,
    ROUND(
        (COUNT(CASE WHEN ce.tournament_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY) THEN 1 END) - 
         COUNT(CASE WHEN ce.tournament_date >= DATE_SUB(CURDATE(), INTERVAL 60 DAY) 
                    AND ce.tournament_date < DATE_SUB(CURDATE(), INTERVAL 30 DAY) THEN 1 END)) /
        GREATEST(COUNT(CASE WHEN ce.tournament_date >= DATE_SUB(CURDATE(), INTERVAL 60 DAY) 
                           AND ce.tournament_date < DATE_SUB(CURDATE(), INTERVAL 30 DAY) THEN 1 END), 1) * 100, 2
    ) as growth_rate_percent
FROM card_entries ce
GROUP BY ce.card_id, ce.card_name
HAVING entries_last_30 >= 5  -- Minimum threshold
ORDER BY growth_rate_percent DESC;

-- Player card preferences (what cards does each player favor?)
CREATE VIEW player_card_preferences AS
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
HAVING times_played >= 2  -- Players who have played the card multiple times
ORDER BY ce.player_id, times_played DESC;

-- Commander meta breakdown
CREATE VIEW commander_meta AS
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