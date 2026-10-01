import hashlib
import html
import re
import threading
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone

import requests

from app.companies import COMPANIES, Company
from app.db import connect
from app.network import matches_company, normalize_company
from app.profile import load_profile
from app.scoring import extract_salary_max, score_job, title_lane

HEADERS = {"User-Agent": "Mozilla/5.0 (pm-job-finder; personal job search)"}
TIMEOUT = 30

refresh_state: dict = {"running": False, "last_run": None, "errors": [], "counts": {}}
_lock = threading.Lock()


def _id(source: str, external_id: str) -> str:
    return hashlib.sha1(f"{source}:{external_id}".encode()).hexdigest()[:16]


def html_to_text(value: str | None) -> str:
    if not value:
        return ""
    text = html.unescape(value)
    text = re.sub(r"<(br|/p|/li|/h\d)[^>]*>", "\n", text, flags=re.I)
    text = re.sub(r"<[^>]+>", " ", text)
    text = html.unescape(text)
    text = re.sub(r"[ \t\r\f\v\xa0]+", " ", text)
    text = re.sub(r" *\n *", "\n", text)
    return re.sub(r"\n{3,}", "\n\n", text).strip()


def _get(url: str, params: dict | None = None):
    response = requests.get(url, params=params, headers=HEADERS, timeout=TIMEOUT)
    response.raise_for_status()
    return response.json()


def _job(
    source, external_id, company, title, location, remote, url, description, posted_at, tier=None, salary_text=None
):
    salary_label, salary_max = extract_salary_max(f"{salary_text or ''} {description or ''}")
    return {
        "id": _id(source, str(external_id)),
        "company": company.strip(),
        "title": title.strip(),
        "location": (location or "").strip(),
        "remote": 1 if remote else 0,
        "url": url,
        "source": source,
        "tier": tier,
        "description": description or "",
        "salary_text": salary_text or salary_label,
        "salary_max": salary_max,
        "posted_at": posted_at,
    }


def fetch_greenhouse(company: Company) -> list[dict]:
    data = _get(f"https://boards-api.greenhouse.io/v1/boards/{company.slug}/jobs", {"content": "true"})
    jobs = []
    for item in data.get("jobs", []):
        if not title_lane(item.get("title", "")):
            continue
        location = (item.get("location") or {}).get("name", "")
        jobs.append(
            _job(
                "greenhouse",
                item["id"],
                company.name,
                item["title"],
                location,
                "remote" in location.lower(),
                item.get("absolute_url"),
                html_to_text(item.get("content")),
                item.get("first_published") or item.get("updated_at"),
                company.tier,
            )
        )
    return jobs


def fetch_lever(company: Company) -> list[dict]:
    data = _get(f"https://api.lever.co/v0/postings/{company.slug}", {"mode": "json"})
    jobs = []
    for item in data:
        if not title_lane(item.get("text", "")):
            continue
        categories = item.get("categories") or {}
        location = categories.get("location") or ", ".join(categories.get("allLocations") or [])
        remote = item.get("workplaceType") == "remote" or "remote" in location.lower()
        created = item.get("createdAt")
        posted = datetime.fromtimestamp(created / 1000, timezone.utc).isoformat() if created else None
        salary = item.get("salaryRange") or {}
        salary_text = (
            f"${salary['min'] // 1000}K-${salary['max'] // 1000}K" if salary.get("min") and salary.get("max") else None
        )
        jobs.append(
            _job(
                "lever",
                item["id"],
                company.name,
                item["text"],
                location,
                remote,
                item.get("hostedUrl"),
                item.get("descriptionPlain") or html_to_text(item.get("description")),
                posted,
                company.tier,
                salary_text,
            )
        )
    return jobs


def fetch_ashby(company: Company) -> list[dict]:
    data = _get(f"https://api.ashbyhq.com/posting-api/job-board/{company.slug}", {"includeCompensation": "true"})
    jobs = []
    for item in data.get("jobs", []):
        if not item.get("isListed", True) or not title_lane(item.get("title", "")):
            continue
        location = item.get("location") or ""
        secondary = [loc.get("location", "") for loc in item.get("secondaryLocations") or []]
        if secondary:
            location = f"{location}; {'; '.join(secondary)}"
        workplace = item.get("workplaceType")
        remote = workplace == "Remote" or (item.get("isRemote") and workplace not in ("Hybrid", "OnSite"))
        compensation = (item.get("compensation") or {}).get("compensationTierSummary")
        jobs.append(
            _job(
                "ashby",
                item["id"],
                company.name,
                item["title"],
                location,
                remote,
                item.get("jobUrl"),
                item.get("descriptionPlain") or html_to_text(item.get("descriptionHtml")),
                item.get("publishedAt"),
                company.tier,
                compensation,
            )
        )
    return jobs


def fetch_remotive() -> list[dict]:
    data = _get("https://remotive.com/api/remote-jobs", {"category": "product"})
    return [
        _job(
            "remotive",
            item["id"],
            item.get("company_name", ""),
            item["title"],
            item.get("candidate_required_location"),
            True,
            item.get("url"),
            html_to_text(item.get("description")),
            item.get("publication_date"),
            salary_text=item.get("salary") or None,
        )
        for item in data.get("jobs", [])
        if title_lane(item.get("title", ""))
    ]


