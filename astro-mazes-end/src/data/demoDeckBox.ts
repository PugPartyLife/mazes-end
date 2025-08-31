// src/data/demoDeckBox.ts
import type { DeckBoxProps } from '../components/DeckBox'

export const demoDeckBoxData: DeckBoxProps = {
  name: "(Kraum/Tymna)",
  tournamentName: '#RoadToLisbon — cEDH European Championship',
  colors: ['W', 'U', 'B', 'R'],
  player: 'Ignasi Ibáñez Martí',
  wins: 5,
  losses: 1,
  draws: 4,
  standing: '1st',
  cardCount: 100, // 98 main + 2 commanders
  commanders: [
    {
      object: 'card',
      id: '557fcd17-6cb3-414a-b2b1-ea9ae32e5aec',
      oracle_id: '5f694f2d-9349-4988-b2b4-788136d4293e',
      multiverse_ids: [420651],
      tcgplayer_id: 123979,
      cardmarket_id: 293351,
      name: "Kraum, Ludevic's Opus",
      lang: 'en',
      released_at: '2016-11-11',
      uri: 'https://api.scryfall.com/cards/557fcd17-6cb3-414a-b2b1-ea9ae32e5aec',
      scryfall_uri:
        'https://scryfall.com/card/c16/34/kraum-ludevics-opus?utm_source=api',
      layout: 'normal',
      highres_image: true,
      image_status: 'highres_scan',
      image_uris: {
        small:
          'https://cards.scryfall.io/small/front/5/5/557fcd17-6cb3-414a-b2b1-ea9ae32e5aec.jpg?1644853032',
        normal:
          'https://cards.scryfall.io/normal/front/5/5/557fcd17-6cb3-414a-b2b1-ea9ae32e5aec.jpg?1644853032',
        large:
          'https://cards.scryfall.io/large/front/5/5/557fcd17-6cb3-414a-b2b1-ea9ae32e5aec.jpg?1644853032',
        png: 'https://cards.scryfall.io/png/front/5/5/557fcd17-6cb3-414a-b2b1-ea9ae32e5aec.png?1644853032',
        art_crop:
          'https://cards.scryfall.io/art_crop/front/5/5/557fcd17-6cb3-414a-b2b1-ea9ae32e5aec.jpg?1644853032',
        border_crop:
          'https://cards.scryfall.io/border_crop/front/5/5/557fcd17-6cb3-414a-b2b1-ea9ae32e5aec.jpg?1644853032'
      },
      mana_cost: '{3}{U}{R}',
      cmc: 5.0,
      type_line: 'Legendary Creature — Zombie Horror',
      oracle_text:
        'Flying, haste\nWhenever an opponent casts their second spell each turn, draw a card.\nPartner (You can have two commanders if both have partner.)',
      power: '4',
      toughness: '4',
      colors: ['R', 'U'],
      color_identity: ['R', 'U'],
      keywords: ['Flying', 'Haste', 'Partner'],
      legalities: {
        standard: 'not_legal',
        future: 'not_legal',
        historic: 'legal',
        timeless: 'legal',
        gladiator: 'legal',
        pioneer: 'not_legal',
        modern: 'not_legal',
        legacy: 'legal',
        pauper: 'not_legal',
        vintage: 'legal',
        penny: 'not_legal',
        commander: 'legal',
        oathbreaker: 'legal',
        standardbrawl: 'not_legal',
        brawl: 'legal',
        alchemy: 'not_legal',
        paupercommander: 'not_legal',
        duel: 'legal',
        oldschool: 'not_legal',
        premodern: 'not_legal',
        predh: 'not_legal'
      },
      games: ['paper'],
      reserved: false,
      game_changer: false,
      foil: true,
      nonfoil: false,
      finishes: ['foil'],
      oversized: false,
      promo: false,
      reprint: false,
      variation: false,
      set_id: '3e0d713a-b5cb-4287-81b9-a57d4dcaf415',
      set: 'c16',
      set_name: 'Commander 2016',
      set_type: 'commander',
      set_uri:
        'https://api.scryfall.com/sets/3e0d713a-b5cb-4287-81b9-a57d4dcaf415',
      set_search_uri:
        'https://api.scryfall.com/cards/search?order=set&q=e%3Ac16&unique=prints',
      scryfall_set_uri: 'https://scryfall.com/sets/c16?utm_source=api',
      rulings_uri:
        'https://api.scryfall.com/cards/557fcd17-6cb3-414a-b2b1-ea9ae32e5aec/rulings',
      prints_search_uri:
        'https://api.scryfall.com/cards/search?order=released&q=oracleid%3A5f694f2d-9349-4988-b2b4-788136d4293e&unique=prints',
      collector_number: '34',
      digital: false,
      rarity: 'rare',
      flavor_text: '"It lives . . . IT LIVES!"\n—Ludevic, necro-alchemist',
      card_back_id: '0aeebaf5-8c7d-4636-9e82-8c27447861f7',
      artist: 'Aaron Miller',
      artist_ids: ['fc021f3d-773a-4706-bbe7-f602324f511f'],
      illustration_id: '05f3bfcf-1762-47fb-ac18-6aba870e49d1',
      border_color: 'black',
      frame: '2015',
      security_stamp: 'oval',
      full_art: false,
      textless: false,
      booster: false,
      story_spotlight: false,
      edhrec_rank: 6442,
      prices: {
        usd: null,
        usd_foil: '5.06',
        usd_etched: null,
        eur: null,
        eur_foil: '6.47',
        tix: null
      },
      related_uris: {
        gatherer:
          'https://gatherer.wizards.com/Pages/Card/Details.aspx?multiverseid=420651&printed=false',
        tcgplayer_infinite_articles:
          'https://partner.tcgplayer.com/c/4931599/1830156/21018?subId1=api&trafcat=tcgplayer.com%2Fsearch%2Farticles&u=https%3A%2F%2Fwww.tcgplayer.com%2Fsearch%2Farticles%3FproductLineName%3Dmagic%26q%3DKraum%252C%2BLudevic%2527s%2BOpus',
        tcgplayer_infinite_decks:
          'https://partner.tcgplayer.com/c/4931599/1830156/21018?subId1=api&trafcat=tcgplayer.com%2Fsearch%2Fdecks&u=https%3A%2F%2Fwww.tcgplayer.com%2Fsearch%2Fdecks%3FproductLineName%3Dmagic%26q%3DKraum%252C%2BLudevic%2527s%2BOpus',
        edhrec: 'https://edhrec.com/route/?cc=Kraum%2C+Ludevic%27s+Opus'
      },
      purchase_uris: {
        tcgplayer:
          'https://partner.tcgplayer.com/c/4931599/1830156/21018?subId1=api&u=https%3A%2F%2Fwww.tcgplayer.com%2Fproduct%2F123979%3Fpage%3D1',
        cardmarket:
          'https://www.cardmarket.com/en/Magic/Products?idProduct=293351&referrer=scryfall&utm_campaign=card_prices&utm_medium=text&utm_source=scryfall',
        cardhoarder:
          'https://www.cardhoarder.com/cards?affiliate_id=scryfall&data%5Bsearch%5D=Kraum%2C+Ludevic%27s+Opus&ref=card-profile&utm_campaign=affiliate&utm_medium=card&utm_source=scryfall'
      }
    },
    {
      object: 'card',
      id: 'bc7cbe9b-324e-42b8-94e2-36e91cb32163',
      oracle_id: 'd15642e4-e61c-4d29-af48-de837991245e',
      multiverse_ids: [420665],
      tcgplayer_id: 124011,
      cardmarket_id: 293501,
      name: 'Tymna the Weaver',
      lang: 'en',
      released_at: '2016-11-11',
      uri: 'https://api.scryfall.com/cards/bc7cbe9b-324e-42b8-94e2-36e91cb32163',
      scryfall_uri:
        'https://scryfall.com/card/c16/48/tymna-the-weaver?utm_source=api',
      layout: 'normal',
      highres_image: true,
      image_status: 'highres_scan',
      image_uris: {
        small:
          'https://cards.scryfall.io/small/front/b/c/bc7cbe9b-324e-42b8-94e2-36e91cb32163.jpg?1644853048',
        normal:
          'https://cards.scryfall.io/normal/front/b/c/bc7cbe9b-324e-42b8-94e2-36e91cb32163.jpg?1644853048',
        large:
          'https://cards.scryfall.io/large/front/b/c/bc7cbe9b-324e-42b8-94e2-36e91cb32163.jpg?1644853048',
        png: 'https://cards.scryfall.io/png/front/b/c/bc7cbe9b-324e-42b8-94e2-36e91cb32163.png?1644853048',
        art_crop:
          'https://cards.scryfall.io/art_crop/front/b/c/bc7cbe9b-324e-42b8-94e2-36e91cb32163.jpg?1644853048',
        border_crop:
          'https://cards.scryfall.io/border_crop/front/b/c/bc7cbe9b-324e-42b8-94e2-36e91cb32163.jpg?1644853048'
      },
      mana_cost: '{1}{W}{B}',
      cmc: 3.0,
      type_line: 'Legendary Creature — Human Cleric',
      oracle_text:
        'Lifelink\nAt the beginning of each of your postcombat main phases, you may pay X life, where X is the number of opponents that were dealt combat damage this turn. If you do, draw X cards.\nPartner (You can have two commanders if both have partner.)',
      power: '2',
      toughness: '2',
      colors: ['B', 'W'],
      color_identity: ['B', 'W'],
      keywords: ['Lifelink', 'Partner'],
      legalities: {
        standard: 'not_legal',
        future: 'not_legal',
        historic: 'legal',
        timeless: 'legal',
        gladiator: 'legal',
        pioneer: 'not_legal',
        modern: 'not_legal',
        legacy: 'legal',
        pauper: 'not_legal',
        vintage: 'legal',
        penny: 'not_legal',
        commander: 'legal',
        oathbreaker: 'legal',
        standardbrawl: 'not_legal',
        brawl: 'legal',
        alchemy: 'not_legal',
        paupercommander: 'not_legal',
        duel: 'legal',
        oldschool: 'not_legal',
        premodern: 'not_legal',
        predh: 'not_legal'
      },
      games: ['paper'],
      reserved: false,
      game_changer: false,
      foil: true,
      nonfoil: false,
      finishes: ['foil'],
      oversized: false,
      promo: false,
      reprint: false,
      variation: false,
      set_id: '3e0d713a-b5cb-4287-81b9-a57d4dcaf415',
      set: 'c16',
      set_name: 'Commander 2016',
      set_type: 'commander',
      set_uri:
        'https://api.scryfall.com/sets/3e0d713a-b5cb-4287-81b9-a57d4dcaf415',
      set_search_uri:
        'https://api.scryfall.com/cards/search?order=set&q=e%3Ac16&unique=prints',
      scryfall_set_uri: 'https://scryfall.com/sets/c16?utm_source=api',
      rulings_uri:
        'https://api.scryfall.com/cards/bc7cbe9b-324e-42b8-94e2-36e91cb32163/rulings',
      prints_search_uri:
        'https://api.scryfall.com/cards/search?order=released&q=oracleid%3Ad15642e4-e61c-4d29-af48-de837991245e&unique=prints',
      collector_number: '48',
      digital: false,
      rarity: 'rare',
      card_back_id: '0aeebaf5-8c7d-4636-9e82-8c27447861f7',
      artist: 'Winona Nelson',
      artist_ids: ['e45fe8d3-75d6-42c9-a2df-e945ad81ea27'],
      illustration_id: '7b035cde-be5a-460d-bf4e-b61ea6c1f770',
      border_color: 'black',
      frame: '2015',
      security_stamp: 'oval',
      full_art: false,
      textless: false,
      booster: false,
      story_spotlight: false,
      edhrec_rank: 4742,
      prices: {
        usd: null,
        usd_foil: '40.59',
        usd_etched: null,
        eur: null,
        eur_foil: '28.41',
        tix: null
      },
      related_uris: {
        gatherer:
          'https://gatherer.wizards.com/Pages/Card/Details.aspx?multiverseid=420665&printed=false',
        tcgplayer_infinite_articles:
          'https://partner.tcgplayer.com/c/4931599/1830156/21018?subId1=api&trafcat=tcgplayer.com%2Fsearch%2Farticles&u=https%3A%2F%2Fwww.tcgplayer.com%2Fsearch%2Farticles%3FproductLineName%3Dmagic%26q%3DTymna%2Bthe%2BWeaver',
        tcgplayer_infinite_decks:
          'https://partner.tcgplayer.com/c/4931599/1830156/21018?subId1=api&trafcat=tcgplayer.com%2Fsearch%2Fdecks&u=https%3A%2F%2Fwww.tcgplayer.com%2Fsearch%2Fdecks%3FproductLineName%3Dmagic%26q%3DTymna%2Bthe%2BWeaver',
        edhrec: 'https://edhrec.com/route/?cc=Tymna+the+Weaver'
      },
      purchase_uris: {
        tcgplayer:
          'https://partner.tcgplayer.com/c/4931599/1830156/21018?subId1=api&u=https%3A%2F%2Fwww.tcgplayer.com%2Fproduct%2F124011%3Fpage%3D1',
        cardmarket:
          'https://www.cardmarket.com/en/Magic/Products?idProduct=293501&referrer=scryfall&utm_campaign=card_prices&utm_medium=text&utm_source=scryfall',
        cardhoarder:
          'https://www.cardhoarder.com/cards?affiliate_id=scryfall&data%5Bsearch%5D=Tymna+the+Weaver&ref=card-profile&utm_campaign=affiliate&utm_medium=card&utm_source=scryfall'
      }
    }
  ]
}
