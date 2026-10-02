from app.db import get_kv, set_kv

DEFAULT_PROFILE = {
    "name": "",
    "headline": "Former software engineer who ships product",
    "target_titles": "Product Manager, Senior Product Manager, Technical Product Manager, Product Owner",
    "second_lane_titles": "Technical Program Manager, Technical Project Manager",
    "domain_keywords": "education, edtech, learning, k-12, students, teachers, mental health, therapy, wellbeing, behavioral health, AI, LLM, machine learning",
    "min_salary": 100000,
    "us_only": True,
    "years_engineering": "",
    "product_wins": "Shaped features with users, made roadmap tradeoffs, moved a key metric",
    "personal_stake": "As a parent of two young kids, I care a lot about how kids learn",
    "ai_project": "I've been building with LLM tools and shipped a small AI prototype",
}

AI_PLAN = [
    ("w1", "Week 1 - Use Claude or ChatGPT daily for real work (PRDs, research summaries); note where it fails"),
    ("w2", "Week 2 - Learn PM vocabulary: prompting, RAG, evals, hallucinations, latency/cost, human-in-the-loop"),
    ("w3", "Week 3 - Build one thing: e.g. a reading-level rewriter or quiz generator, on a simple web page"),
    ("w4", "Week 4 - Write a one-page PRD for it: user, problem, metric, eval plan, kids' safety and privacy risks"),
]


def load_profile() -> dict:
    return {**DEFAULT_PROFILE, **get_kv("profile", {})}


def save_profile(profile: dict) -> None:
    set_kv("profile", profile)


def split_csv(value: str) -> list[str]:
    return [part.strip() for part in value.split(",") if part.strip()]
