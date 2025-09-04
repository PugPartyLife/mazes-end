#!/usr/bin/env python3
"""
Combo Graph Analyzer
Reads combo data from JSON and performs graph analysis
"""

import json
import networkx as nx
from typing import List, Dict, Set, Optional, Tuple
import logging
from collections import defaultdict
from pathlib import Path


class ComboGraphAnalyzer:
    """Analyzes combo relationships using NetworkX graph."""
    
    def __init__(self):
        # Create a bipartite graph
        self.graph = nx.Graph()
        
        # Keep track of node types
        self.combo_nodes = set()
        self.card_nodes = set()
        
        # Store data from JSON
        self.combo_data = {}
        self.card_data = {}
        self.card_to_combos = {}
        
        self.logger = logging.getLogger(__name__)
        
    def load_from_json(self, filename: str) -> None:
        """Load combo data from JSON file."""
        self.logger.info(f"Loading data from {filename}...")
        
        with open(filename, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        # Store the data
        self.combo_data = data.get('combos', {})
        self.card_data = data.get('cards', {})
        self.card_to_combos = data.get('card_to_combos', {})
        
        # Clean up empty strings in produces/prerequisites/steps
        for combo_id, combo in self.combo_data.items():
            # Clean produces
            if 'produces' in combo:
                combo['produces'] = [p for p in combo['produces'] if p and p.strip()]
            # Clean prerequisites  
            if 'prerequisites' in combo:
                combo['prerequisites'] = [p for p in combo['prerequisites'] if p and p.strip()]
            # Clean steps
            if 'steps' in combo:
                combo['steps'] = [s for s in combo['steps'] if s and s.strip()]
        
        # Build the graph
        self._build_graph()
        
        # Log statistics
        metadata = data.get('metadata', {})
        self.logger.info(f"Loaded {metadata.get('total_combos', 0)} combos from {metadata.get('fetch_date', 'unknown date')}")
        self.logger.info(f"Graph has {len(self.combo_nodes)} combo nodes and {len(self.card_nodes)} card nodes")
    
    def _build_graph(self) -> None:
        """Build the graph from loaded data."""
        for combo_id, combo in self.combo_data.items():
            # Add combo node
            combo_node = f"combo_{combo_id}"
            self.graph.add_node(
                combo_node, 
                node_type='combo',
                combo_id=combo_id,
                color_identity=combo.get('color_identity', ''),
                produces=combo.get('produces', [])
            )
            self.combo_nodes.add(combo_node)
            
            # Add card nodes and edges
            for card_name in combo.get('card_names', []):
                card_node = f"card_{card_name}"
                
                # Add card node if it doesn't exist
                if card_node not in self.graph:
                    card_info = self.card_data.get(card_name, {})
                    self.graph.add_node(
                        card_node,
                        node_type='card',
                        card_name=card_name,
                        combos_count=card_info.get('combos_count', 0)
                    )
                    self.card_nodes.add(card_node)
                
                # Add edge between combo and card
                self.graph.add_edge(combo_node, card_node)
    
    def get_distance_1_combos(self, combo_id: str) -> Dict[str, Dict]:
        """Get all combos that share at least one card with the target combo."""
        combo_node = f"combo_{combo_id}"
        if combo_node not in self.graph:
            return {}
        
        distance_1 = {}
        
        # Get all cards in this combo
        card_neighbors = [
            n for n in self.graph.neighbors(combo_node)
            if self.graph.nodes[n]['node_type'] == 'card'
        ]
        
        # For each card, find other combos that use it
        for card_node in card_neighbors:
            card_name = self.graph.nodes[card_node]['card_name']
            
            # Get all combos that use this card
            combo_neighbors = [
                n for n in self.graph.neighbors(card_node)
                if self.graph.nodes[n]['node_type'] == 'combo'
            ]
            
            for other_combo_node in combo_neighbors:
                other_combo_id = self.graph.nodes[other_combo_node]['combo_id']
                
                # Skip self
                if other_combo_id == combo_id:
                    continue
                
                # Add to distance 1 combos
                if other_combo_id not in distance_1:
                    distance_1[other_combo_id] = {
                        'shared_cards': set(),
                        'combo_data': self.combo_data.get(other_combo_id, {})
                    }
                
                distance_1[other_combo_id]['shared_cards'].add(card_name)
        
        # Convert sets to lists for JSON serialization
        for combo_id, data in distance_1.items():
            data['shared_cards'] = list(data['shared_cards'])
            data['shared_cards_count'] = len(data['shared_cards'])
        
        return distance_1
    
    def get_distance_2_combos(self, combo_id: str) -> Dict[str, Dict]:
        """Get all combos at distance 2 (connected through intermediate combos)."""
        # First get distance 1 combos
        distance_1 = self.get_distance_1_combos(combo_id)
        distance_1_ids = set(distance_1.keys())
        
        distance_2 = {}
        
        # For each distance 1 combo, get its distance 1 combos
        for d1_combo_id in distance_1_ids:
            d1_neighbors = self.get_distance_1_combos(d1_combo_id)
            
            for d2_combo_id, d2_data in d1_neighbors.items():
                # Skip if it's the original combo or already at distance 1
                if d2_combo_id == combo_id or d2_combo_id in distance_1_ids:
                    continue
                
                # Add to distance 2 combos
                if d2_combo_id not in distance_2:
                    distance_2[d2_combo_id] = {
                        'paths': [],
                        'combo_data': self.combo_data.get(d2_combo_id, {})
                    }
                
                # Record the path
                path = {
                    'via_combo_id': d1_combo_id,
                    'via_combo_produces': self.combo_data.get(d1_combo_id, {}).get('produces', []),
                    'shared_with_original': distance_1[d1_combo_id]['shared_cards'],
                    'shared_with_via': d2_data['shared_cards']
                }
                distance_2[d2_combo_id]['paths'].append(path)
        
        return distance_2
    
    def find_combo_chains(self, start_combo_id: str, max_depth: int = 3) -> List[List[str]]:
        """Find chains where one combo's output can enable another."""
        chains = []
        
        def find_chains_recursive(current_id: str, current_chain: List[str], depth: int):
            if depth >= max_depth:
                return
            
            current_produces = set(self.combo_data.get(current_id, {}).get('produces', []))
            
            # Look for combos that could be enabled
            for other_id, other_data in self.combo_data.items():
                if other_id == current_id or other_id in current_chain:
                    continue
                
                other_prereqs = set(other_data.get('prerequisites', []))
                
                # Check for overlap between produces and prerequisites
                if current_produces & other_prereqs:
                    new_chain = current_chain + [other_id]
                    chains.append(new_chain)
                    
                    # Continue searching
                    find_chains_recursive(other_id, new_chain, depth + 1)
        
        # Start the search
        find_chains_recursive(start_combo_id, [start_combo_id], 0)
        
        return chains
    
    def find_combo_packages(self, min_shared_cards: int = 2) -> List[Dict]:
        """Find groups of combos that share multiple cards (combo packages)."""
        self.logger.info(f"Finding combo packages with {min_shared_cards}+ shared cards...")
        
        # Use the existing bipartite graph structure for efficiency
        # Group combos by the cards they use
        card_to_combo_sets = defaultdict(set)
        
        for combo_id in self.combo_data:
            combo_node = f"combo_{combo_id}"
            for neighbor in self.graph.neighbors(combo_node):
                if self.graph.nodes[neighbor]['node_type'] == 'card':
                    card_name = self.graph.nodes[neighbor]['card_name']
                    card_to_combo_sets[card_name].add(combo_id)
        
        # Find combos that share multiple cards efficiently
        combo_pairs_with_shared_cards = defaultdict(set)
        
        for card_name, combo_set in card_to_combo_sets.items():
            # Only process cards that appear in multiple combos
            if len(combo_set) < 2:
                continue
                
            # For each pair of combos that share this card
            combo_list = list(combo_set)
            for i in range(len(combo_list)):
                for j in range(i + 1, len(combo_list)):
                    combo_pair = tuple(sorted([combo_list[i], combo_list[j]]))
                    combo_pairs_with_shared_cards[combo_pair].add(card_name)
        
        # Build graph of combos that share enough cards
        combo_projection = nx.Graph()
        
        for combo_pair, shared_cards in combo_pairs_with_shared_cards.items():
            if len(shared_cards) >= min_shared_cards:
                combo_projection.add_edge(
                    combo_pair[0], 
                    combo_pair[1], 
                    weight=len(shared_cards), 
                    cards=list(shared_cards)
                )
        
        self.logger.info(f"Found {combo_projection.number_of_edges()} combo pairs with {min_shared_cards}+ shared cards")
        
        # Find connected components (packages)
        packages = []
        components_processed = 0
        for component in nx.connected_components(combo_projection):
            if len(component) >= 2:
                # Calculate package statistics
                all_cards = set()
                core_cards = None
                
                # Validate combo IDs in component
                valid_combo_ids = []
                for combo_id in component:
                    if str(combo_id) in self.combo_data:
                        valid_combo_ids.append(str(combo_id))
                
                if not valid_combo_ids:
                    continue
                
                for combo_id in valid_combo_ids:
                    combo_cards = set(self.combo_data[combo_id]['card_names'])
                    all_cards.update(combo_cards)
                    
                    if core_cards is None:
                        core_cards = combo_cards
                    else:
                        core_cards &= combo_cards
                
                package = {
                    'combo_ids': valid_combo_ids,
                    'combo_count': len(valid_combo_ids),
                    'total_unique_cards': len(all_cards),
                    'core_cards': list(core_cards) if core_cards else [],
                    'all_cards': list(all_cards)
                }
                
                packages.append(package)
                
                components_processed += 1
                if components_processed % 100 == 0:
                    self.logger.info(f"Processed {components_processed} components...")
        
        # Sort by combo count
        packages.sort(key=lambda x: x['combo_count'], reverse=True)
        
        self.logger.info(f"Found {len(packages)} combo packages")
        
        return packages
    
    def analyze_card_importance(self, sample_size: Optional[int] = 1000) -> Dict[str, Dict]:
        """Analyze card importance using various centrality measures.
        
        Args:
            sample_size: If provided, only analyze a sample of combos for speed
        """
        self.logger.info(f"Analyzing card importance...")
        
        # For large graphs, just use combo count as importance
        if len(self.combo_data) > 10000 and sample_size is None:
            self.logger.info("Large graph detected, using simplified importance calculation")
            card_importance = {}
            
            for card, combo_list in self.card_to_combos.items():
                card_importance[card] = {
                    'combos_count': len(combo_list),
                    'degree_centrality': len(combo_list) / len(self.combo_data),  # Approximation
                    'betweenness_centrality': 0,  # Skip expensive calculation
                    'eigenvector_centrality': len(combo_list) / len(self.combo_data),  # Approximation
                    'combo_ids': combo_list[:10]  # First 10 combos
                }
            
            return card_importance
        
        # Create card projection (cards connected if they appear in same combo)
        self.logger.info("Building card projection graph...")
        card_projection = nx.Graph()
        
        # Sample combos if requested
        combo_items = list(self.combo_data.items())
        if sample_size and len(combo_items) > sample_size:
            import random
            combo_items = random.sample(combo_items, sample_size)
            self.logger.info(f"Sampling {sample_size} combos for analysis")
        
        for combo_id, combo in combo_items:
            cards = combo['card_names']
            for i, card1 in enumerate(cards):
                for card2 in cards[i+1:]:
                    if card_projection.has_edge(card1, card2):
                        card_projection[card1][card2]['weight'] += 1
                    else:
                        card_projection.add_edge(card1, card2, weight=1)
        
        # Only calculate centrality for cards in the projection
        card_importance = {}
        
        if card_projection.number_of_nodes() > 0:
            self.logger.info("Calculating centrality measures...")
            
            # Calculate centrality measures
            degree_centrality = nx.degree_centrality(card_projection)
            
            # Skip expensive calculations for large graphs
            if card_projection.number_of_nodes() > 1000:
                betweenness_centrality = {node: 0 for node in card_projection.nodes()}
                eigenvector_centrality = degree_centrality  # Use degree as approximation
            else:
                betweenness_centrality = nx.betweenness_centrality(card_projection, weight='weight')
                try:
                    eigenvector_centrality = nx.eigenvector_centrality(card_projection, weight='weight', max_iter=1000)
                except:
                    eigenvector_centrality = degree_centrality  # Fallback to degree
            
            # Combine results
            for card in card_projection.nodes():
                card_importance[card] = {
                    'combos_count': len(self.card_to_combos.get(card, [])),
                    'degree_centrality': degree_centrality.get(card, 0),
                    'betweenness_centrality': betweenness_centrality.get(card, 0),
                    'eigenvector_centrality': eigenvector_centrality.get(card, 0),
                    'combo_ids': self.card_to_combos.get(card, [])[:10]  # First 10 combos
                }
        
        # Add cards not in the projection (appear in sampled combos but not connected)
        for card in self.card_to_combos:
            if card not in card_importance:
                card_importance[card] = {
                    'combos_count': len(self.card_to_combos[card]),
                    'degree_centrality': 0,
                    'betweenness_centrality': 0,
                    'eigenvector_centrality': 0,
                    'combo_ids': self.card_to_combos[card][:10]
                }
        
        return card_importance
    
    def get_graph_statistics(self) -> Dict:
        """Get comprehensive statistics about the graph."""
        stats = {
            'total_combos': len(self.combo_nodes),
            'total_cards': len(self.card_nodes),
            'total_edges': self.graph.number_of_edges(),
            'graph_density': nx.density(self.graph),
            'avg_cards_per_combo': 0,
            'avg_combos_per_card': 0,
            'most_connected_combos': [],
            'most_versatile_cards': [],
            'color_distribution': {},
            'largest_connected_component': 0
        }
        
        # Calculate averages
        if self.combo_nodes:
            total_cards_in_combos = sum(
                len(combo.get('card_names', [])) 
                for combo in self.combo_data.values()
            )
            stats['avg_cards_per_combo'] = total_cards_in_combos / len(self.combo_nodes)
        
        if self.card_nodes:
            stats['avg_combos_per_card'] = sum(
                len(combos) for combos in self.card_to_combos.values()
            ) / len(self.card_nodes)
        
        # Most connected combos - use graph structure efficiently
        self.logger.info("Calculating most connected combos...")
        combo_connections = []
        
        # Build a combo-to-combo connection count using the bipartite structure
        for combo_id in list(self.combo_data.keys())[:1000]:  # Sample first 1000 for speed
            combo_node = f"combo_{combo_id}"
            connected_combos = set()
            
            # Get all cards in this combo
            for card_neighbor in self.graph.neighbors(combo_node):
                if self.graph.nodes[card_neighbor]['node_type'] == 'card':
                    # Get all other combos that use this card
                    for other_combo in self.graph.neighbors(card_neighbor):
                        if other_combo != combo_node and self.graph.nodes[other_combo]['node_type'] == 'combo':
                            connected_combos.add(self.graph.nodes[other_combo]['combo_id'])
            
            combo_connections.append((combo_id, len(connected_combos)))
        
        stats['most_connected_combos'] = sorted(
            combo_connections, 
            key=lambda x: x[1], 
            reverse=True
        )[:10]
        
        # Most versatile cards - this is already efficient
        card_versatility = [
            (card, len(combos)) 
            for card, combos in self.card_to_combos.items()
        ]
        stats['most_versatile_cards'] = sorted(
            card_versatility,
            key=lambda x: x[1],
            reverse=True
        )[:10]
        
        # Color distribution
        for combo in self.combo_data.values():
            color = combo.get('color_identity', 'Colorless')
            if not color:
                color = 'Colorless'
            stats['color_distribution'][color] = stats['color_distribution'].get(color, 0) + 1
        
        # Connected components - sample for large graphs
        if len(self.graph) > 10000:
            self.logger.info("Graph is large, skipping connected components calculation")
            stats['largest_connected_component'] = f"Skipped (graph has {len(self.graph)} nodes)"
        else:
            components = list(nx.connected_components(self.graph))
            if components:
                stats['largest_connected_component'] = max(len(c) for c in components)
        
        return stats
    
    def export_subgraph(self, combo_ids: List[str], output_file: str) -> None:
        """Export a subgraph containing specified combos and their connections."""
        # Create subgraph
        nodes_to_include = set()
        
        for combo_id in combo_ids:
            combo_node = f"combo_{combo_id}"
            if combo_node in self.graph:
                nodes_to_include.add(combo_node)
                # Add connected cards
                nodes_to_include.update(self.graph.neighbors(combo_node))
        
        subgraph = self.graph.subgraph(nodes_to_include)
        
        # Export to GraphML for visualization
        nx.write_graphml(subgraph, output_file)
        self.logger.info(f"Subgraph exported to {output_file}")


if __name__ == "__main__":
    # Set up logging
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    
    # Create analyzer
    analyzer = ComboGraphAnalyzer()
    
    # Load data from JSON
    analyzer.load_from_json("commander_spellbook_data.json")
    
    # Get statistics
    print("\n=== Graph Statistics ===")
    stats = analyzer.get_graph_statistics()
    for key, value in stats.items():
        if isinstance(value, dict):
            print(f"\n{key}:")
            for k, v in value.items():
                print(f"  {k}: {v}")
        elif isinstance(value, list):
            print(f"\n{key}:")
            for item in value[:5]:
                print(f"  {item}")
        else:
            print(f"{key}: {value}")
    
    # Analyze a specific combo (example)
    print("\n=== Analyzing Combo #10000 ===")
    d1_combos = analyzer.get_distance_1_combos("10000")
    print(f"Found {len(d1_combos)} combos at distance 1")
    
    # Find combo packages
    print("\n=== Combo Packages ===")
    packages = analyzer.find_combo_packages(min_shared_cards=3)
    print(f"Found {len(packages)} packages with 3+ shared cards")
    if packages:
        print(f"\nLargest package: {packages[0]['combo_count']} combos")
        print(f"Core cards: {', '.join(packages[0]['core_cards'])}")