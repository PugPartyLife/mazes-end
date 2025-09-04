#!/usr/bin/env python3
"""
Combo Graph Server
Persistent process that maintains the combo graph in memory and handles queries via JSON-RPC over stdio
"""

import sys
import json
import logging
from typing import List, Dict, Optional
from combo_graph_analyzer import ComboGraphAnalyzer

# Configure logging to stderr so it doesn't interfere with stdout communication
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    stream=sys.stderr
)

class ComboGraphServer:
    """JSON-RPC server wrapper for ComboGraphAnalyzer."""
    
    def __init__(self, data_file: str):
        self.analyzer = ComboGraphAnalyzer()
        self.analyzer.load_from_json(data_file)
        self.logger = logging.getLogger(__name__)
        self.logger.info(f"Graph server initialized with {len(self.analyzer.combo_data)} combos")
        
    def handle_request(self, request: Dict) -> Dict:
        """Handle a JSON-RPC request and return a response."""
        request_id = request.get('id', 0)
        method = request.get('method')
        params = request.get('params', {})
        
        try:
            # Route to appropriate method
            if method == 'getComboById':
                result = self._get_combo_by_id(params.get('comboId'))
            elif method == 'getDistance1Combos':
                result = self._get_distance_1_combos(params.get('comboId'))
            elif method == 'getDistance2Combos':
                result = self._get_distance_2_combos(params.get('comboId'))
            elif method == 'findComboChainsFromCombo':
                result = self._find_combo_chains(
                    params.get('comboId'),
                    params.get('maxDepth', 3)
                )
            elif method == 'searchCombosByCard':
                result = self._search_combos_by_card(params.get('cardName'))
            elif method == 'getCardImportance':
                result = self._get_card_importance(params.get('cardName'))
            elif method == 'findComboPackages':
                result = self._find_combo_packages(params.get('minSharedCards', 2))
            elif method == 'getGraphStatistics':
                result = self.analyzer.get_graph_statistics()
            elif method == 'getCombosByColorIdentity':
                result = self._get_combos_by_color_identity(params.get('colorIdentity'))
            elif method == 'getRelatedCombos':
                result = self._get_related_combos(
                    params.get('comboId'),
                    params.get('limit', 10)
                )
            elif method == 'getComboPackageById':
                result = self._get_combo_package_by_id(
                    params.get('comboIds', []),
                    params.get('minSharedCards', 2)
                )
            else:
                raise ValueError(f"Unknown method: {method}")
                
            return {
                'jsonrpc': '2.0',
                'id': request_id,
                'result': result
            }
            
        except Exception as e:
            self.logger.error(f"Error handling request: {e}", exc_info=True)
            return {
                'jsonrpc': '2.0',
                'id': request_id,
                'error': {
                    'code': -32603,
                    'message': str(e)
                }
            }
    
    def _get_combo_by_id(self, combo_id: str) -> Optional[Dict]:
        """Get a single combo by ID with enriched data."""
        if combo_id not in self.analyzer.combo_data:
            return None
            
        combo = self.analyzer.combo_data[combo_id].copy()
        combo['id'] = combo_id
        
        # Add card details if available
        combo['cards'] = []
        for card_name in combo.get('card_names', []):
            card_info = self.analyzer.card_data.get(card_name, {})
            combo['cards'].append({
                'name': card_name,
                'combos_count': card_info.get('combos_count', 0)
            })
        
        return combo
    
    def _get_distance_1_combos(self, combo_id: str) -> Dict:
        """Get distance-1 combos with pagination support."""
        d1_combos = self.analyzer.get_distance_1_combos(combo_id)
        
        # Convert to list format for easier consumption
        result = {
            'total': len(d1_combos),
            'combos': []
        }
        
        for other_id, data in d1_combos.items():
            combo_info = {
                'id': other_id,
                'shared_cards': data['shared_cards'],
                'shared_cards_count': data['shared_cards_count'],
                'color_identity': data['combo_data'].get('color_identity', ''),
                'produces': data['combo_data'].get('produces', [])
            }
            result['combos'].append(combo_info)
        
        # Sort by shared cards count
        result['combos'].sort(key=lambda x: x['shared_cards_count'], reverse=True)
        
        return result
    
    def _get_distance_2_combos(self, combo_id: str) -> Dict:
        """Get distance-2 combos."""
        d2_combos = self.analyzer.get_distance_2_combos(combo_id)
        
        result = {
            'total': len(d2_combos),
            'combos': []
        }
        
        for other_id, data in d2_combos.items():
            combo_info = {
                'id': other_id,
                'paths': data['paths'],
                'color_identity': data['combo_data'].get('color_identity', ''),
                'produces': data['combo_data'].get('produces', [])
            }
            result['combos'].append(combo_info)
        
        return result
    
    def _find_combo_chains(self, combo_id: str, max_depth: int) -> List[List[str]]:
        """Find combo chains starting from a specific combo."""
        chains = self.analyzer.find_combo_chains(combo_id, max_depth)
        
        # Enrich chain data
        enriched_chains = []
        for chain in chains:
            chain_data = []
            for cid in chain:
                combo = self.analyzer.combo_data.get(cid, {})
                chain_data.append({
                    'id': cid,
                    'produces': combo.get('produces', []),
                    'prerequisites': combo.get('prerequisites', [])
                })
            enriched_chains.append(chain_data)
        
        return enriched_chains
    
    def _search_combos_by_card(self, card_name: str) -> Dict:
        """Search for combos containing a specific card."""
        combo_ids = self.analyzer.card_to_combos.get(card_name, [])
        
        result = {
            'card_name': card_name,
            'total_combos': len(combo_ids),
            'combos': []
        }
        
        # Get details for each combo
        for combo_id in combo_ids[:50]:  # Limit to first 50
            combo = self.analyzer.combo_data.get(combo_id, {})
            result['combos'].append({
                'id': combo_id,
                'color_identity': combo.get('color_identity', ''),
                'produces': combo.get('produces', []),
                'card_names': combo.get('card_names', [])
            })
        
        return result
    
    def _get_card_importance(self, card_name: Optional[str] = None) -> Dict:
        """Get importance metrics for a specific card or top cards."""
        importance_data = self.analyzer.analyze_card_importance(sample_size=1000)
        
        if card_name:
            return importance_data.get(card_name, {
                'combos_count': 0,
                'degree_centrality': 0,
                'betweenness_centrality': 0,
                'eigenvector_centrality': 0,
                'combo_ids': []
            })
        
        # Return top 20 most important cards
        sorted_cards = sorted(
            importance_data.items(),
            key=lambda x: x[1]['combos_count'],
            reverse=True
        )[:20]
        
        return {
            'top_cards': [
                {
                    'name': card,
                    **metrics
                }
                for card, metrics in sorted_cards
            ]
        }
    
    def _find_combo_packages(self, min_shared_cards: int) -> List[Dict]:
        """Find combo packages with enhanced data."""
        packages = self.analyzer.find_combo_packages(min_shared_cards)
        
        # Limit to top 50 packages
        return packages[:50]
    
    def _get_combos_by_color_identity(self, color_identity: str) -> Dict:
        """Get all combos of a specific color identity."""
        combos = []
        
        for combo_id, combo_data in self.analyzer.combo_data.items():
            if combo_data.get('color_identity', '') == color_identity:
                combos.append({
                    'id': combo_id,
                    'produces': combo_data.get('produces', []),
                    'card_count': len(combo_data.get('card_names', []))
                })
        
        return {
            'color_identity': color_identity,
            'total': len(combos),
            'combos': combos[:100]  # Limit response size
        }
    
    def _get_related_combos(self, combo_id: str, limit: int = 10) -> Dict:
        """Get combos most related to the given combo."""
        d1_combos = self.analyzer.get_distance_1_combos(combo_id)
        
        # Sort by shared cards and return top N
        sorted_combos = sorted(
            d1_combos.items(),
            key=lambda x: x[1]['shared_cards_count'],
            reverse=True
        )[:limit]
        
        return {
            'combo_id': combo_id,
            'related_combos': [
                {
                    'id': cid,
                    'shared_cards': data['shared_cards'],
                    'shared_cards_count': data['shared_cards_count']
                }
                for cid, data in sorted_combos
            ]
        }
    
    def _get_combo_package_by_id(self, combo_ids: List[str], min_shared_cards: int = 2) -> Dict:
        """Get package information for a specific set of combos."""
        # Find all cards used by these combos
        all_cards = set()
        core_cards = None
        
        for combo_id in combo_ids:
            if combo_id in self.analyzer.combo_data:
                combo_cards = set(self.analyzer.combo_data[combo_id]['card_names'])
                all_cards.update(combo_cards)
                
                if core_cards is None:
                    core_cards = combo_cards
                else:
                    core_cards &= combo_cards
        
        return {
            'combo_ids': combo_ids,
            'combo_count': len(combo_ids),
            'total_unique_cards': len(all_cards),
            'core_cards': list(core_cards) if core_cards else [],
            'all_cards': list(all_cards)
        }
    
    def run(self):
        """Main server loop - read JSON-RPC requests from stdin, write responses to stdout."""
        self.logger.info("Combo graph server started. Waiting for requests...")
        
        while True:
            try:
                line = sys.stdin.readline()
                if not line:
                    break
                    
                # Parse request
                request = json.loads(line.strip())
                
                # Handle request
                response = self.handle_request(request)
                
                # Send response
                sys.stdout.write(json.dumps(response) + '\n')
                sys.stdout.flush()
                
            except json.JSONDecodeError as e:
                error_response = {
                    'jsonrpc': '2.0',
                    'error': {
                        'code': -32700,
                        'message': f'Parse error: {str(e)}'
                    }
                }
                sys.stdout.write(json.dumps(error_response) + '\n')
                sys.stdout.flush()
            except KeyboardInterrupt:
                break
            except Exception as e:
                self.logger.error(f"Unexpected error: {e}", exc_info=True)
        
        self.logger.info("Combo graph server shutting down.")


if __name__ == "__main__":
    # Get data file from command line or use default
    data_file = sys.argv[1] if len(sys.argv) > 1 else "commander_spellbook_data.json"
    
    # Create and run server
    server = ComboGraphServer(data_file)
    server.run()