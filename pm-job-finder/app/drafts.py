from urllib.parse import urlencode

from app.companies import COMPANIES


def company_info(name: str):
    return next((c for c in COMPANIES if c.name.lower() == name.lower()), None)


def first_name(profile: dict) -> str:
    return (profile.get("name") or "").split(" ")[0] or "[Your name]"


def application_note(job: dict, profile: dict) -> str:
    info = company_info(job["company"])
    hook = info.what[0].lower() + info.what[1:] if info else "what you're building"
    lines = [
        f"I'm a {profile.get('headline', 'former software engineer who ships product').lower()} "
        f"and I'd love to bring that to the {job['title']} role at {job['company']}.",
        f"{profile.get('product_wins', '').rstrip('.')}. {job['company']}'s work on {hook} resonates with me. "
        f"{profile.get('personal_stake', '').rstrip('.')}.",
    ]
    if profile.get("ai_project"):
        lines[1] += f" {profile['ai_project'].rstrip('.')}."
    return "\n".join(lines)


def referral_message(person_first: str, company: str, job: dict | None, profile: dict) -> str:
    role = f"the {job['title']} opening ({job['url']})" if job else "remote product roles there"
    return (
        f"Hi {person_first or 'there'}, hope you're doing well! I'm exploring remote product manager roles and "
        f"{company} is near the top of my list, specifically {role}.\n\n"
        f"Quick background: {profile.get('headline', '').rstrip('.')}. {profile.get('product_wins', '').rstrip('.')}.\n\n"
        f"Would you be open to a quick 15-minute chat about the team, or to referring me if you think it's a fit? "
        f"I'm happy to send a short blurb and resume to make it easy.\n\nThanks so much,\n{first_name(profile)}"
    )


def info_call_message(person_first: str, company: str, profile: dict) -> str:
    return (
        f"Hi {person_first or 'there'}, I'm a {profile.get('headline', '').lower().rstrip('.')} moving deeper into product "
        f"management, and I really admire what {company} is doing. Would you have 20 minutes in the next couple of weeks "
        f"to share how the product team works and what you look for in PMs? Happy to work around your schedule.\n\n"
        f"Thank you!\n{first_name(profile)}"
    )


def linkedin_jobs_url(keywords: str, past_week: bool = True) -> str:
    params = {"keywords": keywords, "f_WT": "2"}
    if past_week:
        params["f_TPR"] = "r604800"
    return "https://www.linkedin.com/jobs/search/?" + urlencode(params)


def linkedin_people_url(company: str, keywords: str = "") -> str:
    params = {"keywords": f"{company} {keywords}".strip(), "network": '["F","S"]', "origin": "FACETED_SEARCH"}
    return "https://www.linkedin.com/search/results/people/?" + urlencode(params)


LINKEDIN_SAVED_SEARCHES = [
    ("Remote PM - ed tech", "product manager edtech"),
    ("Remote Technical PM - education", "technical product manager education"),
    ("Remote PM - mental health", "product manager mental health"),
    ("Remote PM - AI", "product manager AI"),
    ("Remote Product Owner", "product owner"),
]
