#!/usr/bin/env python3
"""
combo_server/server.py
Async HTTP server for combo graph queries using aiohttp
"""

import asyncio
import json
import logging
import argparse
from pathlib import Path
from typing import Dict, Any, Optional

from aiohttp import web
import aiohttp_cors

# Import from parent directory
import sys
sys.path.append(str(Path(__file__).parent.parent))
from combo_graph_analyzer import ComboGraphAnalyzer

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class ComboGraphHandler:
    """HTTP request handler for combo graph queries."""
    
    def __init__(self, analyzer: ComboGraphAnalyzer):
        self.analyzer = analyzer
        
    async def handle_combo_by_id(self, request: web.Request) -> web.Response:
        combo_id = request.match_info.get('combo_id')
        
        if not combo_id or combo_id not in self.analyzer.combo_data:
            return web.json_response({"error": "Combo not found"}, status=404)
            
        combo = self.analyzer.combo_data[combo_id].copy()
        combo['id'] = combo_id
        
        # Add card details
        combo['cards'] = []
        for card_name in combo.get('card_names', []):
            card_info = self.analyzer.card_data.get(card_name, {})
            combo['cards'].append({
                'name': card_name,
                'combos_count': card_info.get('combos_count', 0)
            })
        
        return web.json_response(combo)
    
    async def handle_distance_1_combos(self, request: web.Request) -> web.Response:
        combo_id = request.match_info.get('combo_id')
        
        if not combo_id:
            return web.json_response({"error": "Combo ID required"}, status=400)
            
        d1_combos = self.analyzer.get_distance_1_combos(combo_id)
        
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
        
        result['combos'].sort(key=lambda x: x['shared_cards_count'], reverse=True)
        
        return web.json_response(result)
    
    async def handle_combos_by_card(self, request: web.Request) -> web.Response:
        card_name = request.match_info.get('card_name')
        
        if not card_name:
            return web.json_response({"error": "Card name required"}, status=400)
            
        combo_ids = self.analyzer.card_to_combos.get(card_name, [])
        
        result = {
            'card_name': card_name,
            'total_combos': len(combo_ids),
            'combos': []
        }
        
        # Limit to first 50
        for combo_id in combo_ids[:50]:
            combo = self.analyzer.combo_data.get(combo_id, {})
            result['combos'].append({
                'id': combo_id,
                'color_identity': combo.get('color_identity', ''),
                'produces': combo.get('produces', []),
                'card_names': combo.get('card_names', [])
            })
        
        return web.json_response(result)
    
    async def handle_combo_packages(self, request: web.Request) -> web.Response:
        min_shared = int(request.query.get('min_shared_cards', 2))
        packages = self.analyzer.find_combo_packages(min_shared)
        
        # Limit to top 50
        return web.json_response(packages[:50])
    
    async def handle_graph_statistics(self, request: web.Request) -> web.Response:
        stats = self.analyzer.get_graph_statistics()
        return web.json_response(stats)
    
    async def handle_combo_package_by_id(self, request: web.Request) -> web.Response:
        try:
            data = await request.json()
            combo_ids = data.get('combo_ids', [])
            min_shared = data.get('min_shared_cards', 2)
        except Exception:
            return web.json_response({"error": "Invalid request body"}, status=400)
        
        if not combo_ids:
            return web.json_response({"error": "combo_ids required"}, status=400)
        
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
        
        return web.json_response({
            'combo_ids': combo_ids,
            'combo_count': len(combo_ids),
            'total_unique_cards': len(all_cards),
            'core_cards': list(core_cards) if core_cards else [],
            'all_cards': list(all_cards)
        })
    
    async def handle_health(self, request: web.Request) -> web.Response:
        return web.json_response({
            "status": "healthy",
            "combos_loaded": len(self.analyzer.combo_data),
            "cards_loaded": len(self.analyzer.card_data)
        })
    
    async def handle_help(self, request: web.Request) -> web.Response:
        """Return API documentation."""
        return web.json_response({
            "endpoints": [
                {
                    "path": "/",
                    "method": "GET",
                    "description": "API documentation"
                },
                {
                    "path": "/health",
                    "method": "GET",
                    "description": "Server health check"
                },
                {
                    "path": "/api/combo/{combo_id}",
                    "method": "GET",
                    "description": "Get a specific combo by ID"
                },
                {
                    "path": "/api/combo/{combo_id}/distance1",
                    "method": "GET",
                    "description": "Get all combos that share at least one card with the specified combo"
                },
                {
                    "path": "/api/combos/card/{card_name}",
                    "method": "GET",
                    "description": "Find all combos containing a specific card"
                },
                {
                    "path": "/api/combos/packages",
                    "method": "GET",
                    "description": "Find combo packages (groups of combos with shared cards)",
                    "params": {
                        "min_shared_cards": "Minimum number of cards that must be shared (default: 2)"
                    }
                },
                {
                    "path": "/api/combos/statistics",
                    "method": "GET",
                    "description": "Get graph statistics (total combos, cards, density, etc.)"
                },
                {
                    "path": "/api/combos/package",
                    "method": "POST",
                    "description": "Get package information for a specific set of combo IDs",
                    "body": {
                        "combo_ids": "Array of combo IDs",
                        "min_shared_cards": "Minimum shared cards (optional, default: 2)"
                    }
                }
            ]
        })


def create_app(data_file: str) -> web.Application:
    """Create and configure the aiohttp application."""
    
    # Load analyzer
    analyzer = ComboGraphAnalyzer()
    analyzer.load_from_json(data_file)
    logger.info(f"Loaded {len(analyzer.combo_data)} combos from {data_file}")
    
    # Create handler
    handler = ComboGraphHandler(analyzer)
    
    # Create app
    app = web.Application()
    
    # Configure CORS
    cors = aiohttp_cors.setup(app, defaults={
        "*": aiohttp_cors.ResourceOptions(
            allow_credentials=True,
            expose_headers="*",
            allow_headers="*",
            allow_methods="*"
        )
    })
    
    # Define routes
    routes = [
        web.get('/', handler.handle_help),
        web.get('/health', handler.handle_health),
        web.get('/api/combo/{combo_id}', handler.handle_combo_by_id),
        web.get('/api/combo/{combo_id}/distance1', handler.handle_distance_1_combos),
        web.get('/api/combos/card/{card_name}', handler.handle_combos_by_card),
        web.get('/api/combos/packages', handler.handle_combo_packages),
        web.get('/api/combos/statistics', handler.handle_graph_statistics),
        web.post('/api/combos/package', handler.handle_combo_package_by_id),
    ]
    
    # Add routes with CORS
    for route in routes:
        cors.add(app.router.add_route(route.method, route.path, route.handler))
    
    return app


def main():
    parser = argparse.ArgumentParser(description='Combo Graph HTTP Server')
    parser.add_argument('data_file', help='Path to commander spellbook JSON data')
    parser.add_argument('--host', default='127.0.0.1', help='Host to bind to')
    parser.add_argument('--port', type=int, default=8080, help='Port to bind to')
    
    args = parser.parse_args()
    
    # Create and run app
    app = create_app(args.data_file)
    
    logger.info(f"Starting server on http://{args.host}:{args.port}")
    web.run_app(app, host=args.host, port=args.port)


if __name__ == '__main__':
    main()