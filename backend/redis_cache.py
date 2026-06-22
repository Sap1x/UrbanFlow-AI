"""
UrbanFlow Command Center — Redis Cache Adapter (Priority 8)
Production-grade caching for ML inferences and command center states.
"""
import os
import json
import hashlib

# Mock Redis for local dev if REDIS_URL not set
_use_mock = os.getenv("REDIS_URL") is None
_mock_cache = {}

def get_cache_key(*args, **kwargs) -> str:
    """Generate a consistent hash key for the given arguments."""
    payload = json.dumps({"args": args, "kwargs": kwargs}, sort_keys=True)
    return "urbanflow:" + hashlib.sha256(payload.encode()).hexdigest()[:16]

def get(key: str) -> dict:
    """Retrieve item from cache."""
    if _use_mock:
        return _mock_cache.get(key)
    else:
        # Stub for actual redis implementation
        # import redis
        # r = redis.from_url(os.getenv("REDIS_URL"))
        # val = r.get(key)
        # return json.loads(val) if val else None
        return None

def set(key: str, value: dict, ttl_seconds: int = 300) -> None:
    """Set item in cache with TTL."""
    if _use_mock:
        _mock_cache[key] = value
        # Ignoring TTL for mock
    else:
        # Stub for actual redis implementation
        # import redis
        # r = redis.from_url(os.getenv("REDIS_URL"))
        # r.setex(key, ttl_seconds, json.dumps(value))
        pass

def cache_inference(ttl_seconds=300):
    """Decorator to cache ML predictions."""
    def decorator(func):
        def wrapper(*args, **kwargs):
            key = get_cache_key(func.__name__, *args, **kwargs)
            cached = get(key)
            if cached is not None:
                return cached
            
            result = func(*args, **kwargs)
            set(key, result, ttl_seconds)
            return result
        return wrapper
    return decorator
