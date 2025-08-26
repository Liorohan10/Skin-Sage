"""
Debug script to check environment variable loading
"""

import os
from dotenv import load_dotenv
from pathlib import Path

print("🔍 Environment Variable Debug")
print("=" * 40)

# Check if .env file exists
env_file = Path(".env")
print(f"📁 .env file exists: {env_file.exists()}")
print(f"📍 .env file path: {env_file.absolute()}")

if env_file.exists():
    print(f"📏 .env file size: {env_file.stat().st_size} bytes")

# Load environment variables
print("\n🔄 Loading environment variables...")
load_dotenv()

# Check required variables
required_vars = [
    'SUPABASE_URL',
    'SUPABASE_ANON_KEY', 
    'GEMINI_API_KEY'
]

print("\n📋 Environment Variables Status:")
for var in required_vars:
    value = os.getenv(var)
    if value:
        # Mask sensitive information
        if len(value) > 20:
            masked = value[:10] + "..." + value[-5:]
        else:
            masked = value[:5] + "..."
        print(f"  ✅ {var}: {masked} (length: {len(value)})")
    else:
        print(f"  ❌ {var}: NOT SET")

# Also check if dotenv loaded the file
print(f"\n🔍 Current working directory: {os.getcwd()}")

# Try to read .env file manually
if env_file.exists():
    print("\n📄 .env file content (first 200 chars):")
    try:
        with open(env_file, 'r', encoding='utf-8') as f:
            content = f.read(200)
            print(repr(content))
    except Exception as e:
        print(f"Error reading file: {e}")

print("\n" + "=" * 40)
