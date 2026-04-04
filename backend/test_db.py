import asyncio
from sqlalchemy import select
from app.db.database import AsyncSessionLocal
from app.models.user import User
from app.models.policy import Policy
from app.models.claim import Claim

async def test():
    async with AsyncSessionLocal() as db:
        policies = (await db.execute(select(Policy))).scalars().all()
        print("Policies count:", len(policies))
        for p in policies:
            print(p.status, p.created_at)

        claims = (await db.execute(select(Claim))).scalars().all()
        print("Claims count:", len(claims))

if __name__ == "__main__":
    asyncio.run(test())
