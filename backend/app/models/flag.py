from datetime import datetime
from typing import List, Dict, Any
from sqlalchemy import String, Boolean, Integer, DateTime, JSON, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base


class FeatureFlag(Base):
    __tablename__ = "feature_flags"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    key: Mapped[str] = mapped_column(String(64), unique=True, index=True, nullable=False)
    name: Mapped[str] = mapped_column(String(128), nullable=True)
    description: Mapped[str] = mapped_column(String(255), nullable=True)
    is_enabled: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    rollout_percentage: Mapped[int] = mapped_column(Integer, default=100, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    rules: Mapped[List["TargetingRule"]] = relationship("TargetingRule", back_populates="flag", cascade="all, delete-orphan")
    versions: Mapped[List["FeatureFlagVersion"]] = relationship("FeatureFlagVersion", back_populates="flag", cascade="all, delete-orphan")


class TargetingRule(Base):
    __tablename__ = "targeting_rules"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    flag_id: Mapped[int] = mapped_column(Integer, ForeignKey("feature_flags.id", ondelete="CASCADE"), nullable=False)
    priority: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    serve_value: Mapped[bool] = mapped_column(Boolean, nullable=False)
    
    # JSON structure: [{"attribute": "country", "operator": "equals", "value": "IN"}]
    conditions: Mapped[Dict[str, Any]] = mapped_column(JSON, nullable=False)
    
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationship
    flag: Mapped["FeatureFlag"] = relationship("FeatureFlag", back_populates="rules")


class FeatureFlagVersion(Base):
    __tablename__ = "feature_flag_versions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    flag_id: Mapped[int] = mapped_column(Integer, ForeignKey("feature_flags.id", ondelete="CASCADE"), nullable=False)
    version: Mapped[int] = mapped_column(Integer, nullable=False)
    
    # Full snapshot of flag state at this version
    state_snapshot: Mapped[Dict[str, Any]] = mapped_column(JSON, nullable=False)
    
    changed_by: Mapped[str] = mapped_column(String(100), nullable=False)
    change_reason: Mapped[str] = mapped_column(String(255), nullable=True)
    
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    
    # Relationship
    flag: Mapped["FeatureFlag"] = relationship("FeatureFlag", back_populates="versions")


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    flag_key: Mapped[str] = mapped_column(String(64), index=True, nullable=False)
    action: Mapped[str] = mapped_column(String(20), nullable=False)  # CREATED, UPDATED, DELETED, ROLLBACK
    changed_by_username: Mapped[str] = mapped_column(String(100), nullable=False)
    details: Mapped[str] = mapped_column(String(255), nullable=True)
    timestamp: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
