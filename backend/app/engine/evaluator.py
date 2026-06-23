import hashlib

def is_enabled_for_user(flag, user_id: str) -> bool:
    if not flag:
        return False
    if not getattr(flag, "is_enabled", False):
        return False

    rollout = int(getattr(flag, "rollout_percentage", 100) or 0)
    if rollout <= 0:
        return False
    if rollout >= 100:
        return True

    key = f"{flag.key}:{user_id}"
    hash_value = int(hashlib.md5(key.encode()).hexdigest(), 16)

    bucket = hash_value % 100
    return bucket < rollout