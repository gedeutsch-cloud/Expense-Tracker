import json
import os
import sqlite3
from contextlib import contextmanager
from pathlib import Path

DB_PATH = Path(os.environ.get("JOBFINDER_DB", Path(__file__).resolve().parent.parent / "data" / "jobfinder.db"))

SCHEMA = """
CREATE TABLE IF NOT EXISTS jobs (
    id TEXT PRIMARY KEY,
    company TEXT NOT NULL,
    title TEXT NOT NULL,
    location TEXT,
    remote INTEGER DEFAULT 0,
    url TEXT,
    source TEXT,
    tier INTEGER,
    description TEXT,
    salary_text TEXT,
    salary_max INTEGER,
    posted_at TEXT,
    fetched_at TEXT,
    score INTEGER DEFAULT 0,
    reasons TEXT DEFAULT '[]',
    dismissed INTEGER DEFAULT 0,
    saved INTEGER DEFAULT 0
);
CREATE TABLE IF NOT EXISTS applications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    job_id TEXT,
    company TEXT NOT NULL,
    role TEXT NOT NULL,
    url TEXT,
    status TEXT DEFAULT 'applied',
    date_applied TEXT,
    contact TEXT,
    notes TEXT,
    updated_at TEXT
);
CREATE TABLE IF NOT EXISTS connections (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    first_name TEXT,
    last_name TEXT,
    url TEXT,
    email TEXT,
    company TEXT,
    position TEXT,
    connected_on TEXT,
    company_norm TEXT
);
CREATE TABLE IF NOT EXISTS activities (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    kind TEXT NOT NULL,
    date TEXT NOT NULL,
    company TEXT,
    person TEXT,
    notes TEXT
);
CREATE TABLE IF NOT EXISTS kv (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
);
"""


def init_db() -> None:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    with connect() as conn:
        conn.executescript(SCHEMA)


@contextmanager
def connect():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()


def get_kv(key: str, default):
    with connect() as conn:
        row = conn.execute("SELECT value FROM kv WHERE key = ?", (key,)).fetchone()
    return json.loads(row["value"]) if row else default


def set_kv(key: str, value) -> None:
    with connect() as conn:
        conn.execute(
            "INSERT INTO kv (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
            (key, json.dumps(value)),
        )
