from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from ..db import get_session
from ..models.flag import FeatureFlag
from ..schemas.flag import FlagCreate, FlagOut, FlagUpdate
from ..services.cache import CacheService
from ..services.versioning import VersioningService

router = APIRouter(prefix="/api/v1/flags", tags=["flags"])


def flag_to_dict(flag: FeatureFlag) -> dict:
    """Convert a FeatureFlag ORM object to a dictionary for caching."""
    return {
        "key": flag.key,
        "name": flag.name,
        "description": flag.description,
        "is_enabled": flag.is_enabled,
        "rollout_percentage": flag.rollout_percentage,
    }


@router.post("/", response_model=FlagOut, status_code=status.HTTP_201_CREATED)
async def create_flag(payload: FlagCreate, session: AsyncSession = Depends(get_session)):
    flag = FeatureFlag(
        key=payload.key,
        name=payload.name,
        description=payload.description,
        is_enabled=payload.is_enabled,
        rollout_percentage=payload.rollout_percentage,
    )
    session.add(flag)
    try:
        await session.commit()
        await session.refresh(flag)
    except IntegrityError:
        await session.rollback()
        raise HTTPException(status_code=400, detail="Flag with this key already exists")
    
    # Create initial version
    await VersioningService.create_version(session, flag, changed_by="admin", change_reason="Initial creation")
    await session.commit()
    
    # Write-through to Redis
    await CacheService.set_flag(flag.key, flag_to_dict(flag))
    await CacheService.publish_update(flag.key, "created")
    
    return flag


@router.get("/", response_model=List[FlagOut])
async def list_flags(session: AsyncSession = Depends(get_session)):
    result = await session.execute(select(FeatureFlag))
    flags = result.scalars().all()
    return flags


@router.get("/{key}", response_model=FlagOut)
async def get_flag(key: str, session: AsyncSession = Depends(get_session)):
    result = await session.execute(select(FeatureFlag).where(FeatureFlag.key == key))
    flag = result.scalar_one_or_none()
    if not flag:
        raise HTTPException(status_code=404, detail="Flag not found")
    return flag


@router.put("/{key}", response_model=FlagOut)
async def update_flag(key: str, payload: FlagUpdate, session: AsyncSession = Depends(get_session)):
    result = await session.execute(select(FeatureFlag).where(FeatureFlag.key == key))
    flag = result.scalar_one_or_none()
    if not flag:
        raise HTTPException(status_code=404, detail="Flag not found")
    for field, value in payload.dict(exclude_unset=True).items():
        setattr(flag, field, value)
    session.add(flag)
    await session.commit()
    await session.refresh(flag)
    
    # Create version snapshot
    await VersioningService.create_version(session, flag, changed_by="admin", change_reason="Manual update")
    await session.commit()
    
    # Write-through to Redis
    await CacheService.set_flag(flag.key, flag_to_dict(flag))
    await CacheService.publish_update(flag.key, "updated")
    
    return flag


@router.delete("/{key}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_flag(key: str, session: AsyncSession = Depends(get_session)):
    result = await session.execute(select(FeatureFlag).where(FeatureFlag.key == key))
    flag = result.scalar_one_or_none()
    if not flag:
        raise HTTPException(status_code=404, detail="Flag not found")
    await session.delete(flag)
    await session.commit()
    
    # Delete from Redis
    await CacheService.delete_flag(flag.key)
    await CacheService.publish_update(flag.key, "deleted")
    
    return None