def fetch_remoteok() -> list[dict]:
    data = _get("https://remoteok.com/api")
    jobs = []
    for item in data[1:]:
        if not isinstance(item, dict) or not title_lane(item.get("position", "")):
            continue
        low, high = int(item.get("salary_min") or 0), int(item.get("salary_max") or 0)
        salary_text = f"${low // 1000}K-${high // 1000}K" if low and high else None
        jobs.append(
            _job(
                "remoteok",
                item["id"],
                item.get("company", ""),
                item["position"],
                item.get("location") or "Remote",
                True,
                item.get("url"),
                html_to_text(item.get("description")),
                item.get("date"),
                salary_text=salary_text,
            )
        )
    return jobs


def fetch_himalayas() -> list[dict]:
    jobs = []
    for query in ("product manager", "product owner"):
        data = _get("https://himalayas.app/jobs/api/search", {"q": query, "limit": 100})
        for item in data.get("jobs", []):
            if not title_lane(item.get("title", "")):
                continue
            pub = item.get("pubDate")
            posted = datetime.fromtimestamp(int(pub), timezone.utc).isoformat() if pub else None
            low, high = item.get("minSalary"), item.get("maxSalary")
            salary_text = f"${int(low) // 1000}K-${int(high) // 1000}K" if low and high else None
            location = ", ".join(item.get("locationRestrictions") or []) or "Anywhere"
            jobs.append(
                _job(
                    "himalayas",
                    item.get("guid") or item.get("applicationLink"),
                    item.get("companyName", ""),
                    item["title"],
                    location,
                    True,
                    item.get("applicationLink"),
                    html_to_text(item.get("description")),
                    posted,
                    salary_text=salary_text,
                )
            )
    return jobs


ATS_FETCHERS = {"greenhouse": fetch_greenhouse, "lever": fetch_lever, "ashby": fetch_ashby}
BOARD_FETCHERS = {"remotive": fetch_remotive, "remoteok": fetch_remoteok, "himalayas": fetch_himalayas}


def _tasks():
    for company in COMPANIES:
        if company.ats in ATS_FETCHERS:
            yield f"{company.name} ({company.ats})", company.ats, lambda c=company: ATS_FETCHERS[c.ats](c)
    for name, fetcher in BOARD_FETCHERS.items():
        yield name, name, fetcher


def _tier_for(company_name: str) -> int | None:
    norm = normalize_company(company_name)
    for company in COMPANIES:
        if matches_company(norm, company.name):
            return company.tier
    return None


def save_jobs(jobs: list[dict], succeeded: set[str], run_ts: str) -> None:
    with connect() as conn:
        for job in jobs:
            if job["tier"] is None:
                job["tier"] = _tier_for(job["company"])
            conn.execute(
                """INSERT INTO jobs (id, company, title, location, remote, url, source, tier, description, salary_text,
                                     salary_max, posted_at, fetched_at)
                   VALUES (:id, :company, :title, :location, :remote, :url, :source, :tier, :description, :salary_text,
                           :salary_max, :posted_at, :fetched_at)
                   ON CONFLICT(id) DO UPDATE SET company=excluded.company, title=excluded.title,
                     location=excluded.location, remote=excluded.remote, url=excluded.url, tier=excluded.tier,
                     description=excluded.description, salary_text=excluded.salary_text,
                     salary_max=excluded.salary_max, posted_at=excluded.posted_at, fetched_at=excluded.fetched_at""",
                {**job, "fetched_at": run_ts},
            )
        for key in succeeded:
            source, _, company = key.partition("|")
            if company:
                conn.execute(
                    "DELETE FROM jobs WHERE source = ? AND company = ? AND fetched_at != ? AND saved = 0",
                    (source, company, run_ts),
                )
            else:
                conn.execute("DELETE FROM jobs WHERE source = ? AND fetched_at != ? AND saved = 0", (source, run_ts))


def connection_counts(conn, companies: set[str]) -> dict[str, int]:
    norms = [
        row["company_norm"] for row in conn.execute("SELECT company_norm FROM connections WHERE company_norm != ''")
    ]
    return {company: sum(1 for n in norms if matches_company(n, company)) for company in companies}


def rescore_all() -> None:
    profile = load_profile()
    with connect() as conn:
        rows = [dict(r) for r in conn.execute("SELECT * FROM jobs")]
        counts = connection_counts(conn, {r["company"] for r in rows})
        for row in rows:
            score, reasons = score_job(row, profile, counts.get(row["company"], 0))
            conn.execute("UPDATE jobs SET score = ?, reasons = ? WHERE id = ?", (score, "\n".join(reasons), row["id"]))


def run_refresh() -> None:
    with _lock:
        if refresh_state["running"]:
            return
        refresh_state.update(running=True, errors=[], counts={})
    try:
        run_ts = datetime.now(timezone.utc).isoformat()
        tasks = list(_tasks())
        all_jobs: list[dict] = []
        succeeded: set[str] = set()
        with ThreadPoolExecutor(max_workers=12) as pool:
            futures = {pool.submit(fn): (label, source) for label, source, fn in tasks}
            for future, (label, source) in futures.items():
                try:
                    jobs = future.result()
                except Exception as exc:  # noqa: BLE001 - one bad source must not stop the refresh
                    refresh_state["errors"].append(f"{label}: {exc}")
                    continue
                refresh_state["counts"][label] = len(jobs)
                all_jobs.extend(jobs)
                company = label.rsplit(" (", 1)[0] if source in ATS_FETCHERS else ""
                succeeded.add(f"{source}|{company}")
        save_jobs(all_jobs, succeeded, run_ts)
        rescore_all()
        refresh_state["last_run"] = run_ts
    finally:
        refresh_state["running"] = False


def start_refresh() -> bool:
    if refresh_state["running"]:
        return False
    threading.Thread(target=run_refresh, daemon=True).start()
    return True
