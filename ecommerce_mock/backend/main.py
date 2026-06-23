import os
import asyncio
import json
import hashlib
from typing import Dict

from fastapi import FastAPI, Query
import redis.asyncio as aioredis

APP = FastAPI()
FLAGS: Dict[str, Dict] = {}

REDIS_URL = os.getenv("REDIS_URL", "redis://redis_cache:6379/0")
PUBSUB_CHANNEL = os.getenv("FF_PUBSUB_CHANNEL", "flag_updates")


async def load_flags(redis_client: aioredis.Redis):
    keys = await redis_client.keys("flag:*:current")
    for k in keys:
        try:
            raw = await redis_client.get(k)
            if raw:
                parts = k.decode().split(":")
                flag_key = parts[1]
                FLAGS[flag_key] = json.loads(raw)
        except Exception:
            continue


async def watch_updates(redis_client: aioredis.Redis):
    pubsub = redis_client.pubsub()
    await pubsub.subscribe(PUBSUB_CHANNEL)

    async for message in pubsub.listen():
        if not message:
            await asyncio.sleep(0.1)
            continue

        if message.get("type") != "message":
            continue

        try:
            payload = message.get("data")
            if isinstance(payload, bytes):
                payload = payload.decode()

            data = json.loads(payload)
            key = data.get("key")
            if not key:
                continue

            redis_key = f"flag:{key}:current"
            raw = await redis_client.get(redis_key)

            if raw:
                FLAGS[key] = json.loads(raw)

        except Exception:
            continue


@APP.on_event("startup")
async def startup():
    APP.state.redis = aioredis.from_url(REDIS_URL)

    try:
        await load_flags(APP.state.redis)
    except Exception:
        pass

    APP.state.pubsub_task = asyncio.create_task(
        watch_updates(APP.state.redis)
    )


@APP.on_event("shutdown")
async def shutdown():
    task = getattr(APP.state, "pubsub_task", None)
    if task:
        task.cancel()

    try:
        await APP.state.redis.close()
    except Exception:
        pass


def _bucket(flag_key: str, user_id: str) -> int:
    """
    Deterministic 0-99 bucket using SHA256 (no external deps).
    """
    key = f"{flag_key}:{user_id}".encode("utf-8")
    digest = hashlib.sha256(key).hexdigest()
    return int(digest[:8], 16) % 100


def is_enabled_for_user(flag_key: str, user_id: str) -> bool:
    flag = FLAGS.get(flag_key)

    if not flag:
        return False

    if not flag.get("is_enabled", False):
        return False

    rollout = int(flag.get("rollout_percentage", 100) or 0)

    if rollout <= 0:
        return False

    if rollout >= 100:
        return True

    bucket = _bucket(flag_key, user_id)
    return bucket < rollout


from fastapi.staticfiles import StaticFiles

APP.mount("/", StaticFiles(directory="static", html=True), name="static")


@APP.get("/checkout")
async def checkout(
    user_id: str = Query(...),
    flag: str = Query("new_checkout")
):
    if is_enabled_for_user(flag, user_id):
        return {"version": "new", "flag": flag}

    return {"version": "old", "flag": flag}


@APP.get("/__flags")
async def read_flags():
    return FLAGS


APP.mount("/", StaticFiles(directory="static", html=True), name="static")