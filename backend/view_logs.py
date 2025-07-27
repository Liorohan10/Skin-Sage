#!/usr/bin/env python3
"""
Log viewer script to examine AI interaction logs
"""

import json
import os
from datetime import datetime
import argparse

def view_logs(log_type="all", limit=10):
    """View the AI interaction logs"""
    
    logs_dir = "logs"
    if not os.path.exists(logs_dir):
        print("❌ No logs directory found")
        return
    
    log_files = [f for f in os.listdir(logs_dir) if f.endswith('.json')]
    
    if not log_files:
        print("❌ No log files found")
        return
    
    print(f"📁 Found {len(log_files)} log file(s)")
    
    all_entries = []
    
    for log_file in sorted(log_files):
        file_path = os.path.join(logs_dir, log_file)
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                log_data = json.load(f)
            
            print(f"\n📄 {log_file}: {len(log_data)} entries")
            
            for entry in log_data:
                entry['source_file'] = log_file
                all_entries.append(entry)
                
        except Exception as e:
            print(f"❌ Error reading {log_file}: {e}")
    
    # Sort by timestamp
    all_entries.sort(key=lambda x: x.get('timestamp', ''), reverse=True)
    
    # Filter by type if specified
    if log_type != "all":
        all_entries = [e for e in all_entries if log_type.lower() in e.get('interaction_type', '').lower()]
    
    # Limit results
    display_entries = all_entries[:limit]
    
    print(f"\n🔍 Showing {len(display_entries)} most recent entries:")
    print("=" * 80)
    
    for i, entry in enumerate(display_entries):
        print(f"\n📝 Entry {i+1}:")
        print(f"   🕒 Time: {entry.get('timestamp', 'Unknown')}")
        print(f"   🏷️  Type: {entry.get('interaction_type', 'Unknown')}")
        print(f"   📂 File: {entry.get('source_file', 'Unknown')}")
        
        if entry.get('user_profile'):
            profile = entry['user_profile']
            print(f"   👤 User: {profile.get('skinType', 'Unknown')} skin, {profile.get('ageRange', 'Unknown')} age")
            if profile.get('concerns'):
                print(f"   🎯 Concerns: {', '.join(profile['concerns'])}")
        
        if entry.get('query'):
            query_preview = entry['query'][:100] + "..." if len(entry['query']) > 100 else entry['query']
            print(f"   ❓ Query: {query_preview}")
        
        if entry.get('response'):
            response_preview = str(entry['response'])[:150] + "..." if len(str(entry['response'])) > 150 else str(entry['response'])
            print(f"   💬 Response: {response_preview}")
        
        if entry.get('error'):
            print(f"   ❌ Error: {entry['error']}")
        
        if entry.get('metadata'):
            metadata = entry['metadata']
            if isinstance(metadata, dict):
                relevant_metadata = {k: v for k, v in metadata.items() if k in ['recommendations_count', 'response_length', 'product_database_size']}
                if relevant_metadata:
                    print(f"   📊 Data: {relevant_metadata}")
        
        print("-" * 40)
    
    if len(all_entries) > limit:
        print(f"\n📈 Showing {limit} of {len(all_entries)} total entries")

def show_summary():
    """Show a summary of all log entries"""
    
    logs_dir = "logs"
    if not os.path.exists(logs_dir):
        print("❌ No logs directory found")
        return
    
    log_files = [f for f in os.listdir(logs_dir) if f.endswith('.json')]
    
    if not log_files:
        print("❌ No log files found")
        return
    
    interaction_types = {}
    error_count = 0
    success_count = 0
    
    for log_file in log_files:
        file_path = os.path.join(logs_dir, log_file)
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                log_data = json.load(f)
            
            for entry in log_data:
                interaction_type = entry.get('interaction_type', 'unknown')
                interaction_types[interaction_type] = interaction_types.get(interaction_type, 0) + 1
                
                if entry.get('error'):
                    error_count += 1
                else:
                    success_count += 1
                    
        except Exception as e:
            print(f"❌ Error reading {log_file}: {e}")
    
    print("📊 AI Interaction Summary:")
    print("=" * 40)
    print(f"✅ Successful interactions: {success_count}")
    print(f"❌ Failed interactions: {error_count}")
    print(f"📈 Total interactions: {success_count + error_count}")
    
    print("\n📋 Interaction Types:")
    for interaction_type, count in sorted(interaction_types.items()):
        print(f"   • {interaction_type}: {count}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="View AI interaction logs")
    parser.add_argument("--type", default="all", help="Filter by interaction type")
    parser.add_argument("--limit", type=int, default=10, help="Number of entries to show")
    parser.add_argument("--summary", action="store_true", help="Show summary instead of detailed view")
    
    args = parser.parse_args()
    
    if args.summary:
        show_summary()
    else:
        view_logs(args.type, args.limit)
