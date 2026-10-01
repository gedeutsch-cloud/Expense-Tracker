# PM Job Finder

A personal job-search assistant for landing a **remote Product Manager** role in ed tech, mental health tech, and applied AI, positioned as an *engineer who ships product*.

## What it does

- **Finds jobs** from ~25 target companies' public job boards (Greenhouse, Lever, Ashby) plus remote boards (RemoteOK, Himalayas, Remotive). Only PM / Product Owner / Technical Program Manager titles are kept.
- **Ranks them** 0-100 for fit: PM title, remote, US-eligible, target tier (1 ed tech, 2 mental health, 3 applied AI), domain keywords, pay vs. your minimum, and whether you know someone there. Hover a score to see why.
- **Uses your LinkedIn network**: import LinkedIn's `Connections.csv` export to see who you know at each company and get a ready-to-send referral or informational-call message.
- **Helps you apply**: per-job 2-line note, links to the posting, the same role on LinkedIn, and 1st/2nd-degree product people at the company.
- **Tracks everything**: applications pipeline, outreach log, and the weekly rhythm (5-8 applications, 3 warm outreaches, 1 informational call), plus the 30-day "close the AI gap" checklist.

LinkedIn has no public jobs API and prohibits automated scraping/applying, so the app never logs into LinkedIn. It deep-links to LinkedIn searches and profiles and uses the official data export for your connections; you click Apply / Easy Apply yourself.

## Run it

Requires Python 3.10+.

```bash
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --port 8000
```

Open http://localhost:8000, click **Refresh jobs**, fill in **Profile**, and import connections on **Network**.

Data is stored in `data/jobfinder.db` (SQLite). Set `JOBFINDER_DB` to change the path. If you host it somewhere, set `APP_PASSWORD` to require a password (HTTP basic auth, any username).

## Customize

- Target companies and their job-board slugs: `app/companies.py`
- Scoring rules: `app/scoring.py`
- Message templates: `app/drafts.py`

## Develop

```bash
pip install -r requirements-dev.txt
ruff check . && ruff format --check . && pytest
```
