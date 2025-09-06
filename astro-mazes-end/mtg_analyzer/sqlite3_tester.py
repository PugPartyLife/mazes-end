#!/usr/bin/env python3
"""
SQLite3 Command Tester - Quick CLI for testing SQLite queries
"""

import sqlite3
import sys
import argparse
from datetime import datetime
from pathlib import Path

def format_results(cursor, rows):
    """Format query results nicely."""
    if not rows:
        return "No results."
    
    # Get column names
    columns = [description[0] for description in cursor.description]
    
    # Calculate column widths
    widths = [len(col) for col in columns]
    for row in rows:
        for i, val in enumerate(row):
            widths[i] = max(widths[i], len(str(val) if val is not None else 'NULL'))
    
    # Build output
    output = []
    
    # Header
    header = " | ".join(col.ljust(widths[i]) for i, col in enumerate(columns))
    output.append(header)
    output.append("-" * len(header))
    
    # Rows
    for row in rows:
        row_str = " | ".join(
            (str(val) if val is not None else 'NULL').ljust(widths[i]) 
            for i, val in enumerate(row)
        )
        output.append(row_str)
    
    return "\n".join(output)

def main():
    parser = argparse.ArgumentParser(description='SQLite3 Command Tester')
    parser.add_argument('database', help='Path to SQLite database')
    parser.add_argument('-c', '--command', help='SQL command to execute')
    parser.add_argument('-f', '--file', help='SQL file to execute')
    parser.add_argument('-i', '--interactive', action='store_true', 
                        help='Interactive mode')
    parser.add_argument('--parse-dates', action='store_true',
                        help='Enable date parsing')
    
    args = parser.parse_args()
    
    # Check if database exists
    db_path = Path(args.database)
    if not db_path.exists() and not args.command and not args.file:
        print(f"Error: Database '{args.database}' not found.")
        sys.exit(1)
    
    # Connect to database
    try:
        if args.parse_dates:
            conn = sqlite3.connect(
                args.database,
                detect_types=sqlite3.PARSE_DECLTYPES | sqlite3.PARSE_COLNAMES
            )
        else:
            conn = sqlite3.connect(args.database)
        
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        print(f"Connected to: {args.database}")
        print()
        
    except sqlite3.Error as e:
        print(f"Error connecting to database: {e}")
        sys.exit(1)
    
    # Execute single command
    if args.command:
        try:
            cursor.execute(args.command)
            
            if args.command.strip().upper().startswith('SELECT'):
                rows = cursor.fetchall()
                print(format_results(cursor, rows))
                print(f"\n{len(rows)} row(s) returned.")
            else:
                conn.commit()
                print(f"Query executed successfully. {cursor.rowcount} row(s) affected.")
                
        except sqlite3.Error as e:
            print(f"Error: {e}")
            conn.rollback()
    
    # Execute file
    elif args.file:
        try:
            with open(args.file, 'r') as f:
                sql_script = f.read()
            
            cursor.executescript(sql_script)
            conn.commit()
            print(f"Script '{args.file}' executed successfully.")
            
        except FileNotFoundError:
            print(f"Error: File '{args.file}' not found.")
        except sqlite3.Error as e:
            print(f"Error executing script: {e}")
            conn.rollback()
    
    # Interactive mode
    else:
        print("Interactive mode. Type 'help' for commands, 'exit' to quit.")
        print()
        
        while True:
            try:
                command = input("sqlite> ").strip()
                
                if not command:
                    continue
                
                if command.lower() in ['exit', 'quit', '.quit']:
                    break
                
                if command.lower() == 'help':
                    print("""
Available commands:
  .tables              Show all tables
  .schema [table]      Show table schema
  .indexes [table]     Show indexes for table
  .pragma              Show useful pragma settings
  .help                Show this help
  .exit/.quit          Exit
  
Or enter any SQL query.
""")
                    continue
                
                if command.lower() == '.tables':
                    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
                    tables = cursor.fetchall()
                    if tables:
                        for table in tables:
                            print(f"  {table['name']}")
                    else:
                        print("No tables found.")
                    continue
                
                if command.lower().startswith('.schema'):
                    parts = command.split()
                    if len(parts) > 1:
                        table = parts[1]
                        cursor.execute(
                            "SELECT sql FROM sqlite_master WHERE type='table' AND name=?",
                            (table,)
                        )
                    else:
                        cursor.execute("SELECT sql FROM sqlite_master WHERE type='table'")
                    
                    schemas = cursor.fetchall()
                    for schema in schemas:
                        print(schema['sql'])
                        print()
                    continue
                
                if command.lower().startswith('.indexes'):
                    parts = command.split()
                    if len(parts) > 1:
                        table = parts[1]
                        cursor.execute(
                            "SELECT name, sql FROM sqlite_master WHERE type='index' AND tbl_name=?",
                            (table,)
                        )
                    else:
                        cursor.execute("SELECT name, tbl_name, sql FROM sqlite_master WHERE type='index'")
                    
                    indexes = cursor.fetchall()
                    for idx in indexes:
                        print(f"{idx['name']} on {idx.get('tbl_name', 'unknown')}")
                        if idx['sql']:
                            print(f"  {idx['sql']}")
                    continue
                
                if command.lower() == '.pragma':
                    pragmas = [
                        'journal_mode', 'synchronous', 'foreign_keys',
                        'cache_size', 'page_size', 'auto_vacuum'
                    ]
                    for pragma in pragmas:
                        cursor.execute(f"PRAGMA {pragma}")
                        result = cursor.fetchone()
                        if result:
                            print(f"{pragma}: {result[0]}")
                    continue
                
                # Execute SQL command
                cursor.execute(command)
                
                if command.strip().upper().startswith('SELECT'):
                    rows = cursor.fetchall()
                    print(format_results(cursor, rows))
                    print(f"\n{len(rows)} row(s) returned.")
                else:
                    conn.commit()
                    print(f"Query executed successfully. {cursor.rowcount} row(s) affected.")
                    
            except sqlite3.Error as e:
                print(f"Error: {e}")
                conn.rollback()
            except KeyboardInterrupt:
                print("\nUse 'exit' to quit.")
            except EOFError:
                break
    
    conn.close()
    print("\nConnection closed.")

if __name__ == "__main__":
    main()