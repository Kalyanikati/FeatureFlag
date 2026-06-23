from typing import List, Dict, Any
from fastapi import APIRouter, Query, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import Depends

from ..db import get_session
from ..models.flag import FeatureFlag
from ..services.cache import CacheService
from ..engine.evaluator import is_enabled_for_user

router = APIRouter(prefix="/sdk", tags=["sdk"])


@router.get("/flags", response_model=List[Dict[str, Any]])
async def get_sdk_flags(session: AsyncSession = Depends(get_session)):
    """
    Returns all enabled flags with rollout percentages for SDK consumption.
    """
    result = await session.execute(select(FeatureFlag).where(FeatureFlag.is_enabled == True))
    flags = result.scalars().all()
    
    output = []
    for flag in flags:
        output.append({
            "key": flag.key,
            "rollout_percentage": flag.rollout_percentage,
        })
    
    return output


@router.get("/evaluate")
async def evaluate_flag(
    flag_key: str = Query(...),
    user_id: str = Query(...),
    session: AsyncSession = Depends(get_session)
):
    """
    Evaluates a flag for a given user.
    Returns whether the flag is enabled based on rollout percentage.
    """
    result = await session.execute(select(FeatureFlag).where(FeatureFlag.key == flag_key))
    flag = result.scalar_one_or_none()
    
    if not flag:
        raise HTTPException(status_code=404, detail="Flag not found")
    
    enabled = is_enabled_for_user(flag, user_id)
    
    return {
        "flag_key": flag_key,
        "user_id": user_id,
        "enabled": enabled,
        "rollout_percentage": flag.rollout_percentage,
    }
