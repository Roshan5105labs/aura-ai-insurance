import asyncio
from sqlalchemy import text
from app.db.database import AsyncSessionLocal

async def destroy():
    async with AsyncSessionLocal() as db:
        print("Executing DROP tables...")
        await db.execute(text("DROP TABLE IF EXISTS claims CASCADE;"))
        await db.execute(text("DROP TABLE IF EXISTS policies CASCADE;"))
        await db.execute(text("DROP TABLE IF EXISTS users CASCADE;"))
        await db.commit()
    print("Done dropping!")

if __name__ == "__main__":
    asyncio.run(destroy())
