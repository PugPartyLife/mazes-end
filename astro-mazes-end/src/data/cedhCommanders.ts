// cEDH and High Power commanders by color combination
import type { CedhCommander, ColorCombination, CommandersByColor } from '../types';

export const cedhCommanders: CommandersByColor<CedhCommander> = {
  'W': [
    { name: 'Heliod, Sun-Crowned', archetype: 'Combo', description: 'Walking Ballista combo with protection package' },
    { name: 'Teshar, Ancestor\'s Apostle', archetype: 'Combo', description: 'Artifact combo with efficient recursion' }
  ],
  'U': [
    { name: 'Urza, Lord High Artificer', archetype: 'Combo', description: 'Dramatic Reversal combo with artifacts' },
    { name: 'Teferi, Temporal Archmage', archetype: 'Control', description: 'Chain Veil combo with counterspells' }
  ],
  'B': [
    { name: 'K\'rrik, Son of Yawgmoth', archetype: 'Storm', description: 'Life-as-mana storm combo deck' },
    { name: 'Tinybones, Trinket Thief', archetype: 'Stax', description: 'Discard-based resource denial' }
  ],
  'R': [
    { name: 'Magda, Brazen Outlaw', archetype: 'Combo', description: 'Dwarf tribal with Clock of Omens' },
    { name: 'Godo, Bandit Warlord', archetype: 'Combo', description: 'Helm of the Host infinite combat' }
  ],
  'G': [
    { name: 'Yisan, the Wanderer Bard', archetype: 'Combo', description: 'Creature toolbox with Craterhoof' },
    { name: 'Selvala, Heart of the Wilds', archetype: 'Combo', description: 'Big creature combo with mana' }
  ],
  'BU': [
    { name: 'Zur the Enchanter', archetype: 'Control', description: 'Ad Nauseam combo with control' },
    { name: 'Doomsday Zur', archetype: 'Combo', description: 'Laboratory Maniac pile combo' }
  ],
  'GU': [
    { name: 'Kinnan, Bonder Prodigy', archetype: 'Combo', description: 'Mana dork combo with Basalt Monolith' },
    { name: 'Thrasios/Tymna', archetype: 'Value', description: 'Card advantage with Flash Hulk' }
  ],
  'RU': [
    { name: 'Malcolm/Kediss', archetype: 'Combo', description: 'Treasure combo with Glint-Horn' },
    { name: 'Kraum/Tymna', archetype: 'Control', description: 'Flying beats with card draw' }
  ],
  'BG': [
    { name: 'The Gitrog Monster', archetype: 'Combo', description: 'Dakmor Salvage infinite combo' },
    { name: 'Chatterfang, Squirrel General', archetype: 'Combo', description: 'Squirrel combo loops' }
  ],
  'RW': [
    { name: 'Winota, Joiner of Forces', archetype: 'Aggro', description: 'Human tribal with Kiki combo' },
    { name: 'Alesha, Who Smiles at Death', archetype: 'Combo', description: 'Master of Cruelties combo' }
  ],
  'GW': [
    { name: 'Selvala, Explorer Returned', archetype: 'Combo', description: 'Umbral Mantle infinite mana' },
    { name: 'Captain Sisay', archetype: 'Toolbox', description: 'Legendary creature toolbox' }
  ],
  'BW': [
    { name: 'Tymna/Ravos', archetype: 'Midrange', description: 'Hatebears with recursion' },
    { name: 'Orah, Skyclave Hierophant', archetype: 'Combo', description: 'Cleric tribal loops' }
  ],
  'BGR': [
    { name: 'Korvold, Fae-Cursed King', archetype: 'Combo', description: 'Food Chain combo engine' },
    { name: 'Prossh, Skyraider of Kher', archetype: 'Combo', description: 'Food Chain infinite tokens' }
  ],
  'BRU': [
    { name: 'Kess, Dissident Mage', archetype: 'Storm', description: 'Consultation Oracle storm' },
    { name: 'Jeleva, Nephalia\'s Scourge', archetype: 'Storm', description: 'High Tide storm combo' }
  ],
  'BGU': [
    { name: 'Tasigur, the Golden Fang', archetype: 'Control', description: 'Seasons Past control' },
    { name: 'Muldrotha, the Gravetide', archetype: 'Value', description: 'Hermit Druid combo value' }
  ],
  'BGW': [
    { name: 'Karador, Ghost Chieftain', archetype: 'Combo', description: 'Boonweaver Giant combo' },
    { name: 'Nethroi, Apex of Death', archetype: 'Combo', description: 'Devoted Druid reanimator' }
  ],
  'GRW': [
    { name: 'Marath, Will of the Wild', archetype: 'Combo', description: 'Ivy Lane Denizen combo' },
    { name: 'Samut, Voice of Dissent', archetype: 'Combo', description: 'Kiki-Jiki haste enabler' }
  ],
  'RUW': [
    { name: 'Elsha of the Infinite', archetype: 'Storm', description: 'Top deck storm with Sensei\'s Top' },
    { name: 'Kykar, Wind\'s Fury', archetype: 'Storm', description: 'Jeskai Ascendancy storm' }
  ],
  'GUW': [
    { name: 'Chulane, Teller of Tales', archetype: 'Combo', description: 'Aluren combo with creatures' },
    { name: 'Derevi, Empyrial Tactician', archetype: 'Stax', description: 'Winter Orb stax' }
  ],
  'BUW': [
    { name: 'Aminatou, the Fateshifter', archetype: 'Combo', description: 'Felidar Guardian combo' },
    { name: 'Zur the Enchanter', archetype: 'Control', description: 'Necropotence control' }
  ],
  'GRU': [
    { name: 'Maelstrom Wanderer', archetype: 'Combo', description: 'Kiki-Jiki cascade combo' },
    { name: 'Animar, Soul of Elements', archetype: 'Combo', description: 'Ancestral Statue combo' }
  ],
  'BRW': [
    { name: 'Edgar Markov', archetype: 'Aggro', description: 'Vampire tribal with Ad Nauseam' },
    { name: 'Alesha, Who Smiles at Death', archetype: 'Combo', description: 'Buried Alive reanimator' }
  ],
  'BGRW': [
    { name: 'Yidris, Maelstrom Wielder', archetype: 'Storm', description: 'Cascade storm with wheels' },
    { name: 'Saskia the Unyielding', archetype: 'Aggro', description: 'Aggro with combo backup' }
  ],
  'BGRU': [
    { name: 'Thrasios/Tymna', archetype: 'Value', description: 'Flash Hulk with card advantage' },
    { name: 'Yidris, Maelstrom Wielder', archetype: 'Storm', description: 'Doomsday cascade storm' }
  ],
  'GRUW': [
    { name: 'Thrasios/Bruse Tarl', archetype: 'Value', description: 'Flash Hulk with combat' },
    { name: 'Kynaios and Tiro', archetype: 'Control', description: 'Consultation Oracle control' }
  ],
  'BRUW': [
    { name: 'Breya, Etherium Shaper', archetype: 'Combo', description: 'KCI combo with artifacts' },
    { name: 'Tymna/Kraum', archetype: 'Control', description: 'Ad Nauseam control with beats' }
  ],
  'BGUW': [
    { name: 'Atraxa, Praetors\' Voice', archetype: 'Superfriends', description: 'Planeswalker control' },
    { name: 'Thrasios/Tymna', archetype: 'Value', description: 'Ultimate value with combo' }
  ],
  'BGRUW': [
    { name: 'Najeela, the Blade-Blossom', archetype: 'Combo', description: 'Infinite combat with Nature\'s Will' },
    { name: 'Golos, Tireless Pilgrim', archetype: 'Combo', description: 'Intet combo with ramp' }
  ]
};