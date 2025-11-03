import os
import json
import asyncio
from typing import Optional, Any, Dict

import aiosqlite


DB_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'data')
DB_FILE = os.path.join(DB_PATH, 'data.db')


_init_lock = asyncio.Lock()
_initialized = False


async def init_db() -> None:
    global _initialized
    if _initialized:
        return
    async with _init_lock:
        if _initialized:
            return
        os.makedirs(DB_PATH, exist_ok=True)
        async with aiosqlite.connect(DB_FILE) as db:
            await db.execute(
                "CREATE TABLE IF NOT EXISTS kv (key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at INTEGER NOT NULL)"
            )
            await db.commit()
        _initialized = True


async def get_value(key: str) -> Optional[str]:
    await init_db()
    async with aiosqlite.connect(DB_FILE) as db:
        async with db.execute("SELECT value FROM kv WHERE key = ?", (key,)) as cur:
            row = await cur.fetchone()
            return row[0] if row else None


async def set_value(key: str, value: str) -> None:
    await init_db()
    async with aiosqlite.connect(DB_FILE) as db:
        await db.execute(
            "INSERT INTO kv(key, value, updated_at) VALUES(?, ?, strftime('%s','now')) "
            "ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=strftime('%s','now')",
            (key, value),
        )
        await db.commit()


async def get_json(key: str) -> Optional[Dict[str, Any]]:
    raw = await get_value(key)
    if raw is None:
        return None
    try:
        return json.loads(raw)
    except Exception:
        return None


async def set_json(key: str, value: Dict[str, Any]) -> None:
    await set_value(key, json.dumps(value, ensure_ascii=False))


async def get_updated_at(key: str) -> Optional[int]:
    await init_db()
    async with aiosqlite.connect(DB_FILE) as db:
        async with db.execute("SELECT updated_at FROM kv WHERE key = ?", (key,)) as cur:
            row = await cur.fetchone()
            return int(row[0]) if row and row[0] is not None else None

