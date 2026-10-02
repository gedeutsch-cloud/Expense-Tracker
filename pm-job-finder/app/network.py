import csv
import io
import re

from app.companies import COMPANIES

_SUFFIXES = re.compile(r"\b(inc|llc|ltd|corp|corporation|co|company|pbc|the)\b\.?")


def normalize_company(name: str | None) -> str:
    if not name:
        return ""
    value = name.lower().replace("&", " and ")
    value = re.sub(r"[^a-z0-9 ]+", " ", value)
    value = _SUFFIXES.sub(" ", value)
    return re.sub(r"\s+", " ", value).strip()


def company_keys(name: str) -> set[str]:
    keys = {normalize_company(name)}
    for company in COMPANIES:
        if normalize_company(company.name) == normalize_company(name):
            keys |= {normalize_company(alias) for alias in company.aliases}
    return {key for key in keys if key}


def matches_company(connection_company_norm: str, name: str) -> bool:
    if not connection_company_norm:
        return False
    for key in company_keys(name):
        if connection_company_norm == key:
            return True
        if len(key) >= 4 and re.search(rf"\b{re.escape(key)}\b", connection_company_norm):
            return True
    return False


def parse_linkedin_connections(raw: bytes) -> list[dict]:
    text = raw.decode("utf-8-sig", errors="replace")
    lines = text.splitlines()
    start = next((i for i, line in enumerate(lines) if line.startswith("First Name")), None)
    if start is None:
        raise ValueError("Could not find the 'First Name,Last Name,...' header. Is this LinkedIn's Connections.csv?")
    reader = csv.DictReader(io.StringIO("\n".join(lines[start:])))
    rows = []
    for row in reader:
        first = (row.get("First Name") or "").strip()
        last = (row.get("Last Name") or "").strip()
        if not first and not last:
            continue
        company = (row.get("Company") or "").strip()
        rows.append(
            {
                "first_name": first,
                "last_name": last,
                "url": (row.get("URL") or "").strip(),
                "email": (row.get("Email Address") or "").strip(),
                "company": company,
                "position": (row.get("Position") or "").strip(),
                "connected_on": (row.get("Connected On") or "").strip(),
                "company_norm": normalize_company(company),
            }
        )
    return rows
