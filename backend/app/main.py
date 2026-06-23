from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .config import settings
from .db import engine, Base
from .api import flags, sdk, rollback
from .services.cache import CacheService

app = FastAPI(title="Feature Flag Platform")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup():
    # create tables if they do not exist (for development)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


@app.on_event("shutdown")
async def shutdown():
    await engine.dispose()
    await CacheService.close()


app.include_router(flags.router)
app.include_router(sdk.router)
app.include_router(rollback.router)
