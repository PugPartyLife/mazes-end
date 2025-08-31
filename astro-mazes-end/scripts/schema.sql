-- MTG Tournament Data Schema - Updated Cards Table for Enhanced Scryfall Data
-- Focus: Clean tournament storage -> TopCommanders/TopCards via decklist parsing

PRAGMA foreign_keys = ON;
PRAGMA journal_mode = WAL;

-- Raw tournament data from TopDeck API
CREATE TABLE IF NOT EXISTS tournaments (
    tournament_id TEXT PRIMARY KEY,
    tournament_name TEXT,
    game TEXT DEFAULT 'Magic: The Gathering',
    format TEXT DEFAULT 'EDH',
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

-- Players and their performance across tournaments
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

-- Individual deck entries (one per tournament participation)
-- Now stores the raw decklist string for later parsing
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
    
    -- Raw decklist from TopDeck.gg - store as-is for parsing later
    decklist_raw TEXT,
    decklist_parsed BOOLEAN DEFAULT 0, -- Flag to track if we've parsed this deck yet
    
    -- Commander info (can be extracted from decklist or API)
    commander_1 TEXT,
    commander_2 TEXT, -- For partner commanders
    deck_colors TEXT, -- Color identity (WUBRG format)
    
    has_decklist BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (tournament_id) REFERENCES tournaments(tournament_id) ON DELETE CASCADE,
    FOREIGN KEY (player_id) REFERENCES players(player_id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_decks_tournament ON decks(tournament_id);
CREATE INDEX IF NOT EXISTS idx_decks_commander_1 ON decks(commander_1);
CREATE INDEX IF NOT EXISTS idx_decks_standing ON decks(standing);
CREATE INDEX IF NOT EXISTS idx_decks_win_rate ON decks(win_rate);
CREATE INDEX IF NOT EXISTS idx_decks_has_decklist ON decks(has_decklist);
CREATE INDEX IF NOT EXISTS idx_decks_parsed ON decks(decklist_parsed);

-- Enhanced cards table - matches all fields from enhanced Scryfall API
CREATE TABLE IF NOT EXISTS cards (
    card_name TEXT PRIMARY KEY, -- Canonical card name
    scryfall_id TEXT UNIQUE, -- Scryfall's unique ID
    
    -- Core card data
    mana_cost TEXT,
    cmc INTEGER, -- Converted mana cost
    type_line TEXT, -- "Legendary Creature — Human Wizard"
    oracle_text TEXT,
    power TEXT,
    toughness TEXT,
    
    -- Color information (stored as JSON)
    colors TEXT, -- Actual colors in mana cost (JSON array like ["W","U"])
    color_identity TEXT, -- Color identity including abilities (JSON array)
    
    -- Multi-face card support
    layout TEXT, -- transform, modal_dfc, split, etc.
    card_faces TEXT, -- JSON array of face data for multi-face cards
    
    -- Visual assets (all image URLs stored as JSON)
    image_uris TEXT, -- JSON object with all image sizes and face images
    
    -- Additional metadata
    component TEXT, -- token, meld_part, etc.
    rarity TEXT, -- common, uncommon, rare, mythic
    flavor_text TEXT,
    artist TEXT,
    
    -- Set information  
    set_code TEXT,
    set_name TEXT,
    collector_number TEXT,
    
    -- Scryfall URIs
    scryfall_uri TEXT, -- Link to card page on Scryfall
    uri TEXT, -- Link to this card object in Scryfall API
    rulings_uri TEXT, -- Link to card's rulings
    prints_search_uri TEXT, -- Link to search all prints/reprints
    
    -- Card categorization for analysis
    is_commander BOOLEAN DEFAULT 0,
    is_basic_land BOOLEAN DEFAULT 0,
    is_artifact BOOLEAN DEFAULT 0,
    is_creature BOOLEAN DEFAULT 0,
    is_instant BOOLEAN DEFAULT 0,
    is_sorcery BOOLEAN DEFAULT 0,
    is_enchantment BOOLEAN DEFAULT 0,
    is_planeswalker BOOLEAN DEFAULT 0,
    
    -- Price and availability (can be updated periodically)
    price_usd REAL,
    price_updated DATETIME,
    
    -- Metadata
    first_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_updated DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Enhanced indexes for cards table
CREATE INDEX IF NOT EXISTS idx_cards_scryfall_id ON cards(scryfall_id);
CREATE INDEX IF NOT EXISTS idx_cards_type ON cards(type_line);
CREATE INDEX IF NOT EXISTS idx_cards_colors ON cards(colors);
CREATE INDEX IF NOT EXISTS idx_cards_cmc ON cards(cmc);
CREATE INDEX IF NOT EXISTS idx_cards_is_commander ON cards(is_commander);
CREATE INDEX IF NOT EXISTS idx_cards_layout ON cards(layout);
CREATE INDEX IF NOT EXISTS idx_cards_rarity ON cards(rarity);
CREATE INDEX IF NOT EXISTS idx_cards_set_code ON cards(set_code);
CREATE INDEX IF NOT EXISTS idx_cards_artist ON cards(artist);

-- Junction table for deck compositions
-- This replaces the massive card_entries table with a much smaller one
-- Only stores the relationship between decks and cards with quantities
CREATE TABLE IF NOT EXISTS deck_cards (
    deck_id TEXT NOT NULL,
    card_name TEXT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    deck_section TEXT DEFAULT 'mainboard', -- 'commander', 'mainboard', 'sideboard'
    
    PRIMARY KEY (deck_id, card_name, deck_section),
    FOREIGN KEY (deck_id) REFERENCES decks(deck_id) ON DELETE CASCADE,
    FOREIGN KEY (card_name) REFERENCES cards(card_name) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_deck_cards_deck ON deck_cards(deck_id);
CREATE INDEX IF NOT EXISTS idx_deck_cards_card ON deck_cards(card_name);
CREATE INDEX IF NOT EXISTS idx_deck_cards_section ON deck_cards(deck_section);

-- Survey responses for commander recommendations (unchanged)
CREATE TABLE IF NOT EXISTS player_surveys (
    survey_id TEXT PRIMARY KEY,
    player_id TEXT,
    
    -- Color preferences
    preferred_colors TEXT, -- JSON array like ["W","U","B"]
    avoid_colors TEXT, -- JSON array of colors to avoid
    
    -- Playstyle preferences  
    play_style TEXT CHECK(play_style IN ('Aggro', 'Control', 'Combo', 'Midrange', 'Casual')),
    win_condition_pref TEXT CHECK(win_condition_pref IN ('Combat', 'Combo', 'Alt Win', 'Value', 'Any')),
    
    -- Experience and complexity
    experience_level TEXT CHECK(experience_level IN ('Beginner', 'Intermediate', 'Advanced', 'Expert')),
    complexity_comfort INTEGER CHECK(complexity_comfort BETWEEN 1 AND 5), -- 1=Simple, 5=Complex
    
    -- Budget and power level
    budget_range TEXT CHECK(budget_range IN ('Budget', 'Mid', 'High', 'No Limit')),
    power_level_target INTEGER CHECK(power_level_target BETWEEN 1 AND 10), -- 1=Casual, 10=cEDH
    
    -- Social preferences
    interaction_level TEXT CHECK(interaction_level IN ('Low', 'Medium', 'High')),
    politics_comfort BOOLEAN DEFAULT 0,
    
    -- Theme interests
    kindred_interest BOOLEAN DEFAULT 0,
    artifacts_interest BOOLEAN DEFAULT 0,
    graveyard_interest BOOLEAN DEFAULT 0,
    spellslinger_interest BOOLEAN DEFAULT 0,
    
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Simple archetype tags for commanders (unchanged)
CREATE TABLE IF NOT EXISTS commander_archetypes (
    commander_name TEXT,
    archetype_tag TEXT,
    confidence_score REAL DEFAULT 1.0, -- How confident we are in this tag
    
    PRIMARY KEY (commander_name, archetype_tag)
);

-- Updated view for TopCommanders analysis (now uses deck data directly)
CREATE VIEW IF NOT EXISTS top_commanders AS
SELECT 
    commander_1 as commander_name,
    commander_2 as partner_name,
    
    -- Popularity metrics
    COUNT(*) as total_decks,
    COUNT(DISTINCT tournament_id) as tournaments_played,
    
    -- Performance metrics
    AVG(win_rate) as avg_win_rate,
    AVG(CAST(standing AS REAL)) as avg_standing,
    COUNT(CASE WHEN standing <= 8 THEN 1 END) as top_8_finishes,
    COUNT(CASE WHEN standing <= 16 THEN 1 END) as top_16_finishes,
    
    -- Recent activity
    MIN(created_at) as first_seen,
    MAX(created_at) as last_seen,
    
    -- Combined score (popularity * performance)
    (COUNT(*) * 0.6 + (1.0 / AVG(CAST(standing AS REAL))) * COUNT(*) * 0.4) as popularity_score
    
FROM decks 
WHERE commander_1 IS NOT NULL 
  AND has_decklist = 1  -- Only include decks with actual decklists
GROUP BY commander_1, commander_2
HAVING total_decks >= 5;

-- Updated view for TopCards analysis (now uses the normalized structure)
CREATE VIEW IF NOT EXISTS top_cards_for_commanders AS
SELECT 
    d.commander_1 as commander_name,
    dc.card_name,
    c.type_line,
    c.cmc,
    c.colors,
    c.rarity,
    c.price_usd,
    
    -- Inclusion metrics
    COUNT(*) as total_inclusions,
    COUNT(DISTINCT dc.deck_id) as decks_included,
    COUNT(DISTINCT d.tournament_id) as tournaments_seen,
    
    -- Calculate inclusion rate for this commander
    CAST(COUNT(DISTINCT dc.deck_id) AS REAL) / 
    (SELECT COUNT(DISTINCT deck_id) 
     FROM decks d2 
     WHERE d2.commander_1 = d.commander_1 
       AND d2.has_decklist = 1) as inclusion_rate,
    
    -- Performance in decks that include this card
    AVG(d.win_rate) as avg_win_rate_with_card,
    AVG(CAST(d.standing AS REAL)) as avg_standing_with_card,
    
    -- Enhanced metadata
    c.artist,
    c.set_code,
    c.layout,
    dc.deck_section,
    MIN(d.created_at) as first_seen,
    MAX(d.created_at) as last_seen
    
FROM deck_cards dc
JOIN decks d ON dc.deck_id = d.deck_id
JOIN cards c ON dc.card_name = c.card_name
WHERE d.commander_1 IS NOT NULL 
  AND d.has_decklist = 1
  AND dc.deck_section != 'commander'  -- Exclude commanders from card analysis
GROUP BY d.commander_1, dc.card_name, dc.deck_section
HAVING total_inclusions >= 3
ORDER BY d.commander_1, inclusion_rate DESC;

-- Updated commander recommendations view
CREATE VIEW IF NOT EXISTS commander_recommendations AS
SELECT 
    tc.commander_name,
    tc.partner_name,
    tc.total_decks,
    tc.avg_win_rate,
    tc.popularity_score,
    tc.top_8_finishes,
    
    -- Enhanced commander info from cards table
    c.color_identity,
    c.type_line as commander_type,
    c.mana_cost as commander_cost,
    c.cmc as commander_cmc,
    c.oracle_text as commander_ability,
    c.image_uris as commander_images,
    c.scryfall_uri as commander_url,
    
    -- Archetype tags
    GROUP_CONCAT(ca.archetype_tag) as archetype_tags,
    AVG(ca.confidence_score) as archetype_confidence,
    
    -- Price estimate (average of recent decks)
    (SELECT AVG(total_price) FROM (
        SELECT SUM(c2.price_usd * dc2.quantity) as total_price
        FROM deck_cards dc2 
        JOIN cards c2 ON dc2.card_name = c2.card_name
        JOIN decks d2 ON dc2.deck_id = d2.deck_id
        WHERE d2.commander_1 = tc.commander_name
          AND c2.price_usd IS NOT NULL
        GROUP BY dc2.deck_id
        LIMIT 10  -- Last 10 decks
    )) as estimated_deck_price
    
FROM top_commanders tc
LEFT JOIN cards c ON tc.commander_name = c.card_name
LEFT JOIN commander_archetypes ca ON tc.commander_name = ca.commander_name
GROUP BY tc.commander_name, tc.partner_name;

-- Pre-populate some obvious archetypes (unchanged)
INSERT OR IGNORE INTO commander_archetypes VALUES
('Krenko, Mob Boss', 'Kindred', 1.0),
('Krenko, Mob Boss', 'Aggro', 0.9),
('Edgar Markov', 'Kindred', 1.0),
('Edgar Markov', 'Aggro', 0.8),
('Atraxa, Praetors'' Voice', 'Counters', 0.9),
('Atraxa, Praetors'' Voice', 'Value', 0.7),
('The Ur-Dragon', 'Kindred', 1.0),
('The Ur-Dragon', 'Ramp', 0.8),
('Meren of Clan Nel Toth', 'Graveyard', 1.0),
('Meren of Clan Nel Toth', 'Value', 0.8);