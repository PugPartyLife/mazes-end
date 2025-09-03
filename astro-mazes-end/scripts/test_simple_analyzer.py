#!/usr/bin/env python3
"""
Simple example: Read JSON and analyze combo relationships
"""

import sys
import io
from combo_graph_analyzer import ComboGraphAnalyzer
import logging

# Force UTF-8 encoding for Windows
if sys.platform == "win32":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

# Set up logging
logging.basicConfig(level=logging.INFO)

# Create analyzer
analyzer = ComboGraphAnalyzer()

# Load data from JSON
analyzer.load_from_json("combo_data.json")

# Example 1: Get statistics
stats = analyzer.get_graph_statistics()
print(f"\nTotal combos: {stats['total_combos']}")
print(f"Total unique cards: {stats['total_cards']}")
print(f"Most versatile cards: {stats['most_versatile_cards'][:5]}")

# Example 2: Find combos related to a specific combo
combo_id = "10000"  # Replace with actual combo ID
distance_1 = analyzer.get_distance_1_combos(combo_id)
print(f"\nCombo #{combo_id} shares cards with {len(distance_1)} other combos")

# Example 3: Find combo packages (groups that share multiple cards)
packages = analyzer.find_combo_packages(min_shared_cards=3)
print(f"\nFound {len(packages)} combo packages")
if packages:
    largest = packages[0]
    print(f"Largest package has {largest['combo_count']} combos")
    print(f"Total unique cards in package: {largest['total_unique_cards']}")
    
    # Only print core cards if there are any
    if largest['core_cards']:
        print(f"Core cards (in ALL combos): {', '.join(largest['core_cards'][:5])}")
        if len(largest['core_cards']) > 5:
            print(f"  ... and {len(largest['core_cards']) - 5} more")
    else:
        print("No cards appear in ALL combos of this package")
    
    # Show a sample of combos instead
    print(f"\nSample combos from largest package:")
    sample_count = 0
    for combo_id in largest['combo_ids'][:5]:  # Try more in case some are invalid
        # Handle potential compound IDs
        if '-' in str(combo_id):
            # Skip compound IDs or try first part
            parts = str(combo_id).split('-')
            combo_id = parts[0]
        
        combo = analyzer.combo_data.get(str(combo_id), {})
        if combo:  # Only print if we found valid combo data
            print(f"  Combo #{combo_id}: {', '.join(combo.get('card_names', [])[:4])}...")
            produces = combo.get('produces', [])
            if produces:
                print(f"    Produces: {produces[0]}")
            else:
                print(f"    Produces: No results listed")
            
            sample_count += 1
            if sample_count >= 3:
                break

# Example 4: Analyze card importance (use sampling for speed)
importance = analyzer.analyze_card_importance(sample_size=1000)

# For large datasets, just use combo count as the main metric
top_cards = sorted(importance.items(), 
                  key=lambda x: x[1]['combos_count'], 
                  reverse=True)[:10]

print("\nMost influential cards in the combo network:")
for card, metrics in top_cards[:5]:
    print(f"  {card}: appears in {metrics['combos_count']} combos")

# Example 5: Find all 2-card combos
print("\n=== Two-Card Combos ===")
two_card_combos = []
for combo_id, combo_data in analyzer.combo_data.items():
    if len(combo_data.get('card_names', [])) == 2:
        two_card_combos.append({
            'id': combo_id,
            'cards': combo_data['card_names'],
            'produces': combo_data.get('produces', [])
        })

print(f"Found {len(two_card_combos)} two-card combos")

# Group by result types
result_types = {}
for combo in two_card_combos:
    for result in combo['produces']:
        if result and result.strip():  # Skip empty results
            if result not in result_types:
                result_types[result] = []
            result_types[result].append(combo)

# Count combos with no results
combos_with_no_results = sum(1 for combo in two_card_combos if not any(r.strip() for r in combo.get('produces', [])))
if combos_with_no_results > 0:
    print(f"\n({combos_with_no_results} combos have no listed results)")

# Show top result types
sorted_results = sorted(result_types.items(), key=lambda x: len(x[1]), reverse=True)
print(f"\nMost common results from 2-card combos:")
for result, combos in sorted_results[:5]:
    print(f"  {result}: {len(combos)} combos")
    # Show one example
    if combos:
        example = combos[0]
        print(f"    Example: {' + '.join(example['cards'])}")

# Show some specific 2-card combos
print(f"\nSample 2-card combos:")
for combo in two_card_combos[:5]:
    print(f"  {' + '.join(combo['cards'])}")
    if combo['produces']:
        print(f"    -> {combo['produces'][0]}")

# Example 6: Find all 3-card combos
print("\n=== Three-Card Combos ===")
three_card_combos = []
for combo_id, combo_data in analyzer.combo_data.items():
    if len(combo_data.get('card_names', [])) == 3:
        three_card_combos.append({
            'id': combo_id,
            'cards': combo_data['card_names'],
            'produces': combo_data.get('produces', [])
        })

print(f"Found {len(three_card_combos)} three-card combos")

# Group by result types for 3-card combos
result_types_3 = {}
for combo in three_card_combos:
    for result in combo['produces']:
        if result and result.strip():  # Skip empty results
            if result not in result_types_3:
                result_types_3[result] = []
            result_types_3[result].append(combo)

# Count combos with no results
combos_with_no_results_3 = sum(1 for combo in three_card_combos if not any(r.strip() for r in combo.get('produces', [])))
if combos_with_no_results_3 > 0:
    print(f"\n({combos_with_no_results_3} combos have no listed results)")

# Show top result types
sorted_results_3 = sorted(result_types_3.items(), key=lambda x: len(x[1]), reverse=True)
print(f"\nMost common results from 3-card combos:")
for result, combos in sorted_results_3[:5]:
    print(f"  {result}: {len(combos)} combos")
    # Show one example
    if combos:
        example = combos[0]
        print(f"    Example: {' + '.join(example['cards'])}")

# Show some specific 3-card combos
print(f"\nSample 3-card combos:")
for combo in three_card_combos[:5]:
    print(f"  {' + '.join(combo['cards'])}")
    if combo['produces']:
        print(f"    -> {combo['produces'][0]}")

# Summary comparison
print(f"\n=== Combo Size Summary ===")
print(f"2-card combos: {len(two_card_combos)}")
print(f"3-card combos: {len(three_card_combos)}")
print(f"Total combos analyzed: {len(analyzer.combo_data)}")