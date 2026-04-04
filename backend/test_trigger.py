import json
import urllib.request
import asyncio
from sqlalchemy import select
from app.db.database import AsyncSessionLocal
from app.models.user import User

async def trigger():
    async with AsyncSessionLocal() as db:
        user = (await db.execute(select(User))).scalars().first()
        if not user:
            print("No users found")
            return
        
        print(f"User: {user.id}, City: {user.city}, Zone: {user.zone}")
        
        # trigger via api
        url = f"http://localhost:8000/api/v1/claims/trigger/{user.id}"
        payload = {
            "zone": user.zone,
            "city": user.city,
            "avg_speed_kmph": 28.0,
            "max_speed_kmph": 45.0,
            "tower_changes_per_hour": 3.0,
            "spatial_claim_density": 1,
            "platform_pings": 15
        }
        data = json.dumps(payload).encode()
        try:
            req = urllib.request.Request(url, data=data, headers={"Content-Type": "application/json"})
            res = urllib.request.urlopen(req)
            print("Response:", res.read())
        except urllib.error.HTTPError as e:
            print("HTTPError:", e.code)
            print(e.read().decode())

if __name__ == "__main__":
    asyncio.run(trigger())
