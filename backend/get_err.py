import asyncio
import traceback
from app.db.database import engine, Base
from app.models.user import User
from app.models.policy import Policy
from app.models.claim import Claim

async def crash():
    async with engine.begin() as conn:
        try:
            await conn.run_sync(Base.metadata.drop_all)
            await conn.run_sync(Base.metadata.create_all)
        except Exception as e:
            with open("err_trace.txt", "w") as f:
                f.write(traceback.format_exc())

if __name__ == "__main__":
    asyncio.run(crash())
