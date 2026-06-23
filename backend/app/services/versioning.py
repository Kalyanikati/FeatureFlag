import json
import logging
from typing import Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from ..models.flag import FeatureFlag, FeatureFlagVersion, AuditLog

logger = logging.getLogger(__name__)


class VersioningService:
    """Handles version snapshot creation and state recovery."""

    @classmethod
    async def create_version(
        cls,
        session: AsyncSession,
        flag: FeatureFlag,
        changed_by: str = "system",
        change_reason: str = None,
    ) -> FeatureFlagVersion:
        """Create a version snapshot of the current flag state."""
        # Get the next version number
        result = await session.execute(
            select(FeatureFlagVersion).where(FeatureFlagVersion.flag_id == flag.id)
        )
        versions = result.scalars().all()
        next_version = len(versions) + 1

        # Create snapshot of full flag state
        snapshot = {
            "key": flag.key,
            "name": flag.name,
            "description": flag.description,
            "is_enabled": flag.is_enabled,
            "rollout_percentage": flag.rollout_percentage,
        }

        version = FeatureFlagVersion(
            flag_id=flag.id,
            version=next_version,
            state_snapshot=snapshot,
            changed_by=changed_by,
            change_reason=change_reason,
        )
        session.add(version)
        logger.info(f"Created version {next_version} for flag {flag.key}")
        return version

    @classmethod
    async def get_versions(
        cls, session: AsyncSession, flag_id: int
    ) -> list[FeatureFlagVersion]:
        """Fetch all versions for a flag, ordered by version number descending."""
        result = await session.execute(
            select(FeatureFlagVersion)
            .where(FeatureFlagVersion.flag_id == flag_id)
            .order_by(FeatureFlagVersion.version.desc())
        )
        return result.scalars().all()

    @classmethod
    async def restore_from_version(
        cls,
        session: AsyncSession,
        flag: FeatureFlag,
        version: FeatureFlagVersion,
        changed_by: str = "system",
    ) -> FeatureFlag:
        """Restore flag state from a version snapshot."""
        snapshot = version.state_snapshot

        # Restore fields from snapshot
        flag.name = snapshot.get("name")
        flag.description = snapshot.get("description")
        flag.is_enabled = snapshot.get("is_enabled", False)
        flag.rollout_percentage = snapshot.get("rollout_percentage", 100)

        session.add(flag)

        # Create an audit log for the rollback
        audit = AuditLog(
            flag_key=flag.key,
            action="ROLLBACK",
            changed_by_username=changed_by,
            details=f"Rolled back to version {version.version}",
        )
        session.add(audit)

        logger.info(f"Restored flag {flag.key} to version {version.version}")
        return flag
