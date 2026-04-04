from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.db.database import init_db
from app.api.routes import onboarding, claims, policy, admin


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await init_db()
    print("[Aura] Database tables ready")

    # Start background trigger polling (every 60 min)
    try:
        from apscheduler.schedulers.asyncio import AsyncIOScheduler
        from app.api.routes.admin import manual_trigger_cycle
        from app.db.database import AsyncSessionLocal

        async def scheduled_cycle():
            async with AsyncSessionLocal() as db:
                result = await manual_trigger_cycle(db)
                print(f"[Scheduler] Cycle: {result['evaluated']} evaluated, "
                      f"{result['triggered']} triggered, ₹{result['total_payout']} paid")

        scheduler = AsyncIOScheduler()
        scheduler.add_job(scheduled_cycle, "interval", minutes=60, id="trigger_cycle")
        scheduler.start()
        print("[Aura] APScheduler started — trigger cycle every 60 min")
        app.state.scheduler = scheduler
    except ImportError:
        print("[Aura] APScheduler not installed — background polling disabled")
        print("       Install with: pip install apscheduler")

    yield

    # Shutdown
    if hasattr(app.state, "scheduler"):
        app.state.scheduler.shutdown()


app = FastAPI(
    title       = "Aura — AI Parametric Insurance",
    description = "Income-loss-only parametric insurance for India's gig economy",
    version     = "2.0.0",
    lifespan    = lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins    = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
    ],
    allow_credentials= True,
    allow_methods    = ["*"],
    allow_headers    = ["*"],
)

app.include_router(onboarding.router, prefix="/api/v1", tags=["Onboarding"])
app.include_router(policy.router,     prefix="/api/v1", tags=["Policy"])
app.include_router(claims.router,     prefix="/api/v1", tags=["Claims"])
app.include_router(admin.router,      prefix="/api/v1", tags=["Admin"])


@app.get("/health")
async def health():
    return {
        "status" : "ok",
        "service": "Aura Insurance API v2.0",
        "docs"   : "/docs",
    }


@app.get("/favicon.ico", include_in_schema=False)
async def favicon():
    from fastapi.responses import Response
    return Response(content=b"", media_type="image/x-icon")
