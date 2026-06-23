from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel
from typing import List, Optional

from ..db import get_session
from ..models.flag import FeatureFlag, FeatureFlagVersion
from ..schemas.flag import FeatureFlagVersionOut
from ..services.versioning import VersioningService
from ..services.cache import CacheService

router = APIRouter(prefix="/api/v1/flags", tags=["rollback"])


class RollbackRequest(BaseModel):
    version_id: int
    reason: Optional[str] = None


def flag_to_dict(flag: FeatureFlag) -> dict:
    """Convert a FeatureFlag ORM object to a dictionary for caching."""
    return {
        "key": flag.key,
        "name": flag.name,
        "description": flag.description,
        "is_enabled": flag.is_enabled,
        "rollout_percentage": flag.rollout_percentage,
    }


@router.get("/{key}/versions", response_model=List[FeatureFlagVersionOut])
async def list_flag_versions(key: str, session: AsyncSession = Depends(get_session)):
    """List all versions of a flag."""
    result = await session.execute(select(FeatureFlag).where(FeatureFlag.key == key))
    flag = result.scalar_one_or_none()
    if not flag:
        raise HTTPException(status_code=404, detail="Flag not found")

    versions = await VersioningService.get_versions(session, flag.id)
    return versions


@router.post("/{key}/rollback", response_model=dict)
async def rollback_flag(
    key: str, payload: RollbackRequest, session: AsyncSession = Depends(get_session)
):
    """Rollback a flag to a specific version."""
    # Load the flag
    result = await session.execute(select(FeatureFlag).where(FeatureFlag.key == key))
    flag = result.scalar_one_or_none()
    if not flag:
        raise HTTPException(status_code=404, detail="Flag not found")

    # Load the target version
    version_result = await session.execute(
        select(FeatureFlagVersion).where(FeatureFlagVersion.id == payload.version_id)
    )
    version = version_result.scalar_one_or_none()
    if not version:
        raise HTTPException(status_code=404, detail="Version not found")

    if version.flag_id != flag.id:
        raise HTTPException(
            status_code=400, detail="Version does not belong to this flag"
        )

    try:
        # Restore flag state from version (transactional)
        await VersioningService.restore_from_version(
            session, flag, version, changed_by="admin"
        )
        await session.commit()

        # Write-through to Redis
        await CacheService.set_flag(flag.key, flag_to_dict(flag))
        await CacheService.publish_update(flag.key, "rollback")

        return {
            "status": "success",
            "message": f"Flag {key} rolled back to version {version.version}",
            "flag": flag_to_dict(flag),
        }
    except Exception as e:
        await session.rollback()
        raise HTTPException(
            status_code=500, detail=f"Rollback failed: {str(e)}"
        )
