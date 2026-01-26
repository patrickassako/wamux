
import asyncio
import os
import sys
from pathlib import Path

# Add the apps/api/src directory to the Python path
sys.path.append(str(Path(__file__).parent.parent / "apps" / "api" / "src"))

from core.supabase import get_supabase_service_client
from models.billing import PLAN_LIMITS, PlanType

async def migrate_plans():
    print("🚀 Starting plans migration...")
    supabase = get_supabase_service_client()
    
    # 1. Create the table (via RPC or assuming it exists, but since I can't run SQL directly easily, 
    # I'll try to upsert and see if it fails. Actually, I should check if the user can create it manually 
    # OR I can try to use a script. In Supabase, usually tables are created via SQL editor.)
    
    # Note: I will assume the table structure as defined in my implementation plan:
    # id (uuid, default gen_random_uuid()), name (text, unique), sessions_limit (int), 
    # message_limit (int), rate_limit_per_minute (int), price_monthly (int), 
    # price_yearly (int), features (text[])
    
    # For this script, I'll just try to insert the data.
    
    plans_data = []
    for plan_name, config in PLAN_LIMITS.items():
        plans_data.append({
            "name": plan_name.value if isinstance(plan_name, PlanType) else plan_name,
            "sessions_limit": config["sessions_limit"],
            "message_limit": config["message_limit"],
            "rate_limit_per_minute": config["rate_limit_per_minute"],
            "price_monthly": config["price_monthly"],
            "price_yearly": config["price_yearly"],
            "features": config["features"]
        })
    
    try:
        # We use upsert on 'name' if there's a unique constraint, or just insert.
        # Since I don't know the exact constraints yet, I'll try to delete and insert for a clean state if table exists.
        print(f"📦 Migrating {len(plans_data)} plans...")
        
        # Upsert based on name
        result = supabase.table("plans").upsert(plans_data, on_conflict="name").execute()
        
        print("✅ Migration successful!")
        print(result.data)
        
    except Exception as e:
        print(f"❌ Migration failed: {e}")
        print("\n💡 TIP: Make sure the 'plans' table exists in Supabase with these columns:")
        print("name (text, primary key), sessions_limit (int), message_limit (int), rate_limit_per_minute (int), price_monthly (int), price_yearly (int), features (text[])")

if __name__ == "__main__":
    asyncio.run(migrate_plans())
