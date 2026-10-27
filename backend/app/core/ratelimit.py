"""In-process sliding-window rate limiting.

This is deliberately simple. It protects a single-process deployment from
brute-force login attempts. A multi-instance deployment must move the counters
to Redis; the interface is small enough to swap.
"""

from __future__ import annotations

import threading
import time
from collections import deque


class RateLimiter:
    def __init__(self, limit: int, window_seconds: float) -> None:
        self.limit = limit
        self.window_seconds = window_seconds
        self._events: dict[str, deque[float]] = {}
        self._lock = threading.Lock()

    def check(self, key: str) -> bool:
        """Record an attempt and return whether it is allowed."""
        now = time.monotonic()
        cutoff = now - self.window_seconds
        with self._lock:
            events = self._events.setdefault(key, deque())
            while events and events[0] < cutoff:
                events.popleft()
            if len(events) >= self.limit:
                return False
            events.append(now)
            return True

    def reset(self, key: str) -> None:
        with self._lock:
            self._events.pop(key, None)


login_limiter = RateLimiter(limit=10, window_seconds=60.0)
register_limiter = RateLimiter(limit=5, window_seconds=3600.0)
reset_limiter = RateLimiter(limit=5, window_seconds=3600.0)
