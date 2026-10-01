import re

from app.profile import split_csv

PM_TITLE = re.compile(
    r"\b(product manager|product owner|product lead|group product manager|head of product|director of product|"
    r"director,? product management|product management|technical pm|\bpm\b)",
    re.I,
)
SECOND_LANE = re.compile(r"\b(technical program manager|technical project manager|program manager)\b", re.I)
EXCLUDE = re.compile(
    r"\b(marketing|designer|design|engineer|engineering manager|analyst|scientist|counsel|sales|recruit|intern|"
    r"operations manager|support)\b",
    re.I,
)
REMOTE = re.compile(r"\b(remote|anywhere|distributed|work from home|wfh)\b", re.I)
NON_US = re.compile(
    r"\b(emea|europe|uk|united kingdom|london|germany|berlin|india|bangalore|bengaluru|apac|singapore|australia|"
    r"brazil|mexico|philippines|poland|spain|portugal|netherlands|ireland|france|japan|latam|israel)\b",
    re.I,
)
US_HINT = re.compile(r"\b(us|usa|u\.s\.|united states|north america|americas|canada|anywhere)\b", re.I)
SALARY = re.compile(r"\$\s?(\d{2,3})(?:,(\d{3})|(?:\.\d+)?\s?[kK])")


def title_lane(title: str) -> int:
    """0 = not relevant, 1 = primary PM lane, 2 = second lane (program/project)."""
    if PM_TITLE.search(title) and not re.search(r"product marketing|product design", title, re.I):
        return 1
    if SECOND_LANE.search(title) and not EXCLUDE.search(title):
        return 2
    return 0


def extract_salary_max(text: str) -> tuple[str | None, int | None]:
    values = []
    for match in SALARY.finditer(text or ""):
        thousands = int(match.group(1))
        values.append(thousands * 1000)
    values = [v for v in values if 40_000 <= v <= 600_000]
    if not values:
        return None, None
    low, high = min(values), max(values)
    label = f"${low // 1000}K" if low == high else f"${low // 1000}K-${high // 1000}K"
    return label, high


def score_job(job: dict, profile: dict, connection_count: int = 0) -> tuple[int, list[str]]:
    title = job.get("title") or ""
    location = job.get("location") or ""
    description = job.get("description") or ""
    reasons: list[str] = []
    score = 0

    lane = title_lane(title)
    target_titles = [t.lower() for t in split_csv(profile.get("target_titles", ""))]
    if lane == 1:
        score += 40
        reasons.append("+40 PM title")
        if any(t and t in title.lower() for t in target_titles):
            score += 5
            reasons.append("+5 exact target title")
        if re.search(r"technical", title, re.I):
            score += 5
            reasons.append("+5 technical PM (plays to engineering background)")
    elif lane == 2:
        score += 20
        reasons.append("+20 second-lane title (program/project)")

    if re.search(r"\b(vp|vice president|chief)\b", title, re.I):
        score -= 15
        reasons.append("-15 executive level")
    elif re.search(r"\b(principal|director|head of)\b", title, re.I):
        score -= 5
        reasons.append("-5 likely above target level")

    if job.get("remote") or REMOTE.search(location):
        score += 20
        reasons.append("+20 remote")
    if profile.get("us_only", True) and NON_US.search(location) and not US_HINT.search(location):
        score -= 25
        reasons.append("-25 location looks outside the US")

    tier = job.get("tier")
    if tier == 1:
        score += 20
        reasons.append("+20 Tier 1 ed tech target")
    elif tier == 2:
        score += 15
        reasons.append("+15 Tier 2 mental health target")
    elif tier == 3:
        score += 10
        reasons.append("+10 Tier 3 applied AI target")

    haystack = f"{title} {description}".lower()
    hits = [
        kw
        for kw in split_csv(profile.get("domain_keywords", ""))
        if re.search(rf"\b{re.escape(kw.lower())}\b", haystack)
    ]
    if hits:
        bonus = min(10, 3 * len(hits))
        score += bonus
        reasons.append(f"+{bonus} domain match: {', '.join(hits[:4])}")

    if connection_count:
        score += 10
        reasons.append(f"+10 you know {connection_count} person(s) there")

    salary_max = job.get("salary_max")
    min_salary = int(profile.get("min_salary") or 0)
    if salary_max and min_salary and salary_max < min_salary:
        score -= 10
        reasons.append("-10 pay range below your minimum")

    return max(0, min(100, score)), reasons
