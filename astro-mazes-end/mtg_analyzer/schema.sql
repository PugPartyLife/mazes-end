-- MTG Tournament Data Schema - Simplified Card Types
-- Focus: Clean tournament storage -> TopCommanders/TopCards via decklist parsing

PRAGMA foreign_keys = ON;
PRAGMA journal_mode = WAL;

-- Simple card types table
CREATE TABLE IF NOT EXISTS card_types (
    type_name TEXT PRIMARY KEY,
    type_plural TEXT NOT NULL,
    description TEXT -- Rules description if available
);

-- Pre-populate with basic card types
INSERT OR IGNORE INTO card_types (type_name, type_plural, description) VALUES
('Commander', 'Commanders', 'Legendary creatures that can be commanders'),
('Battle', 'Battles', NULL),
('Planeswalker', 'Planeswalkers', NULL),
('Creature', 'Creatures', NULL),
('Sorcery', 'Sorceries', NULL),
('Instant', 'Instants', NULL),
('Artifact', 'Artifacts', NULL),
('Enchantment', 'Enchantments', NULL),
('Land', 'Lands', NULL),
('Token', 'Tokens', 'Tokens created by other cards'),
('Unknown', 'Unknown', NULL);

CREATE INDEX IF NOT EXISTS idx_card_types_name ON card_types(type_name);

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

-- Enhanced cards table - simplified card type system
CREATE TABLE IF NOT EXISTS cards (
    card_name TEXT PRIMARY KEY,
    scryfall_id TEXT UNIQUE,
    
    -- Core card data
    mana_cost TEXT,
    cmc INTEGER,
    type_line TEXT,
    oracle_text TEXT,
    power TEXT,
    toughness TEXT,
    
    -- Color information (JSON)
    colors TEXT,
    color_identity TEXT,
    
    -- Multi-face card support
    layout TEXT,
    card_faces TEXT,
    
    -- Images (JSON)
    image_uris TEXT,
    
    -- Additional metadata
    component TEXT,
    rarity TEXT,
    flavor_text TEXT,
    artist TEXT,

    -- Custom card rating metrics (not price!)
    salt REAL,              -- Salt score (0-4 scale like EDHREC)
    card_power REAL,        -- Card power level rating 
    versatility REAL,       -- How flexible/versatile the card is
    popularity REAL,        -- Popularity rating/score
    price REAL,             -- General price level (0-5 scale)
    
    -- Set information  
    set_code TEXT,
    set_name TEXT,
    collector_number TEXT,
    
    -- Scryfall URIs
    scryfall_uri TEXT,
    uri TEXT,
    rulings_uri TEXT,
    prints_search_uri TEXT,
    
    -- Simple card type reference
    card_type TEXT DEFAULT 'Unknown',
    
    -- Price and metadata (this is the actual USD price)
    price_usd REAL,         -- Real-world cost in USD
    price_updated DATETIME,
    first_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (card_type) REFERENCES card_types(type_name)
);

-- Enhanced indexes for cards table
CREATE INDEX IF NOT EXISTS idx_cards_scryfall_id ON cards(scryfall_id);
CREATE INDEX IF NOT EXISTS idx_cards_type_line ON cards(type_line);
CREATE INDEX IF NOT EXISTS idx_cards_card_type ON cards(card_type);
CREATE INDEX IF NOT EXISTS idx_cards_colors ON cards(colors);
CREATE INDEX IF NOT EXISTS idx_cards_cmc ON cards(cmc);
CREATE INDEX IF NOT EXISTS idx_cards_layout ON cards(layout);
CREATE INDEX IF NOT EXISTS idx_cards_rarity ON cards(rarity);
CREATE INDEX IF NOT EXISTS idx_cards_set_code ON cards(set_code);
CREATE INDEX IF NOT EXISTS idx_cards_artist ON cards(artist);

-- Junction table for deck compositions
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

-- Survey responses for commander recommendations
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

-- Simple archetype tags for commanders
CREATE TABLE IF NOT EXISTS commander_archetypes (
    commander_name TEXT,
    archetype_tag TEXT,
    confidence_score REAL DEFAULT 1.0,
    
    PRIMARY KEY (commander_name, archetype_tag)
);

-- View for TopCommanders analysis
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
  AND has_decklist = 1
GROUP BY commander_1, commander_2
HAVING total_decks >= 5;

-- View for TopCards analysis with simplified card type info
CREATE VIEW IF NOT EXISTS top_cards_for_commanders AS
SELECT 
    d.commander_1 as commander_name,
    dc.card_name,
    c.type_line,
    c.cmc,
    c.colors,
    c.rarity,
    c.price_usd,
    
    -- Card type information
    c.card_type,
    ct.type_plural as card_type_plural,
    
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
JOIN card_types ct ON c.card_type = ct.type_name
WHERE d.commander_1 IS NOT NULL 
  AND d.has_decklist = 1
  AND dc.deck_section != 'commander'
GROUP BY d.commander_1, dc.card_name, dc.deck_section
HAVING total_inclusions >= 3
ORDER BY d.commander_1, inclusion_rate DESC;

-- Commander recommendations view
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
    c.card_type as commander_card_type,
    
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
        LIMIT 10
    )) as estimated_deck_price
    
FROM top_commanders tc
LEFT JOIN cards c ON tc.commander_name = c.card_name
LEFT JOIN commander_archetypes ca ON tc.commander_name = ca.commander_name
GROUP BY tc.commander_name, tc.partner_name;

-- Pre-populate some obvious archetypes
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