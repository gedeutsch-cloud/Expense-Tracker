from app.network import matches_company, normalize_company, parse_linkedin_connections
from app.profile import DEFAULT_PROFILE
from app.scoring import extract_salary_max, score_job, title_lane

CSV = b"""Notes:
"When exporting your connection data, you may notice that some of the email addresses are missing."

First Name,Last Name,URL,Email Address,Company,Position,Connected On
Ada,Lovelace,https://www.linkedin.com/in/ada,,Khan Academy,Senior Product Manager,01 Jan 2024
Grace,Hopper,https://www.linkedin.com/in/grace,,"Lyra Health, Inc.",Engineering Manager,02 Feb 2023
Alan,Turing,https://www.linkedin.com/in/alan,,Calmware,Engineer,03 Mar 2022
"""


def test_parse_linkedin_connections_skips_preamble():
    rows = parse_linkedin_connections(CSV)
    assert [r["first_name"] for r in rows] == ["Ada", "Grace", "Alan"]
    assert rows[1]["company_norm"] == "lyra health"


def test_company_matching_uses_aliases_and_word_boundaries():
    assert matches_company(normalize_company("Lyra"), "Lyra Health")
    assert matches_company(normalize_company("Khan Academy, Inc."), "Khan Academy")
    assert not matches_company(normalize_company("Calmware"), "Calm")


def test_title_lane():
    assert title_lane("Senior Product Manager, Learning") == 1
    assert title_lane("Technical Program Manager") == 2
    assert title_lane("Product Marketing Manager") == 0
    assert title_lane("Product Designer") == 0
    assert title_lane("Software Engineer") == 0


def test_salary_extraction():
    assert extract_salary_max("Pay range $120,000 - $155,000 per year") == ("$120K-$155K", 155000)
    assert extract_salary_max("$140K") == ("$140K", 140000)
    assert extract_salary_max("no pay listed") == (None, None)


def test_score_prefers_remote_tier1_pm_with_connections():
    job = {
        "title": "Senior Product Manager",
        "location": "Remote - US",
        "remote": 1,
        "tier": 1,
        "description": "Help teachers and students learn with AI.",
        "salary_max": 160000,
    }
    strong, reasons = score_job(job, DEFAULT_PROFILE, connection_count=2)
    weak, _ = score_job({**job, "remote": 0, "location": "London, UK", "tier": None}, DEFAULT_PROFILE)
    assert strong > 90 and weak < 40
    assert any("remote" in r for r in reasons)


def test_salary_extraction_handles_decimal_k():
    assert extract_salary_max("$262.2K – $331.5K • Offers Equity") == ("$262K-$331K", 331000)


def test_html_to_text_collapses_blank_lines():
    from app.sources import html_to_text

    assert html_to_text("<p>One</p><p>&nbsp;</p><p>&nbsp;</p><p>Two &amp; three</p>") == "One\n\nTwo & three"


def test_application_note_is_two_lines():
    from app.drafts import application_note
    from app.profile import DEFAULT_PROFILE

    profile = {**DEFAULT_PROFILE, "ai_project": "I built an AI study-buddy prototype"}
    note = application_note({"title": "Product Manager", "company": "Khan Academy"}, profile)
    assert len(note.splitlines()) == 2
    assert "study-buddy" in note


def test_jobs_remote_filter_can_be_unchecked(tmp_path, monkeypatch):
    from fastapi.testclient import TestClient

    from app import db

    monkeypatch.setattr(db, "DB_PATH", tmp_path / "t.db")
    from app.main import app

    with TestClient(app) as client:
        assert 'value="1" checked' in client.get("/jobs").text
        assert 'value="1" checked' in client.get("/jobs?remote=0&remote=1").text
        assert 'value="1" checked' not in client.get("/jobs?remote=0").text
