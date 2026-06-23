from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime


class FlagCreate(BaseModel):
    key: str = Field(..., max_length=64)
    name: Optional[str] = None
    description: Optional[str] = None
    is_enabled: Optional[bool] = False
    rollout_percentage: Optional[int] = 100


class FlagUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    is_enabled: Optional[bool] = None
    rollout_percentage: Optional[int] = None


class FlagOut(BaseModel):
    id: int
    key: str
    name: Optional[str]
    description: Optional[str]
    is_enabled: bool
    rollout_percentage: int
    created_at: Optional[datetime]
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True


class TargetingRuleCreate(BaseModel):
    priority: int = 0
    serve_value: bool
    conditions: Dict[str, Any]


class TargetingRuleOut(BaseModel):
    id: int
    flag_id: int
    priority: int
    serve_value: bool
    conditions: Dict[str, Any]
    created_at: Optional[datetime]
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True


class FeatureFlagVersionOut(BaseModel):
    id: int
    flag_id: int
    version: int
    state_snapshot: Dict[str, Any]
    changed_by: str
    change_reason: Optional[str]
    created_at: Optional[datetime]

    class Config:
        from_attributes = True

